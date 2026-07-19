// RawEvent[] → WeeklyStats. Time uses LOCAL clock (that's when the human worked).
const GAP_MS = 15 * 60 * 1000; // ponytail: 15min idle splits an "active" run; tune if it feels off

// Monday 00:00 local of the ISO week containing `ref`.
function weekStart(ref) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return d;
}

export function isoWeekLabel(ref) {
  // ISO week number for card filename (2026-W29).
  const d = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function aggregate(events, ref = new Date()) {
  const start = weekStart(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Global daily streak (all history) — consecutive active days ending at the
  // most recent active day. Drives the full-attendance (30-day) trigger.
  const allDays = [...new Set(events.map((e) => e.ts.toISOString().slice(0, 10)))].sort();
  let dailyStreak = allDays.length ? 1 : 0;
  for (let i = allDays.length - 1; i > 0; i--) {
    if (Date.parse(allDays[i]) - Date.parse(allDays[i - 1]) === 86400000) dailyStreak++;
    else break;
  }

  const week = events
    .filter((e) => e.ts >= start && e.ts < end)
    .sort((a, b) => a.ts - b.ts);

  if (week.length === 0) {
    return { empty: true, weekLabel: isoWeekLabel(ref), weekStartISO: iso(start), dailyStreak, start, end };
  }

  // Active time + longest continuous run (chain of <15min gaps).
  let activeMs = 0, longestMs = 0, runMs = 0;
  for (let i = 1; i < week.length; i++) {
    const gap = week[i].ts - week[i - 1].ts;
    if (gap < GAP_MS) { activeMs += gap; runMs += gap; }
    else { longestMs = Math.max(longestMs, runMs); runMs = 0; }
  }
  longestMs = Math.max(longestMs, runMs);

  // Late-night: distinct sessions touching 0–5am local.
  const lateSessions = new Set();
  let weekend = false;
  const tokensByDay = new Map(); // yyyy-mm-dd -> tokens
  let tokens = 0;
  const activeDays = new Set();
  for (const e of week) {
    const h = e.ts.getHours();
    if (h >= 0 && h < 5) lateSessions.add(e.sessionId);
    const dow = e.ts.getDay();
    if (dow === 0 || dow === 6) weekend = true;
    const key = e.ts.toISOString().slice(0, 10);
    tokens += e.tokens;
    tokensByDay.set(key, (tokensByDay.get(key) || 0) + e.tokens);
    activeDays.add(key);
  }

  // Dominant tool this week (by tokens) → picks the default mascot skin.
  const toolTok = {};
  for (const e of week) toolTok[e.tool] = (toolTok[e.tool] || 0) + e.tokens;
  let dominantTool = null, maxTok = -1;
  for (const [t, v] of Object.entries(toolTok)) if (v > maxTok) { maxTok = v; dominantTool = t; }

  // Peak day = most tokens.
  let peakKey = null, peakTokens = -1;
  for (const [k, v] of tokensByDay) if (v > peakTokens) { peakTokens = v; peakKey = k; }
  const peakDate = new Date(peakKey + "T00:00:00");

  // Streak: consecutive active days ending at the last active day.
  const days = [...activeDays].sort();
  let streak = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const cur = new Date(days[i] + "T00:00:00");
    const prev = new Date(days[i - 1] + "T00:00:00");
    if ((cur - prev) === 86400000) streak++; else break;
  }

  return {
    empty: false,
    weekLabel: isoWeekLabel(ref),
    weekStartISO: iso(start),
    dailyStreak,
    dominantTool,
    hours: +(activeMs / 3600000).toFixed(1),
    lateNight: lateSessions.size,
    weekend,
    streak,
    tokens,
    longest: +(longestMs / 3600000).toFixed(1),
    peakDay: `${peakDate.getMonth() + 1}/${peakDate.getDate()}`, // language-neutral; weekday added at render
    peakDow: peakDate.getDay(),
  };
}
