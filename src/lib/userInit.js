// src/lib/userInit.js
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const INITIAL_BALANCE = 0; // 👈 ĐÃ SỬA THEO YÊU CẦU
const INITIAL_INVENTORY = {};

export const ensureUserExists = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      balance: INITIAL_BALANCE,
      inventory: INITIAL_INVENTORY,
      stats: {
        totalMined: 0,
        transfersSent: 0,
        transfersReceived: 0,
        lotteryTickets: 0,
        achievements: [],
      },
      buffs: {},
      displaySkin: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('🆕 Tạo user mới với 0 MCN:', user.uid);
  }

  const freshSnap = await getDoc(userRef);
  return { id: freshSnap.id, ...freshSnap.data() };
};