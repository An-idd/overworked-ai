import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { CARDS, cardById } from "./catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RARITY = { N: 0, R: 1, SR: 2, SSR: 3 };

export const svgLangOf = (lang) => (lang === "en" ? "en" : "cn");
export const renderable = (id, svgLang) =>
  existsSync(join(ROOT, "templates", `${id}.${svgLang}.svg`));

// Which conditional cards fired this week (may include non-renderable ones —
// they still unlock in the album even before their card art exists).
export const firedCards = (stats) => CARDS.filter((c) => c.trigger && c.trigger(stats));

// Pick the card to render. --template forces it (explicit intent); otherwise the
// highest-rarity RENDERABLE, NOT-YET-EARNED fired card wins (each rare only takes
// over the weekly card once — after that it lives in the album), else arbitration.
export function selectCard(stats, { template, lang, earned = new Set() }) {
  const svgLang = svgLangOf(lang);
  const fired = firedCards(stats);
  let chosen;
  if (template) chosen = cardById(template) || { id: template, rarity: "N" };
  else {
    const rf = fired
      .filter((c) => !earned.has(c.id) && renderable(c.id, svgLang))
      .sort((a, b) => RARITY[b.rarity] - RARITY[a.rarity]);
    chosen = rf[0] || cardById("arbitration");
  }
  return { chosen, fired };
}
