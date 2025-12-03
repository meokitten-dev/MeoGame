// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 🔥 Cấu hình Firebase (thay bằng config của bạn!)
const firebaseConfig = { 
  apiKey : "AIzaSyCPjf8Gr-M1Ek6TbAQUWexM_yd6YUxVy-E" , 
  authDomain : "meogame-6112c.firebaseapp.com" , 
  projectId : "meogame-6112c" , 
  storageBucket : "meogame-6112c.firebasestorage.app" , 
  messagingSenderId : "846987972078" , 
  appId : "1:846987972078:web:b3525fbb5a52fc74c552ff" 
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();