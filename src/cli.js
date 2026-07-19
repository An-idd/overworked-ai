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
// Default mascot per dominant tool; --skin overrides.
const SKIN_BY_TOOL = { "claude-code": "xiaoke", codex: "xiaodex" };

const { values: o } = parseArgs({
  options: {
    lang: { type: "string", default: "zh" },
    skin: { type: "string" }, // omit = auto by dominant tool
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

  // best-employer is judged on LAST week's rested weekend (needs accumulated data).
  const prevRef = new Date(ref); prevRef.setDate(prevRef.getDate() - 7);
  const prevStats = aggregate(events, prevRef);
  stats.prevWeek = prevStats.empty ? { empty: true } : { empty: false, hours: prevStats.hours, weekend: prevStats.weekend };

  // Same week re-run keeps the SAME card (data may change, template shouldn't).
  // Locked at first generation; --template still forces a different one.
  const weekKey = stats.weekLabel;
  const locked = state.weeks?.[weekKey];
  o.skin = o.skin || locked?.skin || SKIN_BY_TOOL[stats.dominantTool] || "xiaoke";
  const earned = new Set(Object.keys(state.cards).filter((id) => state.cards[id].earned));
  const { chosen, fired } = selectCard(stats, { template: o.template || locked?.card, lang: o.lang, earned });

  // best-employer celebrates last week → render it with last week's numbers.
  const renderStats = chosen.id === "best-employer" && !prevStats.empty ? prevStats : stats;
  const renderTier = renderStats === stats ? tier : tierOf(renderStats);

  let copy = null;
  if (!o["no-ai"]) {
    process.stderr.write("让你的 AI 亲笔写投诉中(调用 claude -p)...\n");
    copy = generateCopy(buildPrompt(locale, renderStats, renderTier, o, chosen), "claude");
  }
  if (!copy) copy = fallbackCopy(locale, renderStats, renderTier, chosen);

  const svg = await fillTemplate({
    template: chosen.id, lang: o.lang, skin: o.skin, locale, copy, stats: renderStats, tier: renderTier, card: chosen, todayISO,
  });
  const outPath = `${o.out.replace(/\/$/, "")}/${stats.weekLabel}.png`;
  await exportPng(svg, outPath);
  await exportPng(svg, thumbPath(chosen.id), 320); // album thumbnail

  // Endowment freebie on first ever run.
  if (isFirstRun(state)) await seedFirstRun(state, todayISO);

  // First generation of this week: count it, advance streak, lock the card.
  // Re-run (locked): just refresh the image with new data — no count/streak bump.
  let streakReset = false;
  if (!locked) {
    state.weeks = state.weeks || {};
    state.weeks[weekKey] = { card: chosen.id, skin: o.skin };
    streakReset = await recordCard(state, { id: chosen.id, weekStartISO: stats.weekStartISO, todayISO });
  }
  // Always unlock any fired rares into the album, even on a refresh (data grew).
  for (const c of fired) if (c.id !== chosen.id) await markEarned(state, c.id, todayISO);
  const p = progress(state);

  console.log(`\n过劳等级:${renderTier.name} ${renderTier.stars}`);
  console.log(`${locked ? "本周已出过,已用最新数据刷新" : "卡片已生成"} → ${outPath}  [${chosen.rarity} · ${chosen.zh}]`);
  // 只触发一次:只宣告本次新解锁的稀有卡(已收集过的不再刷屏)。
  for (const c of fired) {
    if (earned.has(c.id)) continue;
    const art = renderable(c.id, svgLangOf(o.lang)) ? "" : "(卡面制作中)";
    console.log(`🎉 稀有卡解锁:${c.zh} ${c.rarity}${art}`);
  }
  console.log(`已收集 ${p.earned}/${p.total} 张 · 连续出卡 ${state.streak_weeks} 周`);
  if (streakReset) console.log("(上周没出卡,连击归零了~ 没事,这周继续攒)");
  console.log(locked ? "(同周刷新:只更新了数据/文案,收集数不变)" : "晒出去吧,老板 🫡");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
