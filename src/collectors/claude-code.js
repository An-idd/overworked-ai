import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Reads ~/.claude/projects/**/*.jsonl (one file = one session) and returns
// RawEvent[]: { ts: Date, sessionId, tokens }. Only assistant messages carry
// usage; user/attachment lines still count as activity for time spans.
export const CLAUDE_DIR = join(homedir(), ".claude", "projects");

export function claudeCodeAvailable() {
  return existsSync(CLAUDE_DIR);
}

function tokensOf(usage) {
  if (!usage) return 0;
  return (usage.input_tokens || 0) + (usage.output_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
}

export async function collectClaudeCode() {
  if (!claudeCodeAvailable()) return [];
  const events = [];
  const projects = await readdir(CLAUDE_DIR, { withFileTypes: true });
  for (const p of projects) {
    if (!p.isDirectory()) continue;
    const dir = join(CLAUDE_DIR, p.name);
    let files;
    try { files = await readdir(dir); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue;
      let text;
      try { text = await readFile(join(dir, f), "utf8"); } catch { continue; }
      const sessionId = f.replace(/\.jsonl$/, "");
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        let o;
        try { o = JSON.parse(line); } catch { continue; }
        if (!o.timestamp) continue;
        const ts = new Date(o.timestamp);
        if (Number.isNaN(ts.getTime())) continue;
        events.push({ ts, sessionId, tokens: tokensOf(o.message && o.message.usage), tool: "claude-code" });
      }
    }
  }
  return events;
}
