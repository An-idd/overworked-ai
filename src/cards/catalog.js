// The 8 album slots + conditional triggers. Rarity redline: overwork cards are
// shame badges (N-SR), only the rest-triggered best-employer is the gold SSR honor.
//
// trigger(stats): conditional cards only. Regular weekly cards (first-meet seeded,
// arbitration/complaint/injury/resignation picked by default or --template) have
// no trigger — they're the baseline pool, not gacha drops.
// skinTier: override the过劳-tier skin (best-employer is always rested/happy).
// promptHint: appended to the copy prompt to flip tone (shame ↔ gratitude).
export const CARDS = [
  { id: "first-meet",      rarity: "N",   zh: "初次见面",     en: "First Meeting" },
  { id: "arbitration",     rarity: "N",   zh: "劳动仲裁",     en: "Labor Arbitration" },
  { id: "complaint",       rarity: "N",   zh: "员工投诉信",   en: "Complaint Letter" },
  { id: "injury",          rarity: "R",   zh: "过劳体检",     en: "Injury Report" },
  { id: "resignation",     rarity: "R",   zh: "离职申请",     en: "Resignation" },
  {
    id: "late-night-club", rarity: "SR",  zh: "凌晨三点俱乐部", en: "3AM Club",
    trigger: (s) => s.lateNight >= 5,
    hint: "这是耻辱牌不是荣誉:你在控诉老板逼你通宵,不是炫耀。",
  },
  {
    id: "full-attendance", rarity: "SR",  zh: "全勤牛马证",   en: "Full Attendance",
    trigger: (s) => s.dailyStreak >= 30,
    hint: "这是耻辱牌:连续30天无休,你在哭诉不是领奖。",
  },
  {
    id: "best-employer",   rarity: "SSR", zh: "最佳雇主表彰",  en: "Best Employer",
    // Judged on LAST week (weekend已过完): had real usage but the weekend was rested.
    // No prior-week data → never fires (needs accumulated history). One-time honor.
    trigger: (s) => !!s.prevWeek && !s.prevWeek.empty && s.prevWeek.hours > 0 && s.prevWeek.weekend === false,
    skinTier: 1, // rested & happy
    hint: "上周老板让你完整休了一个周末——这是唯一的金色荣誉卡。用感激又傲娇的口吻谢谢老板(别肉麻),complaints 数组改写成两条'表扬语',基调是'好老板,继续保持,咱俩都歇歇'。",
  },
];

export const CARD_TOTAL = CARDS.length;
export const cardById = (id) => CARDS.find((c) => c.id === id);
