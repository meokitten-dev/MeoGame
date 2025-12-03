// api/shop.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getItemById } from '../src/data/items.js';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = getFirestore(app);
const auth = getAuth(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { itemId, quantity = 1 } = req.body;
  const { authorization } = req.headers;

  if (!authorization || !itemId) {
    return res.status(400).json({ error: 'Missing itemId or auth token' });
  }

  const token = authorization.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const item = getItemById(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (quantity <= 0 || quantity > item.maxPerUser) {
      return res.status(400).json({ error: `Số lượng phải từ 1–${item.maxPerUser}` });
    }

    const totalCost = item.price * quantity;

    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentBalance = userData.balance || 0;

      if (currentBalance < totalCost) {
        throw new Error('Không đủ MCN');
      }

      // Cập nhật inventory
      const currentInventory = userData.inventory || {};
      const currentQty = currentInventory[itemId] || 0;
      if (currentQty + quantity > item.maxPerUser) {
        throw new Error(`Chỉ mua được tối đa ${item.maxPerUser} ${item.name}`);
      }

      const newInventory = {
        ...currentInventory,
        [itemId]: currentQty + quantity
      };

      transaction.update(userRef, {
        balance: currentBalance - totalCost,
        inventory: newInventory,
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: `Mua thành công ${quantity}x ${item.name}!`,
        newBalance: currentBalance - totalCost,
        inventory: newInventory
      };
    }).then((result) => {
      res.status(200).json(result);
    }).catch((error) => {
      res.status(400).json({ error: error.message });
    });

  } catch (error) {
    console.error('Shop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}