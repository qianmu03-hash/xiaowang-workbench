/* 打卡徽章配置 — 成就展示墙 */
window.BADGE_DEFS = [
  { id: 'early_bird', name: '早起鸟', icon: '🌅', desc: '连续7天早起', check: d => { const h = d.habitsData(); const log = h.log; let streak = 0; for (let i = 1; i <= 7; i++) { const k = ymd(addDays(new Date(), -i)); if (log[k] && log[k].wake) streak++; else break; } return streak >= 7; } },
  { id: 'queen', name: '自律女王', icon: '👑', desc: '连续30天习惯打卡', check: d => d.habitStreak >= 30 },
  { id: 'cook_30', name: '厨神初现', icon: '🍳', desc: '累计搜索30道菜', check: d => d.foodSearches >= 30 },
  { id: 'reader_100', name: '跟读达人', icon: '🗣️', desc: '跟读100次', check: d => d.reciteTotal >= 100 },
  { id: 'fitness_30', name: '运动健将', icon: '💪', desc: '记录体重30天', check: d => d.bodyLogDays >= 30 },
  { id: 'mood_7', name: '心情日记家', icon: '💗', desc: '连续7天记录心情', check: d => d.moodStreak >= 7 },
  { id: 'reader_7', name: '阅读爱好者', icon: '📖', desc: '阅读7天', check: d => d.readDays >= 7 },
  { id: 'save_1000', name: '小富婆', icon: '💰', desc: '单月记账超过1000元', check: d => d.monthSpend >= 1000 },
  { id: 'en_avg80', name: '英语之星', icon: '⭐', desc: '英语跟读平均分≥80', check: d => d.enAvgScore >= 80 },
  { id: 'period_3', name: '经期守护者', icon: '🌸', desc: '记录3次经期周期', check: d => d.periodCycles >= 3 },
  { id: 'cosmetic_5', name: '美妆管家', icon: '🧴', desc: '录入5个美妆品', check: d => d.cosmeticCount >= 5 },
  { id: 'streak_7', name: '一周达人', icon: '🔥', desc: '连续打卡7天', check: d => d.habitStreak >= 7 }
];
