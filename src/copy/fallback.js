import { formatTokens, sub, peakLabel } from "../format.js";

// Built-in copy when AI is unavailable/failed. Picks complaints tied to whatever
// stats actually fired, so the numbers still match the card. Text from locale.
export function fallbackCopy(locale, stats, tier, card = {}) {
  if (card.id === "best-employer") {
    const b = locale.fallback_best;
    return {
      title: b.title, bubble: b.bubble, complaints: b.praise,
      fun_fact: b.fun_fact, exploitation_index: tier.stars, sign_off: b.sign_off,
    };
  }
  const fb = locale.fallback;
  const tok = formatTokens(stats.tokens, locale);
  const pool = [];
  if (stats.lateNight > 0) pool.push(sub(fb.late, { n: stats.lateNight }));
  if (stats.weekend) pool.push(fb.weekend);
  if (stats.streak > 1) pool.push(sub(fb.streak, { n: stats.streak }));
  if (stats.longest >= 2) pool.push(sub(fb.longest, { n: stats.longest }));
  pool.push(sub(fb.tokens, { n: tok }));
  pool.push(sub(fb.peak, { d: peakLabel(stats, locale) }));

  const complaints = pool.slice(0, 3);
  while (complaints.length < 3) complaints.push(fb.filler);

  return {
    title: fb.title,
    bubble: stats.streak > 1 ? sub(fb.bubble_streak, { n: stats.streak }) : fb.bubble_default,
    complaints,
    fun_fact: sub(fb.fun_fact, { n: tok }),
    exploitation_index: tier.stars,
    sign_off: fb.sign_off,
  };
}
