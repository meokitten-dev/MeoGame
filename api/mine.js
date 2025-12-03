// api/mine.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// 🔥 Khởi tạo Firebase Admin (dùng service account)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = getFirestore(app);
const auth = getAuth(app);

// 🪙 Bảng loot (30 loại — đã thiết kế trước đó)
const LOOT_TABLE = [
  { name: "Rác Nhà Bếp", value: 1, rarity: "common", emoji: "🗑️", chance: 50 },
  { name: "Quả Cầu Lông", value: 3, rarity: "common", emoji: "🧶", chance: 20 },
  { name: "Hộp Sữa Rỗng", value: 5, rarity: "common", emoji: "🥛", chance: 15 },
  { name: "Cái Móng Giả", value: 8, rarity: "common", emoji: "🐾", chance: 8 },
  { name: "Đá Suối", value: 20, rarity: "uncommon", emoji: "🪨", chance: 3 },
  { name: "Vỏ Ốc Biển", value: 30, rarity: "uncommon", emoji: "🐚", chance: 1.5 },
  { name: "Kẹo Dẻo", value: 25, rarity: "uncommon", emoji: "🍬", chance: 1 },
  { name: "Đồng Xu May Mắn", value: 50, rarity: "rare", emoji: "🪙", chance: 0.8 },
  { name: "Vàng Miếng", value: 100, rarity: "rare", emoji: "🥇", chance: 0.5 },
  { name: "Ngọc Trai Hồng", value: 120, rarity: "rare", emoji: "🦪", chance: 0.4 },
  { name: "Kim Cương Tím", value: 300, rarity: "epic", emoji: "💎", chance: 0.2 },
  { name: "Mặt Trăng Bé", value: 800, rarity: "epic", emoji: "🌙", chance: 0.1 },
  { name: "Ngôi Sao Rơi", value: 2000, rarity: "legendary", emoji: "⭐", chance: 0.05 },
  // Thêm các loot khác nếu cần
];

// Tính tổng chance
const TOTAL_CHANCE = LOOT_TABLE.reduce((sum, item) => sum + item.chance, 0);

function getRandomLoot() {
  let rand = Math.random() * TOTAL_CHANCE;
  for (const item of LOOT_TABLE) {
    if (rand < item.chance) {
      return item;
    }
    rand -= item.chance;
  }
  return LOOT_TABLE[0]; // fallback
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const token = authorization.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  try {
    // Xác minh user
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Dùng transaction để đảm bảo an toàn
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const now = Date.now();
      const lastMineAt = userData.lastMineAt?.toDate?.()?.getTime() || 0;
      const baseCooldown = 10000; // 10 giây

      // Kiểm tra cooldown
      if (now - lastMineAt < baseCooldown) {
        const remaining = Math.ceil((baseCooldown - (now - lastMineAt)) / 1000);
        throw new Error(`Cooldown: ${remaining}s`);
      }

      // Sinh loot ngẫu nhiên
      const loot = getRandomLoot();

      // Cập nhật user
      transaction.update(userRef, {
        balance: (userData.balance || 0) + loot.value,
        lastMineAt: new Date(now),
        'stats.totalMined': (userData.stats?.totalMined || 0) + 1,
        updatedAt: new Date(now),
      });

      // Trả kết quả
      return {
        success: true,
        loot: {
          name: loot.name,
          value: loot.value,
          emoji: loot.emoji,
          rarity: loot.rarity
        },
        newBalance: (userData.balance || 0) + loot.value
      };
    }).then((result) => {
      res.status(200).json(result);
    }).catch((error) => {
      res.status(400).json({ error: error.message });
    });

  } catch (error) {
    console.error('Mine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}