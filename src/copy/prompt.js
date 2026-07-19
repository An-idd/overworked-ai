import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { formatTokens, peakLabel } from "../format.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function loadLocale(lang) {
  const text = await readFile(join(ROOT, "locales", `${lang}.json`), "utf8");
  return JSON.parse(text);
}

export function buildPrompt(locale, stats, tier, opts, card = {}) {
  const weekend = opts.lang === "en" ? (stats.weekend ? "yes" : "no") : (stats.weekend ? "是" : "否");
  const base = card.hint ? `${locale.prompt}\n\n【本卡特殊口吻】${card.hint}` : locale.prompt;
  return base
    .replaceAll("{{mascot}}", locale.mascot[opts.skin] || opts.skin)
    .replaceAll("{{tier}}", tier.name)
    .replaceAll("{{hours}}", stats.hours)
    .replaceAll("{{late_night}}", stats.lateNight)
    .replaceAll("{{weekend}}", weekend)
    .replaceAll("{{streak}}", stats.streak)
    .replaceAll("{{tokens}}", formatTokens(stats.tokens, locale))
    .replaceAll("{{longest}}", stats.longest)
    .replaceAll("{{peak_day}}", peakLabel(stats, locale))
    .replaceAll("{{template}}", locale.templateName[opts.template] || opts.template);
}
