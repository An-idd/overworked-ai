import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CARDS } from "../cards/catalog.js";

// 100% local, zero upload. Collection state lives under ~/.overworked-ai/.
export const DIR = join(homedir(), ".overworked-ai");
export const COLLECTION = join(DIR, "collection.json");
export const THUMBS = join(DIR, "thumbs");
export const thumbPath = (id) => join(THUMBS, `${id}.png`);

const DEFAULT = () => ({ streak_weeks: 0, first_run: null, last_card_week: null, cards: {} });

export async function loadState() {
  try { return { ...DEFAULT(), ...JSON.parse(await readFile(COLLECTION, "utf8")) }; }
  catch { return DEFAULT(); }
}

async function save(state) {
  await mkdir(DIR, { recursive: true });
  await writeFile(COLLECTION, JSON.stringify(state, null, 2));
}

export const isFirstRun = (state) => !state.first_run;

export function progress(state) {
  const earned = CARDS.filter((c) => state.cards[c.id]?.earned).length;
  return { earned, total: CARDS.length };
}

// Endowment effect: freebie "first-meet" card so you start at 1/8, not 0/8.
export async function seedFirstRun(state, todayISO) {
  state.first_run = todayISO;
  state.cards["first-meet"] = { earned: todayISO, count: 1 };
  await save(state);
}

// streak_weeks counts consecutive ISO weeks WITH A CARD — never usage (redline:
// we must not reward working more). Returns true if the streak reset this run.
export function advanceStreak(state, weekStartISO) {
  const last = state.last_card_week;
  let reset = false;
  if (!last) state.streak_weeks = 1;
  else if (last === weekStartISO) { /* same week re-run: unchanged */ }
  else {
    const days = (Date.parse(weekStartISO) - Date.parse(last)) / 86400000;
    if (days === 7) state.streak_weeks += 1;
    else if (days > 7) { state.streak_weeks = 1; reset = true; } // missed a week → gentle reset
    // days < 0 (backfilling an older week): don't punish, leave streak as-is
  }
  state.last_card_week = weekStartISO;
  return reset;
}

// Unlock a card into the album without rendering it (e.g. a rare fired but its
// card art doesn't exist yet). Returns true if it was newly unlocked.
export async function markEarned(state, id, todayISO) {
  if (state.cards[id]?.earned) return false;
  state.cards[id] = { earned: todayISO, count: state.cards[id]?.count || 0 };
  await save(state);
  return true;
}

// Record a rendered card + advance streak. count increments每次 render (第N次出这张卡).
export async function recordCard(state, { id, weekStartISO, todayISO }) {
  const c = state.cards[id] || { earned: null, count: 0 };
  c.earned = c.earned || todayISO;
  c.count += 1;
  state.cards[id] = c;
  const reset = advanceStreak(state, weekStartISO);
  await save(state);
  return reset;
}

// --- self-check: streak continuity logic (ponytail: the one non-trivial branch) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const s = DEFAULT();
  console.assert(advanceStreak(s, "2026-07-06") === false && s.streak_weeks === 1, "first week → 1");
  console.assert(advanceStreak(s, "2026-07-13") === false && s.streak_weeks === 2, "next week → 2");
  console.assert(advanceStreak(s, "2026-07-13") === false && s.streak_weeks === 2, "same week → unchanged");
  console.assert(advanceStreak(s, "2026-07-27") === true && s.streak_weeks === 1, "gap → reset to 1");
  console.log("state self-check ok");
}
