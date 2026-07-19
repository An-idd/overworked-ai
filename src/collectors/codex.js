import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Reads ~/.codex/sessions/**/rollout-*.jsonl (one file = one session) → RawEvent[]:
// { ts, sessionId, tokens }. Every line carries a timestamp (activity spans);
// token usage arrives as periodic "token_count" events whose last_token_usage is
// the PER-TURN delta — summing those reconstructs the session total without the
// double-counting you'd get from the cumulative total_token_usage field.
export const CODEX_DIR = join(homedir(), ".codex", "sessions");

export function codexAvailable() {
  return existsSync(CODEX_DIR);
}

function turnTokens(o) {
  if (o.type !== "event_msg") return 0;
  const p = o.payload;
  if (!p || p.type !== "token_count") return 0;
  return p.info?.last_token_usage?.total_tokens || 0;
}

export async function collectCodex() {
  if (!codexAvailable()) return [];
  const events = [];
  let files;
  try { files = await readdir(CODEX_DIR, { recursive: true }); } catch { return []; }
  for (const rel of files) {
    if (!rel.endsWith(".jsonl") || !rel.includes("rollout-")) continue;
    let text;
    try { text = await readFile(join(CODEX_DIR, rel), "utf8"); } catch { continue; }
    const sessionId = rel.replace(/^.*rollout-/, "").replace(/\.jsonl$/, "");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      if (!o.timestamp) continue;
      const ts = new Date(o.timestamp);
      if (Number.isNaN(ts.getTime())) continue;
      events.push({ ts, sessionId, tokens: turnTokens(o), tool: "codex" });
    }
  }
  return events;
}
