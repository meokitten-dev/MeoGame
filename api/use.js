// api/use.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { ITEMS } from '../src/data/items.js';

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

  const { itemId, targetUid = null } = req.body; // targetUid cho PvP
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
    const item = ITEMS[itemId];

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('User not found');
      
      const userData = userDoc.data();
      const currentInventory = userData.inventory || {};
      const currentQty = currentInventory[itemId] || 0;

      if (currentQty <= 0) {
        throw new Error(`Bạn không có ${item.name}`);
      }

      // Cập nhật inventory
      const newInventory = { ...currentInventory, [itemId]: currentQty - 1 };

      // Xử lý theo loại
      if (item.type === 'buff') {
        // Kích hoạt buff
        const now = Date.now();
        const expiresAt = now + (item.duration || 0);
        const newBuffs = { ...userData.buffs, [itemId]: { active: true, expiresAt } };
        transaction.update(userRef, {
          inventory: newInventory,
          buffs: newBuffs,
          updatedAt: new Date(now),
        });
      } 
      else if (item.type === 'skin') {
        // Áp skin
        transaction.update(userRef, {
          inventory: newInventory,
          displaySkin: itemId,
          updatedAt: new Date(),
        });
      }
      else if (item.type === 'pvp') {
        // Gửi cho bạn (sẽ code logic PvP sau)
        if (!targetUid) throw new Error('Thiếu người nhận');
        // 🚧 Tạm thời chỉ trừ đồ, logic PvP sẽ xử ở client trước
        transaction.update(userRef, {
          inventory: newInventory,
          updatedAt: new Date(),
        });
      }
      else {
        throw new Error('Loại vật phẩm không hỗ trợ');
      }

      return { success: true, message: `Đã sử dụng ${item.name}!` };
    }).then((result) => {
      res.status(200).json(result);
    }).catch((error) => {
      res.status(400).json({ error: error.message });
    });

  } catch (error) {
    console.error('Use item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}