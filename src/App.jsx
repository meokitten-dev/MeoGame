// src/App.jsx
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Play, Pause, LogIn } from 'lucide-react';
import { playSound, playBgMusic } from './lib/sound';
import Login from './components/Login';
import { ensureUserExists } from './lib/userInit';
import { ITEMS } from './data/items';

const MeoGame = () => {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [isMining, setIsMining] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [activeTab, setActiveTab] = useState('mine');
  const [logs, setLogs] = useState([]);
  const [showPvPModal, setShowPvPModal] = useState(false);
  const [selectedPvPItem, setSelectedPvPItem] = useState(null);
  const [onlineFriends, setOnlineFriends] = useState([]);

  // Theo dõi đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        };
        const fullUser = await ensureUserExists(userData);
        setUser(fullUser);
        setInventory(fullUser.inventory || {});
      } else {
        setUser(null);
        setInventory({});
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Nhạc nền
  useEffect(() => {
    if (user) playBgMusic();
  }, [user]);

  // Cooldown đào
  useEffect(() => {
    let interval;
    if (isMining && cooldown > 0) {
      interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            handleMine();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMining, cooldown]);

  // === MINING ===
  const handleMine = async () => {
    if (!user || isMining) return;

    playSound('mine');
    setIsMining(true);
    setCooldown(10);

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/mine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setUser(prev => ({ ...prev, balance: data.newBalance }));
        const isRare = ['rare', 'epic', 'legendary'].includes(data.loot.rarity);
        playSound(isRare ? 'loot-rare' : 'loot-common');
        const message = `${data.loot.emoji} Bạn đào được ${data.loot.name}! (+${data.loot.value} MCN)`;
        setLogs(prev => [message, ...prev.slice(0, 4)]);
      } else {
        throw new Error(data.error || 'Đào thất bại');
      }
    } catch (error) {
      console.error('Mine API error:', error);
      playSound('troll');
      setLogs(prev => [`❌ ${error.message}`, ...prev.slice(0, 4)]);
      setIsMining(false);
      setCooldown(0);
    }
  };

  // === SHOP ===
  const handleBuy = async (itemId, price) => {
    if (!user || (user.balance || 0) < price) {
      playSound('troll');
      setLogs(prev => [`❌ Không đủ MCN!`, ...prev.slice(0, 4)]);
      return;
    }

    playSound('click');
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/shop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId, quantity: 1 })
      });

      const data = await response.json();
      if (response.ok) {
        setUser(prev => ({ ...prev, balance: data.newBalance }));
        setInventory(data.inventory);
        playSound('buff');
        setLogs(prev => [`✅ ${data.message}`, ...prev.slice(0, 4)]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Shop error:', error);
      playSound('troll');
      setLogs(prev => [`❌ ${error.message}`, ...prev.slice(0, 4)]);
    }
  };

  const fetchOnlineFriends = async () => {
  if (!user) return;
  
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  // Giả sử bạn có collection 'users' — lọc theo lastSeen
  const usersRef = db.collection('users');
  const snapshot = await usersRef
    .where('lastSeen', '>', new Date(fiveMinutesAgo))
    .where('uid', '!=', user.uid)
    .get();

  const friends = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.uid !== user.uid) {
      friends.push({ uid: data.uid, displayName: data.displayName, photoURL: data.photoURL });
    }
  });
  setOnlineFriends(friends);
};

  // === Use item ===
