import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { CARDS } from "../cards/catalog.js";
import { thumbPath } from "../collection/state.js";
import { sub } from "../format.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// Optional archive crest for the masthead — drop a gpt-image-2 render here.
const CREST = join(ROOT, "assets", "album", "crest.png");

// Gacha rarity palette: badge / gradient stops / medallion ring.
const RARITY = {
  N:   { c: "#8a9099", g: ["#c2c6cc", "#8a9099"], dark: "#6b7178" },
  R:   { c: "#3b82c4", g: ["#6aa6e0", "#2f6fb0"], dark: "#245a8f" },
  SR:  { c: "#9b59b6", g: ["#bf7fdc", "#7d3fa0"], dark: "#6d2f8f" },
  SSR: { c: "#d4a017", g: ["#f4d264", "#c68f12"], dark: "#a06f0a" },
};
const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3 };
const GOLD = "#c9a227", RED = "#b3141c";

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const mmdd = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${m}/${d}`; };

async function dataUri(p) {
  if (!existsSync(p)) return null;
  return `data:image/png;base64,${(await readFile(p)).toString("base64")}`;
}
const thumbUri = (id) => dataUri(thumbPath(id));

function nextHint(state, locale) {
  const a = locale.album;
  const locked = CARDS.filter((c) => !state.cards[c.id]?.earned)
    .sort((x, y) => RARITY_ORDER[y.rarity] - RARITY_ORDER[x.rarity]);
  if (locked.length === 0) return a.all_done;
  const c = locked[0];
  return sub(a.next_prefix, { rarity: c.rarity }) + (a.conditions[c.id] || a.conditions.default);
}

const DEFS = `<defs>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#1a1a1a" flood-opacity="0.14"/></filter>
  <filter id="ssrglow" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="#e8b923" flood-opacity="0.85"/></filter>
  <filter id="softgold" x="-60%" y="-60%" width="220%" height="220%">
    <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#e8b923" flood-opacity="0.5"/></filter>
  ${Object.entries(RARITY).map(([k, v]) => `<linearGradient id="g-${k}" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0" stop-color="${v.g[0]}"/><stop offset="1" stop-color="${v.g[1]}"/></linearGradient>`).join("")}
  <linearGradient id="cardback" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#4a505c"/><stop offset="1" stop-color="#282b33"/></linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f0d783"/><stop offset="0.5" stop-color="#d4a017"/><stop offset="1" stop-color="#b8860b"/></linearGradient>
  <pattern id="paper" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="16" height="16" fill="none"/><line x1="0" y1="0" x2="0" y2="16" stroke="#8a6a2a" stroke-width="1" opacity="0.05"/></pattern>
</defs>`;

// Decorative red+gold folio frame with gold corner flourishes.
const FRAME = `
  <rect x="28" y="28" width="1024" height="1294" rx="6" fill="none" stroke="${RED}" stroke-width="8"/>
  <rect x="46" y="46" width="988" height="1258" rx="3" fill="none" stroke="${GOLD}" stroke-width="2"/>
  <g fill="${GOLD}">
    <path d="M46 46 l58 0 0 11 -47 0 0 47 -11 0 Z"/>
    <path d="M1034 46 l-58 0 0 11 47 0 0 47 11 0 Z"/>
    <path d="M46 1304 l58 0 0 -11 -47 0 0 -47 -11 0 Z"/>
    <path d="M1034 1304 l-58 0 0 -11 47 0 0 -47 11 0 Z"/>
  </g>`;

// Masthead crest: the generated image (clipped to a clean gold-rimmed medallion,
// which drops the raster's dark background corners) if present, else a seal fallback.
function crest(uri, lang) {
  if (uri) return `<g filter="url(#softgold)">
    <clipPath id="crestclip"><circle cx="540" cy="122" r="54"/></clipPath>
    <circle cx="540" cy="122" r="54" fill="#fbf6e8"/>
    <image href="${uri}" x="485" y="67" width="110" height="110" clip-path="url(#crestclip)" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="540" cy="122" r="54" fill="none" stroke="url(#gold)" stroke-width="4"/>
  </g>`;
  const glyph = lang === "en" ? "★" : "档";
  return `<g transform="translate(540,122)" filter="url(#softgold)">
    <circle r="50" fill="#fbf6e8" stroke="url(#gold)" stroke-width="5"/>
    <circle r="40" fill="none" stroke="${GOLD}" stroke-width="1.5"/>
    <text y="${lang === "en" ? 19 : 17}" text-anchor="middle" class="songti" font-size="44" fill="${RED}" font-weight="900">${glyph}</text>
  </g>`;
}

// 8-pip collection meter (filled = collected).
function pips(earned, total) {
  const pw = 26, gap = 9, tw = total * pw + (total - 1) * gap, x0 = 540 - tw / 2, y = 290;
  return Array.from({ length: total }, (_, i) => {
    const on = i < earned;
    return `<rect x="${x0 + i * (pw + gap)}" y="${y}" width="${pw}" height="14" rx="7"
      fill="${on ? "url(#gold)" : "#d8d2c4"}" stroke="${on ? "#a67c0a" : "#c8c2b4"}" stroke-width="1"/>`;
  }).join("");
}

