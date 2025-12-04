// api/lottery-data.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = getFirestore(app);

export default async function handler(req, res) {
  try {
    const lotteryRef = db.collection('lottery').doc('current');
    const lotteryDoc = await lotteryRef.get();
    
    const historySnapshot = await db.collection('lottery')
      .where('__name__', '>=', 'history-')
      .orderBy('__name__', 'desc')
      .limit(1)
      .get();

    let lastDraw = null;
    if (!historySnapshot.empty) {
      const last = historySnapshot.docs[0];
      const data = last.data();
      lastDraw = {
        date: data.date?.toDate?.()?.toLocaleDateString('vi-VN'),
        winningNumber: data.winningNumber,
        isWon: data.isWon,
        jackpot: data.totalJackpot
      };
    }

    res.status(200).json({
      jackpot: lotteryDoc.exists ? lotteryDoc.data().jackpot : 10000,
      lastDraw
    });
  } catch (error) {
    console.error('Lỗi lottery-data:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
}