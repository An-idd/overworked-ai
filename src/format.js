// Big token counts → "1032万" (zh) / "10.3M" (en), driven by locale.token.
export function formatTokens(tokens, locale) {
  const t = locale.token;
  return (tokens / t.divisor).toFixed(t.decimals) + t.unit;
}

// {{key}} substitution for locale strings.
export function sub(str, map) {
  return str.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in map ? String(map[k]) : m));
}

// Peak day with locale weekday, e.g. "周日 7/19" / "Sun 7/19".
export function peakLabel(stats, locale) {
  return `${locale.card.weekdays[stats.peakDow]} ${stats.peakDay}`;
}

// "2026-07-19" → "2026年7月19日" (zh) / "Jul 19, 2026" (en).
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatDate(iso, lang) {
  const [y, m, d] = iso.split("-").map(Number);
  return lang === "en" ? `${MONTH_EN[m - 1]} ${d}, ${y}` : `${y}年${m}月${d}日`;
}

// AI free-text can ignore length limits and run off-canvas. Clip by display
// width (CJK glyph ≈ 2 latin units) so one cap works for zh and en.
export function clip(str, maxUnits) {
  const chars = Array.from(String(str));
  let w = 0, out = "";
  for (const ch of chars) {
    w += /[　-鿿＀-￯぀-ヿ]/.test(ch) ? 2 : 1;
    if (w > maxUnits) return out.trimEnd() + "…";
    out += ch;
  }
  return out;
}
