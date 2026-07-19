import { claudeCodeAvailable, collectClaudeCode } from "./claude-code.js";

// Phase 1: only claude-code. New tools = one adapter returning RawEvent[].
const ADAPTERS = [
  { tool: "claude-code", available: claudeCodeAvailable, collect: collectClaudeCode },
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
