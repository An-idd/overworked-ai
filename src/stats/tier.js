// WeeklyStats → 过劳等级 1-4. Thresholds拍脑袋, calibrate on real data (00方案).
// ponytail: score model beats a pile of if/else and is one knob to tune later.
export const TIER_NAMES = ["今日轻松", "正常出勤", "被迫加班", "濒临离职"];

export function tierOf(s) {
  let score = 0;
  score += s.hours >= 30 ? 3 : s.hours >= 15 ? 2 : s.hours >= 5 ? 1 : 0;
  score += s.lateNight >= 5 ? 3 : s.lateNight >= 2 ? 2 : s.lateNight >= 1 ? 1 : 0;
  score += s.streak >= 7 ? 2 : s.streak >= 4 ? 1 : 0;
  score += s.longest >= 6 ? 2 : s.longest >= 3 ? 1 : 0;
  score += s.weekend ? 1 : 0;

  const tier = score >= 8 ? 4 : score >= 5 ? 3 : score >= 2 ? 2 : 1;
  return { tier, name: TIER_NAMES[tier - 1], stars: "★".repeat(tier) + "☆".repeat(5 - tier) };
}
