import { claudeCodeAvailable, collectClaudeCode } from "./claude-code.js";
import { codexAvailable, collectCodex } from "./codex.js";

// One adapter per tool, each returning a unified RawEvent[]. New tools = add here.
const ADAPTERS = [
  { tool: "claude-code", available: claudeCodeAvailable, collect: collectClaudeCode },
  { tool: "codex", available: codexAvailable, collect: collectCodex },
];

export function detectTools() {
  return ADAPTERS.filter((a) => a.available()).map((a) => a.tool);
}

export async function collectAll() {
  const events = [];
  for (const a of ADAPTERS) {
    if (a.available()) events.push(...(await a.collect()));
  }
  return events;
}
