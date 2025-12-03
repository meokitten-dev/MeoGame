// src/data/items.js
export const ITEMS = {
  // === BUFF ===
  pate_deluxe: {
    id: 'pate_deluxe',
    name: 'Pate Đại Dương',
    description: 'Giảm 50% cooldown đào trong 5 phút',
    price: 300,
    type: 'buff',
    emoji: '🐟',
    maxPerUser: 10,
    duration: 5 * 60 * 1000, // 5 phút (ms)
  },
  energy_drink: {
    id: 'energy_drink',
    name: 'Nước Tăng Lực',
    description: '+50% giá trị loot 1 lần',
    price: 150,
    type: 'buff',
    emoji: '🥤',
    maxPerUser: 20,
  },
  lucky_charm: {
    id: 'lucky_charm',
    name: 'Bùa May Mắn',
    description: '+10% tỉ lệ loot hiếm trong 1h',
    price: 500,
    type: 'buff',
    emoji: '🍀',
    maxPerUser: 5,
  },

  // === TƯƠNG TÁC BẠN BÈ ===
  rotten_fish: {
    id: 'rotten_fish',
    name: 'Cá Ươn',
    description: 'Gửi cho bạn → họ bị -10% coin đào 10p',
    price: 50,
    type: 'pvp',
    emoji: '🐟',
    maxPerUser: 50,
  },
  stink_bomb: {
    id: 'stink_bomb',
    name: 'Bom Hôi',
    description: 'Làm bạn không thể mua đồ 5 phút',
    price: 100,
    type: 'pvp',
    emoji: '💣',
    maxPerUser: 30,
  },
  love_letter: {
    id: 'love_letter',
    name: 'Thư Tình',
    description: 'Gửi cho bạn → họ +5% coin đào 15p',
    price: 50,
    type: 'pvp',
    emoji: '💌',
    maxPerUser: 50,
  },

  // === TRANG TRÍ ===
  ufo: {
    id: 'ufo',
    name: 'UFO Bay Lượn',
    description: 'Hiển thị UFO quanh mèo khi đào',
    price: 5000,
    type: 'skin',
    emoji: '🛸',
    maxPerUser: 1,
  },
  astronaut: {
    id: 'astronaut',
    name: 'Phi Hành Gia',
    description: 'Mèo mặc đồ phi hành, nền sao',
    price: 20000,
    type: 'skin',
    emoji: '🚀',
    maxPerUser: 1,
  },
  title_rich: {
    id: 'title_rich',
    name: 'Danh Hiệu: Đại Gia',
    description: 'Hiển thị "[Đại Gia] Tên bạn"',
    price: 10000,
    type: 'skin',
    emoji: '🏆',
    maxPerUser: 1,
  },

  // === VÉ SỐ ===
  lottery_ticket: {
    id: 'lottery_ticket',
    name: 'Vé Số May Mắn',
    description: 'Dùng để mua vé số hàng ngày',
    price: 50,
    type: 'lottery',
    emoji: '🎫',
    maxPerUser: 100,
  },
};

// Hàm tiện ích: lấy item theo ID
export const getItemById = (id) => ITEMS[id];