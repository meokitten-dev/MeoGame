// src/components/Login.jsx
import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { LogIn } from 'lucide-react';
import { playSound } from '../lib/sound';

const Login = ({ onLogin }) => {
  const handleGoogleLogin = async () => {
    try {
      playSound('click');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // Lưu user info (tuỳ chọn: localStorage, context...)
      onLogin({
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0],
        email: user.email,
        photoURL: user.photoURL,
      });
    } catch (error) {
      console.error("Login error:", error);
      alert("Đăng nhập thất bại. Vui lòng thử lại!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass p-8 text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2">Chào mừng đến MeoGame!</h1>
        <p className="text-gray-600 mb-6">Đăng nhập để đào coin cùng bạn bè 💖</p>
        <button
          className="btn flex items-center gap-2 w-full justify-center"
          onClick={handleGoogleLogin}
        >
          <LogIn size={20} />
          Tiếp tục với Google
        </button>
      </div>
    </div>
  );
};

export default Login;