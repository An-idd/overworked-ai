import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { CARDS } from "../cards/catalog.js";
import { thumbPath } from "../collection/state.js";
import { sub } from "../format.js";

// Gacha rarity colors (teaser even when locked).
const RARITY_COLOR = { N: "#8a8a8a", R: "#3b82c4", SR: "#9b59b6", SSR: "#d4a017" };
const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3 };

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

async function thumbUri(id) {
  const p = thumbPath(id);
  if (!existsSync(p)) return null;
  return `data:image/png;base64,${(await readFile(p)).toString("base64")}`;
}

// Goal-gradient hint: the highest-rarity still-locked card + how to get it.
function nextHint(state, locale) {
  const a = locale.album;
  const locked = CARDS.filter((c) => !state.cards[c.id]?.earned)
    .sort((x, y) => RARITY_ORDER[y.rarity] - RARITY_ORDER[x.rarity]);
  if (locked.length === 0) return a.all_done;
  const c = locked[0];
  const cond = a.conditions[c.id] || a.conditions.default;
  return sub(a.next_prefix, { rarity: c.rarity }) + cond;
}

function cell(card, x, y, w, h, lang, thumb, locale) {
  const name = lang === "en" ? card.en : card.zh;
  const rc = RARITY_COLOR[card.rarity];
  const unlocked = !!thumb || card._earned;
  const tw = 132, th = 165, tx = x + 22, ty = y + (h - th) / 2;

  const badge = `<g transform="translate(${x + w - 30},${y + 30})">
    <rect x="-30" y="-22" width="60" height="38" rx="8" fill="${rc}"/>
    <text x="0" y="6" text-anchor="middle" class="hei" fill="#fff" font-size="24" font-weight="900">${card.rarity}</text></g>`;

  let art;
  if (thumb) {
    art = `<image href="${thumb}" x="${tx}" y="${ty}" width="${tw}" height="${th}" preserveAspectRatio="xMidYMid meet"/>`;
  } else if (unlocked) {
    art = `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="8" fill="${rc}" opacity="0.18"/>
      <text x="${tx + tw / 2}" y="${ty + th / 2 + 10}" text-anchor="middle" class="hei" fill="${rc}" font-size="52" font-weight="900">✓</text>`;
  } else {
    art = `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="8" fill="#e6e6e6"/>
      <text x="${tx + tw / 2}" y="${ty + th / 2 + 24}" text-anchor="middle" class="hei" fill="#b0b0b0" font-size="72" font-weight="900">?</text>`;
  }

  const label = unlocked ? esc(name) : locale.album.locked;
  const labelClass = unlocked ? "ink" : "gray";
  const textX = x + 22 + tw + 22;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#ffffff" stroke="#e0e0e0" stroke-width="2"/>
    ${art}${badge}
    <text x="${textX}" y="${y + h / 2 - 6}" class="hei ${labelClass}" font-size="30" font-weight="700">${label}</text>
    ${unlocked && card._count > 1 ? `<text x="${textX}" y="${y + h / 2 + 34}" class="hei gray" font-size="22">×${card._count}</text>` : ""}
  </g>`;
}

// Build the collection album SVG (2×4 grid, locked cells gray + ???).
export async function renderAlbum({ state, locale, lang }) {
  const a = locale.album;
  const earned = CARDS.filter((c) => state.cards[c.id]?.earned).length;

  const M = 60, gapX = 24, gapY = 22, top = 300, rows = 4, cols = 2;
  const cellW = (1080 - 2 * M - gapX) / cols;
  const cellH = (1170 - top - (rows - 1) * gapY) / rows;

  const cells = [];
  for (let i = 0; i < CARDS.length; i++) {
    const card = { ...CARDS[i] };
    const rec = state.cards[card.id];
    card._earned = !!rec?.earned;
    card._count = rec?.count || 0;
    const col = i % cols, row = Math.floor(i / cols);
    const x = M + col * (cellW + gapX), y = top + row * (cellH + gapY);
    cells.push(cell(card, x, y, cellW, cellH, lang, card._earned ? await thumbUri(card.id) : null, locale));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <style>
    .hei{font-family:"PingFang SC","Microsoft YaHei","Helvetica Neue","Arial","Noto Sans SC","Noto Sans CJK SC",sans-serif;}
    .songti{font-family:"Songti SC","Georgia","SimSun","Noto Serif SC","Noto Serif CJK SC",serif;}
    .ink{fill:#1a1a1a;} .gray{fill:#8a8a8a;} .red{fill:#c8161d;}
  </style>
  <rect width="1080" height="1350" fill="#f7f4ee"/>
  <text x="540" y="130" text-anchor="middle" class="songti red" font-size="72" font-weight="900" letter-spacing="6">${esc(a.title)}</text>
  <text x="300" y="210" text-anchor="middle" class="hei ink" font-size="40" font-weight="700">${esc(sub(a.progress, { earned, total: CARDS.length }))}</text>
  <text x="780" y="210" text-anchor="middle" class="hei ink" font-size="40" font-weight="700">${esc(sub(a.streak, { streak: state.streak_weeks || 0 }))}</text>
  <rect x="60" y="244" width="960" height="4" class="red"/>
  ${cells.join("\n")}
  <rect x="60" y="1198" width="960" height="4" fill="#e0e0e0"/>
  <text x="540" y="1256" text-anchor="middle" class="hei red" font-size="30" font-weight="700">${esc(nextHint(state, locale))}</text>
  <text x="540" y="1304" text-anchor="middle" class="hei ink" font-size="26">${esc(a.hook)}</text>
  <text x="540" y="1338" text-anchor="middle" class="hei gray" font-size="20">${esc(a.unofficial)}</text>
</svg>`;
}