// One album cell (unchanged theming: thumb / medallion / face-down back).
function cell(card, x, y, w, h, lang, thumb, locale, earnedISO) {
  const a = locale.album;
  const name = lang === "en" ? card.en : card.zh;
  const r = RARITY[card.rarity];
  const unlocked = !!thumb || card._earned;
  const isSSR = card.rarity === "SSR";
  const tw = 140, th = 175, tx = x + 22, ty = y + (h - th) / 2;
  const cx = tx + tw / 2, cy = ty + th / 2, textX = tx + tw + 24;
  const glow = isSSR && unlocked ? ' filter="url(#ssrglow)"' : "";

  const badge = `<g transform="translate(${x + w - 34},${y + 32})">
    <rect x="-32" y="-23" width="64" height="40" rx="9" fill="${r.c}"${glow}/>
    <text x="0" y="7" text-anchor="middle" class="hei" fill="#fff" font-size="24" font-weight="900">${card.rarity}</text></g>`;

  let art;
  if (thumb) {
    art = `<image href="${thumb}" x="${tx}" y="${ty}" width="${tw}" height="${th}" preserveAspectRatio="xMidYMid meet"${glow}/>
      <rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="8" fill="none" stroke="${r.c}" stroke-width="3.5"/>`;
  } else if (unlocked) {
    art = `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="10" fill="url(#g-${card.rarity})"${glow}/>
      <circle cx="${cx}" cy="${cy}" r="46" fill="#ffffff" opacity="0.95"/>
      <circle cx="${cx}" cy="${cy}" r="46" fill="none" stroke="${r.dark}" stroke-width="3"/>
      <text x="${cx}" y="${cy + 19}" text-anchor="middle" font-size="54" fill="${r.c}">★</text>`;
  } else {
    art = `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="10" fill="url(#cardback)"/>
      <circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.32"/>
      <text x="${cx}" y="${cy + 23}" text-anchor="middle" class="hei" font-size="60" fill="#ffffff" opacity="0.42" font-weight="900">?</text>`;
  }

  const nameEl = unlocked
    ? `<text x="${textX}" y="${y + h / 2 - 4}" class="hei ink" font-size="30" font-weight="700">${esc(name)}</text>`
    : `<text x="${textX}" y="${y + h / 2 - 4}" class="hei" fill="#a8a8a8" font-size="30" font-weight="700">${a.locked}</text>`;
  const sub2 = unlocked
    ? `<text x="${textX}" y="${y + h / 2 + 34}" class="hei" fill="${r.c}" font-size="21">${esc(sub(a.got, { d: mmdd(earnedISO) }))}${card._count > 1 ? ` · ×${card._count}` : ""}</text>`
    : `<text x="${textX}" y="${y + h / 2 + 34}" class="hei gray" font-size="20">${esc(a.conditions[card.id] || a.conditions.default)}</text>`;

  return `<g filter="url(#shadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#fffdf9" stroke="${unlocked ? r.c : "#e2ddd0"}" stroke-width="${unlocked ? 2.5 : 1.5}"/>
    ${art}${badge}${nameEl}${sub2}</g>`;
}

// Build the collection album SVG (2×4 grid inside a decorative folio frame).
export async function renderAlbum({ state, locale, lang }) {
  const a = locale.album;
  const earned = CARDS.filter((c) => state.cards[c.id]?.earned).length;
  const crestUri = await dataUri(CREST);

  const M = 76, gapX = 26, gapY = 22, top = 328, rows = 4, cols = 2;
  const cellW = (1080 - 2 * M - gapX) / cols;
  const cellH = (1188 - top - (rows - 1) * gapY) / rows;

  const cells = [];
  for (let i = 0; i < CARDS.length; i++) {
    const card = { ...CARDS[i] };
    const rec = state.cards[card.id];
    card._earned = !!rec?.earned;
    card._count = rec?.count || 0;
    const col = i % cols, row = Math.floor(i / cols);
    const x = M + col * (cellW + gapX), y = top + row * (cellH + gapY);
    cells.push(cell(card, x, y, cellW, cellH, lang, card._earned ? await thumbUri(card.id) : null, locale, rec?.earned || ""));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  ${DEFS}
  <style>
    .hei{font-family:"PingFang SC","Microsoft YaHei","Helvetica Neue","Arial","Noto Sans SC","Noto Sans CJK SC",sans-serif;}
    .songti{font-family:"Songti SC","Georgia","SimSun","Noto Serif SC","Noto Serif CJK SC",serif;}
    .ink{fill:#2a2418;} .gray{fill:#8a8a8a;}
  </style>
  <rect width="1080" height="1350" fill="#f4f0e6"/>
  <rect width="1080" height="1350" fill="url(#paper)"/>
  ${FRAME}
  ${crest(crestUri, lang)}
  <text x="540" y="222" text-anchor="middle" class="songti" fill="${RED}" font-size="68" font-weight="900" letter-spacing="10">${esc(a.title)}</text>
  <text x="540" y="258" text-anchor="middle" class="hei" fill="${GOLD}" font-size="19" letter-spacing="6">${esc(a.subtitle)}</text>
  ${pips(earned, CARDS.length)}
  <text x="150" y="302" class="hei ink" font-size="27" font-weight="700">${esc(sub(a.progress, { earned, total: CARDS.length }))}</text>
  <text x="930" y="302" text-anchor="end" class="hei ink" font-size="27" font-weight="700">★ ${esc(sub(a.streak, { streak: state.streak_weeks || 0 }))}</text>
  ${cells.join("\n")}
  <g>
    <rect x="270" y="1218" width="540" height="52" rx="26" fill="#fbf4e2" stroke="${GOLD}" stroke-width="2"/>
    <text x="540" y="1252" text-anchor="middle" class="hei" fill="${RED}" font-size="26" font-weight="700">${esc(nextHint(state, locale))}</text>
  </g>
  <text x="540" y="1294" text-anchor="middle" class="hei ink" font-size="24">${esc(a.hook)}</text>
  <text x="540" y="1314" text-anchor="middle" class="hei gray" font-size="17">${esc(a.unofficial)}</text>
</svg>`;
}
