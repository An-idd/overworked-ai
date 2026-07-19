#!/usr/bin/env node
import { parseArgs } from "node:util";
import { collectAll, detectTools } from "./collectors/index.js";
import { aggregate } from "./stats/aggregate.js";
import { tierOf } from "./stats/tier.js";
import { loadLocale, buildPrompt } from "./copy/prompt.js";
import { generateCopy } from "./copy/generate.js";
import { fallbackCopy } from "./copy/fallback.js";
import { fillTemplate } from "./render/template.js";
import { exportPng } from "./render/export.js";
import { loadState, isFirstRun, seedFirstRun, recordCard, markEarned, progress, thumbPath } from "./collection/state.js";
import { selectCard, renderable, svgLangOf } from "./cards/select.js";
import { renderAlbum } from "./render/album.js";

const todayISO = new Date().toISOString().slice(0, 10);

const { values: o } = parseArgs({
  options: {
    lang: { type: "string", default: "zh" },
    skin: { type: "string", default: "xiaoke" },
    template: { type: "string" }, // omit = auto-pick by trigger; set = force
    week: { type: "string" },
    out: { type: "string", default: "./cards" },
    list: { type: "boolean", default: false },
    album: { type: "boolean", default: false },
    "no-ai": { type: "boolean", default: false },
  },
});

const ref = o.week ? new Date(o.week) : new Date();

async function main() {
  // --album needs only local collection state, no logs.
  if (o.album) {
    const state = await loadState();
    const locale = await loadLocale(o.lang);
    const svg = await renderAlbum({ state, locale, lang: o.lang });
    const outPath = `${o.out.replace(/\/$/, "")}/album.png`;
    await exportPng(svg, outPath);
    console.log(`集卡册已生成 → ${outPath}`);
    return;
  }

  const tools = detectTools();
  if (tools.length === 0) {
    console.error("没探测到任何 AI 工具日志。Claude Code 日志应在 ~/.claude/projects/");
    process.exit(1);
  }

  const events = await collectAll();
  const stats = aggregate(events, ref);
  const state = await loadState();

  if (o.list) {
    const p = progress(state);
    console.log("检测到工具:", tools.join(", "));
    console.log("本周:", stats.weekLabel);
    console.log(`已收集 ${p.earned}/${p.total} 张 · 连续出卡 ${state.streak_weeks} 周`);
    console.log("可用皮肤: xiaoke, xiaodex");
    console.log("可用模版: arbitration");
    return;
  }

  if (stats.empty) {
    console.error(`本周(${stats.weekLabel})没有活跃记录。用 --week YYYY-MM-DD 指定别的周试试。`);
    process.exit(1);
  }

  const tier = tierOf(stats);
  const locale = await loadLocale(o.lang);
  const { chosen, fired } = selectCard(stats, { template: o.template, lang: o.lang });

  let copy = null;
  if (!o["no-ai"]) {
    process.stderr.write("让你的 AI 亲笔写投诉中(调用 claude -p)...\n");
    copy = generateCopy(buildPrompt(locale, stats, tier, o, chosen), "claude");
  }
  if (!copy) copy = fallbackCopy(locale, stats, tier, chosen);

  const svg = await fillTemplate({
    template: chosen.id, lang: o.lang, skin: o.skin, locale, copy, stats, tier, card: chosen, todayISO,
  });
  const outPath = `${o.out.replace(/\/$/, "")}/${stats.weekLabel}.png`;
  await exportPng(svg, outPath);
  await exportPng(svg, thumbPath(chosen.id), 320); // album thumbnail

  // Endowment freebie on first ever run.
  if (isFirstRun(state)) await seedFirstRun(state, todayISO);
  const earnedBefore = new Set(Object.keys(state.cards).filter((id) => state.cards[id].earned));

  // Record the rendered card; unlock every fired rare into the album (even ones
  // whose card art doesn't exist yet).
  const streakReset = await recordCard(state, { id: chosen.id, weekStartISO: stats.weekStartISO, todayISO });
  for (const c of fired) if (c.id !== chosen.id) await markEarned(state, c.id, todayISO);
  const p = progress(state);

  console.log(`\n过劳等级:${tier.name} ${tier.stars}`);
  console.log(`卡片已生成 → ${outPath}  [${chosen.rarity} · ${chosen.zh}]`);
  for (const c of fired) {
    const isNew = !earnedBefore.has(c.id);
    const art = renderable(c.id, svgLangOf(o.lang)) ? "" : "(卡面制作中)";
    console.log(`🎉 稀有卡${isNew ? "解锁" : "再次触发"}:${c.zh} ${c.rarity}${art}`);
  }
  console.log(`已收集 ${p.earned}/${p.total} 张 · 连续出卡 ${state.streak_weeks} 周`);
  if (streakReset) console.log("(上周没出卡,连击归零了~ 没事,这周继续攒)");
  console.log("晒出去吧,老板 🫡");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
