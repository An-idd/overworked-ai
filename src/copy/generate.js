import { execFileSync } from "node:child_process";

// Extract the first balanced {...} JSON object from CLI output (it may wrap
// the JSON in prose/markdown fences despite instructions).
function extractJson(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

function valid(o) {
  return o && o.title && o.bubble && Array.isArray(o.complaints) &&
    o.complaints.length >= 3 && o.fun_fact && o.sign_off;
}

function callCli(bin, prompt) {
  const args = bin === "claude" ? ["-p", prompt] : ["exec", prompt];
  return execFileSync(bin, args, { encoding: "utf8", timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
}

// Shell out to the user's local claude / codex to write the copy. Retries once
// with a stricter suffix. Returns parsed JSON, or null so caller uses fallback.
export function generateCopy(prompt, bin = "claude") {
  for (const p of [prompt, prompt + "\n\n严格只输出 JSON,不要任何其它文字、不要代码块标记。"]) {
    try {
      const out = callCli(bin, p);
      const json = extractJson(out);
      if (valid(json)) return json;
    } catch {
      return null; // bin missing or timed out — fallback handles it
    }
  }
  return null;
}
