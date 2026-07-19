import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { formatTokens, clip, formatDate } from "../format.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// resvg + system fonts can't shape emoji/ZWJ sequences (renders tofu, can break
// the whole text run). The public-doc design never wanted emoji anyway — strip them.
const stripEmoji = (s) => String(s)
  .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "")
  .replace(/\s+/g, " ").trim();

const esc = (s) => stripEmoji(s)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

async function skinDataUri(skin, tier) {
  const buf = await readFile(join(ROOT, "assets", "skins", skin, `tier${tier}.png`));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// SVG files use cn/en; locales use zh/en.
const SVG_LANG = { zh: "cn", en: "en" };

// Fill the SVG template slots from the copy JSON + computed stats. `card` is the
// selected catalog entry (rarity badge + optional skin override).
export async function fillTemplate({ template, lang, skin, locale, copy, stats, tier, card = {}, todayISO }) {
  const c = locale.card;
  const svgLang = SVG_LANG[lang] || lang;
  const svg = await readFile(join(ROOT, "templates", `${template}.${svgLang}.svg`), "utf8");
  const image = await skinDataUri(skin, card.skinTier ?? tier.tier);

  // No population data (100%-local, zero-upload), so this is a coarse tier bucket,
  // not a real percentile. ponytail: it's a meme攀比 hook, not analytics.
  const percentile = { 1: "30%", 2: "60%", 3: "85%", 4: "99%" }[tier.tier];

  // Superset of every template's slots; each SVG consumes only the ones it has.
  const slots = {
    card_no: c.card_no,
    rarity: card.rarity || "N",
    percentile,
    skin_placeholder: "",
    skin_image: image,
    bubble: clip(copy.bubble, 28),
    hero_value: `${stats.hours}${c.hero_unit}`,
    hero_label: c.hero_label,
    stat1_label: c.stat_late, stat1_value: `×${stats.lateNight}`,
    stat2_label: c.stat_streak, stat2_value: `${stats.streak}${c.unit_day}`,
    stat3_label: c.stat_tokens, stat3_value: formatTokens(stats.tokens, locale),
    stat4_label: c.stat_weekend, stat4_value: stats.weekend ? c.yes : c.no,
    fun_fact: clip(copy.fun_fact, 58),
    stars: tier.stars, // deterministic; AI's exploitation_index is unreliable (echoes hints/tier name)
    complaint_1: clip(copy.complaints[0], 56),
    complaint_2: clip(copy.complaints[1], 56),
    complaint_3: clip(copy.complaints[2], 56),
    sign_off: clip(copy.sign_off, 42),
    // best-employer (award) template slots
    boss_name: c.boss_name,
    praise_1: clip(copy.complaints[0], 40),
    praise_2: clip(copy.complaints[1], 40),
    date: formatDate(todayISO, lang),
  };

  return svg.replace(/\{\{(\w+)\}\}/g, (m, k) =>
    k in slots ? (k === "skin_image" ? slots[k] : esc(slots[k])) : m);
}
