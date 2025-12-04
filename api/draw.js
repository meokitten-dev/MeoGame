// api/draw.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = getFirestore(app);
const auth = getAuth(app);

// 🔑 Danh sách UID admin (THAY BẰNG UID CỦA BẠN)
const ADMINS = ['YOUR_ACTUAL_ADMIN_UID_HERE']; // ←←← SỬA DÒNG NÀY!

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ error: 'Thiếu token xác thực' });
  }

  const token = authorization.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 🔒 Chỉ admin mới được quay số
    if (!ADMINS.includes(uid)) {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền quay số' });
    }

    const lotteryRef = db.collection('lottery').doc('current');
    const historyRef = db.collection('lottery').doc('history-' + Date.now());

    await db.runTransaction(async (transaction) => {
      const lotteryDoc = await transaction.get(lotteryRef);
      if (!lotteryDoc.exists || !(lotteryDoc.data().tickets?.length > 0)) {
        throw new Error('Không có vé nào để quay');
      }

      const lotteryData = lotteryDoc.data();
      const winningNumber = Math.floor(Math.random() * 100) + 1;
      const tickets = lotteryData.tickets || [];
      const winners = tickets.filter(t => t.number === winningNumber);

      if (winners.length > 0) {
        // 💰 Chia jackpot cho người thắng
        const totalPrize = lotteryData.jackpot || 10000;
        const prizePerWinner = Math.floor(totalPrize / winners.length);

        // Cập nhật số dư cho từng người thắng
        for (const winner of winners) {
          const userRef = db.collection('users').doc(winner.uid);
          const userDoc = await transaction.get(userRef);
          if (userDoc.exists) {
            const userData = userDoc.data();
            transaction.update(userRef, {
              balance: (userData.balance || 0) + prizePerWinner,
              updatedAt: new Date(),
            });
          }
        }

        // Lưu lịch sử
        transaction.set(historyRef, {
          date: new Date(),
          winningNumber,
          totalJackpot: totalPrize,
          winners: winners.map(w => ({ uid: w.uid, prize: prizePerWinner })),
          isWon: true
        });

        // Reset jackpot về 10,000 MCN
        transaction.set(lotteryRef, { jackpot: 10000, tickets: [] });

        return {
          success: true,
          winningNumber,
          winners: winners.length,
          jackpot: totalPrize,
          message: `Quay số thành công! Số trúng: ${winningNumber}. Jackpot ${totalPrize} MCN được chia cho ${winners.length} người.`
        };
      } else {
        // ❌ Không ai trúng → jackpot dồn tiếp
        transaction.set(historyRef, {
          date: new Date(),
          winningNumber,
          totalJackpot: lotteryData.jackpot,
          winners: [],
          isWon: false
        });

        // Giữ nguyên jackpot, chỉ xóa vé
        transaction.update(lotteryRef, { tickets: [] });

        return {
          success: true,
          winningNumber,
          winners: 0,
          jackpot: lotteryData.jackpot,
          message: `Quay số thành công! Số trúng: ${winningNumber}. Không ai trúng — Jackpot ${lotteryData.jackpot} MCN được dồn sang ngày mai.`
        };
      }
    }).then((result) => {
      res.status(200).json(result);
    }).catch((error) => {
      res.status(400).json({ error: error.message });
    });

  } catch (error) {
    console.error('Lỗi khi quay số:', error);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
}