const handleUseItem = async (itemId, type) => {
  if (!inventory[itemId] || inventory[itemId] <= 0) return;

  playSound('click');
  try {
    const token = await auth.currentUser.getIdToken();
    const body = { itemId };
    
    // Nếu là PvP, cần chọn mục tiêu (sẽ làm sau)
    if (type === 'pvp') {
      const target = prompt('Nhập ID người nhận:');
      if (!target) return;
      body.targetUid = target;
    }

    const response = await fetch('/api/use', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (response.ok) {
      // Cập nhật inventory local
      setInventory(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || 1) - 1
      }));
      playSound('buff');
      setLogs(prev => [`✨ ${data.message}`, ...prev.slice(0, 4)]);
      
      // Nếu là skin, cập nhật hiển thị
      if (type === 'skin') {
        setUser(prev => ({ ...prev, displaySkin: itemId }));
      }
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Use item error:', error);
    playSound('troll');
    setLogs(prev => [`❌ ${error.message}`, ...prev.slice(0, 4)]);
  }
};

  // === RENDER ===
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-50">
        Đang tải MeoGame...
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen p-4">
      {/* Top Bar */}
      <div className="glass p-4 mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">MeoGame</h1>
        <div className="flex items-center gap-2">
          <span>💰 {(user.balance || 0).toLocaleString()} MCN</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="glass p-4 w-full md:w-64">
          {[
            'mine', 'shop', 'inventory', 'lottery',
            'wallet', 'friends', 'garden', 'birthday', 'achievements'
          ].map(tab => (
            <button
              key={tab}
              className={`block w-full text-left px-4 py-2 mb-2 rounded-lg transition ${
                activeTab === tab ? 'bg-purple-100 font-bold' : ''
              }`}
              onClick={() => {
                playSound('click');
                setActiveTab(tab);
              }}
            >
              <>
                {tab === 'mine' && '⛏️ Đào Coin'}
                {tab === 'shop' && '🛍️ Cửa Hàng'}
                {tab === 'inventory' && '🎒 Túi Đồ'}
                {tab === 'lottery' && '🎫 Vé Số'}
                {tab === 'wallet' && '💸 Ví'}
                {tab === 'friends' && '👥 Bạn Bè'}
                {tab === 'garden' && '🌿 Vườn'}
                {tab === 'birthday' && '🎂 Sinh Nhật'}
                {tab === 'achievements' && '🏆 Thành Tựu'}
              </>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* === TAB: ĐÀO COIN === */}
          {activeTab === 'mine' && (
            <div className="glass p-6 text-center">
              <div className="relative inline-block mb-6">
                <div className="w-48 h-48 bg-pink-200 rounded-full flex items-center justify-center text-5xl">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    '🐾'
                  )}
                </div>
                {isMining && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 animate-bounce">
                    ⛏️
                  </div>
                )}
              </div>

              <button
                className="btn flex items-center gap-2 mx-auto mb-4"
                onClick={toggleMining}
                disabled={isMining && cooldown > 0}
              >
                {isMining ? <Pause size={20} /> : <Play size={20} />}
                {isMining ? 'Đi Ngủ' : 'Đánh Thức'}
              </button>

              {isMining && (
                <div className="text-lg font-mono mb-6">
                  ⏳ Đào lại sau: <span className="font-bold">{cooldown}s</span>
                </div>
              )}

              <div className="glass p-4 text-left max-h-40 overflow-y-auto">
                <h3 className="font-bold mb-2">📋 Nhật ký đào</h3>
                {logs.length === 0 ? (
                  <p className="text-gray-500">Chưa có hoạt động</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      [{new Date().toLocaleTimeString()}] {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* === TAB: CỬA HÀNG === */}
          {activeTab === 'shop' && (
            <div className="glass p-6">
              <h2 className="text-2xl font-bold mb-4 text-center">🛍️ Cửa Hàng MeoGame</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(ITEMS).map(item => (
                  <div key={item.id} className="glass p-4 flex flex-col">
                    <div className="text-3xl text-center mb-2">{item.emoji}</div>
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <div className="mt-auto flex justify-between items-center">
                      <span className="font-mono">🪙 {item.price} MCN</span>
                      <button
                        className="btn text-xs py-1 px-3"
                        onClick={() => handleBuy(item.id, item.price)}
                        disabled={(user?.balance || 0) < item.price}
                      >
                        Mua
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

{/* === TAB: Túi đồ === */}
          {activeTab === 'inventory' && (
  <div className="glass p-6">
    <h2 className="text-2xl font-bold mb-4 text-center">🎒 Túi Đồ Của Bạn</h2>
    {Object.keys(inventory).length === 0 ? (
      <p className="text-center text-gray-500">Túi đồ trống!</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(inventory)
          .filter(([id, qty]) => qty > 0)
          .map(([id, qty]) => {
            const item = ITEMS[id];
            if (!item) return null;
            return (
              <div key={id} className="glass p-4 flex justify-between items-center">
                <div>
                  <div className="text-xl">{item.emoji} {item.name}</div>
                  <div className="text-sm text-gray-600">SL: {qty}</div>
                </div>
                <button
                  className="btn text-xs py-1 px-3"
                  onClick={() => handleUseItem(id, item.type)}
                >
                  Dùng
                </button>
              </div>
            );
          })}
      </div>
    )}
  </div>
)}

          {/* === CÁC TAB KHÁC === */}
          {['inventory', 'lottery', 'wallet', 'friends', 'garden', 'birthday', 'achievements'].includes(activeTab) && (
            <div className="glass p-6 text-center">
              <h2 className="text-2xl mb-4">
                {activeTab === 'inventory' && '🎒 Túi Đồ'}
                {activeTab === 'lottery' && '🎫 Vé Số'}
                {activeTab === 'wallet' && '💸 Ví'}
                {activeTab === 'friends' && '👥 Bạn Bè'}
                {activeTab === 'garden' && '🌿 Vườn'}
                {activeTab === 'birthday' && '🎂 Sinh Nhật'}
                {activeTab === 'achievements' && '🏆 Thành Tựu'}
              </h2>
              <p className="text-gray-600">Tính năng đang được xây dựng 💖</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Hàm toggleMining (đặt ở cuối để không bị lồng)
  function toggleMining() {
    playSound('click');
    if (isMining) {
      setIsMining(false);
      setCooldown(0);
    } else {
      handleMine();
    }
  }
};

export default MeoGame;