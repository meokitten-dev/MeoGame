// api/lottery.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// 🔒 Khởi tạo Firebase Admin từ biến môi trường
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = getFirestore(app);
const auth = getAuth(app);

export default async function handler(req, res) {
  // Chỉ cho phép POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { number } = req.body; // Số dự đoán (1–100)
  const { authorization } = req.headers;

  // Kiểm tra dữ liệu đầu vào
  if (!authorization || number == null) {
    return res.status(400).json({ error: 'Thiếu số dự đoán hoặc token xác thực' });
  }

  if (number < 1 || number > 100 || !Number.isInteger(number)) {
    return res.status(400).json({ error: 'Số phải là số nguyên từ 1 đến 100' });
  }

  const token = authorization.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token xác thực không hợp lệ' });
  }

  try {
    // Xác minh người dùng
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const userRef = db.collection('users').doc(uid);
    const lotteryRef = db.collection('lottery').doc('current');

    // Dùng transaction để đảm bảo tính toàn vẹn
    await db.runTransaction(async (transaction) => {
      // Lấy dữ liệu người dùng
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('Người dùng không tồn tại');
      
      const userData = userDoc.data();
      const currentBalance = userData.balance || 0;
      const ticketPrice = 50;

      if (currentBalance < ticketPrice) {
        throw new Error('Không đủ 50 MCN để mua vé');
      }

      // Lấy hoặc khởi tạo dữ liệu vé số hiện tại
      const lotteryDoc = await transaction.get(lotteryRef);
      let lotteryData;
      if (!lotteryDoc.exists) {
        lotteryData = { jackpot: 10000, tickets: [] };
      } else {
        lotteryData = lotteryDoc.data();
      }

      // Cập nhật: thêm vé mới + tăng jackpot
      const newTickets = [...(lotteryData.tickets || []), { 
        uid, 
        number, 
        timestamp: new Date() 
      }];
      const newJackpot = (lotteryData.jackpot || 10000) + ticketPrice;

      // Cập nhật người dùng
      transaction.update(userRef, {
        balance: currentBalance - ticketPrice,
        'stats.lotteryTickets': (userData.stats?.lotteryTickets || 0) + 1,
        updatedAt: new Date(),
      });

      // Cập nhật jackpot & vé
      transaction.set(lotteryRef, {
        jackpot: newJackpot,
        tickets: newTickets
      });

      return { success: true, newBalance: currentBalance - ticketPrice };
    }).then((result) => {
      res.status(200).json({
        success: true,
        message: 'Mua vé thành công!',
        newBalance: result.newBalance
      });
    }).catch((error) => {
      res.status(400).json({ error: error.message });
    });

  } catch (error) {
    console.error('Lỗi khi mua vé số:', error);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
}