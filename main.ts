// Charm the Commuter: Forecast a City That Isn't
// -------------------------------------------------
// A deterministic one-liner picker.
//
// The brief asks for one line of weather (at most 140 characters) for a
// city that does not exist, judged by a bored commuter who picks the line
// that makes them smile. The judge weighs, most important first:
//   1. reads as a one-line forecast for an invented city, weather the point
//   2. makes a bored commuter smile on one reading
//   3. keeps the register of a real forecast, broadcast rhythm bent not dropped
//   4. one concrete detail of the city's weather or life
//   5. uses its 140 characters well, every word earning its place
//
// This program hand-writes a set of candidate lines, scores each one
// against those five criteria in exactly that order (a lexicographic
// comparison, so a difference on an earlier criterion always beats any
// number of differences on later ones, as the brief instructs), and
// writes the winner to $MAKEFUN_OUTPUT_DIR/entry.txt
// (falling back to /output/entry.txt). It then reads the file back and
// verifies it byte-for-byte against every gate: UTF-8 text, 1 to 140
// characters, not only white space, exactly one line.
//
// Revision notes (second pass over the first build):
//   * Four new hand-written candidates (Natterford, Splott, Puddleton,
//     Brollywick), each written to challenge the winner on the early
//     criteria rather than to pad the field.
//   * Freshness: a punch phrase told by two candidates earns only half
//     points in each of them. The leaking-bus-shelter joke appears in
//     two lines of the first build; the second telling is stale, so the
//     scorer now says so instead of rewarding the repeat.
//   * Stale references: a dated gag ("light a cigarette") is penalised
//     in the smile score. The brief says quirkiness for its own sake
//     does not count, and a smoking-at-the-bus-stop joke dates the line.
//   * The "Again." kicker only counts when the line already carries a
//     real punch phrase: a trailing "Again." punctuates a joke, it is
//     not a joke on its own.
//   * The register list gains "sunny intervals", a genuine broadcast
//     phrase the first build missed, and the detail patterns gain the
//     swan, the station announcer, umbrellas and a bus running on time.
//   * Tie-breaks now prefer the line whose punch is freshest (fewest
//     punch phrases shared with another candidate) before preferring
//     the tighter line, then the earlier candidate.
//
// Node 22 standard library only. No network, no randomness, no clock:
// two runs on the same machine produce the same file.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ---------------------------------------------------------------------------
// Candidates: sixteen hand-written one-liners. Every city is invented, every
// line is ASCII (so characters, code points and bytes all agree), and every
// line is written to read as a broadcast forecast with one commuter joke.
// ---------------------------------------------------------------------------

const CANDIDATES: string[] = [
  // 0
  "In Zembleton today: light drizzle, 14 degrees, and the 8:04 bus will be exactly four minutes late, as tradition demands.",
  // 1
  "Good morning, Crumblewick: sunny spells, a 40% chance of showers, and the pigeons have already claimed the dry seats at the bus stop.",
  // 2
  "Mizzlewick wakes to fog and a high of 12, with the morning commute delayed by ducks crossing at the lights. Again.",
  // 3
  "In Fumbleport, expect scattered showers and a strong chance your umbrella turns inside out before the 7:52 arrives.",
  // 4
  "Wobbleford today: overcast, 11 degrees, light rain, and the station clock running three minutes fast just to keep you honest.",
  // 5
  "Sunny intervals over Dribbleton this morning, but the 8:15 is cancelled because the driver saw his shadow and went back to bed.",
  // 6
  "In Snorlington, a high of 9 and drizzle all day; the bus shelter leaks in exactly the spot where you always stand.",
  // 7
  "Bumblewick forecast: patchy rain, gusty winds, and a 90 percent chance the person next to you is eating a sausage roll.",
  // 8
  "Good morning, Tangleford: grey skies, light rain, and the tram doors will open on the wrong side. Mind the puddle, not the gap.",
  // 9
  "In Drizzlewick, expect a high of 13 and rain until noon; the bus shelter finally has a roof, though it leaks in exactly your spot.",
  // 10
  "In Quibbleton, cloudy with sunny spells and a 100 percent chance the bus arrives the moment you light a cigarette. It always does.",
  // 11
  "Frogmorton today: heavy showers, 10 degrees, and the ducks have right of way at every crossing. Commuters, please wait your turn.",
  // 12 — new: the swan holds up the bus, and the swan is in no hurry.
  "In Natterford, rain and showers, a high of 12; the 7:58 is cancelled because a swan is on the crossing, and it is not moving.",
  // 13 — new: the announcer has run out of forecast and out of patience.
  "Good morning, Splott: heavy rain, grey skies, 9 degrees, and the station announcer has given up and is just saying 'wet' now.",
  // 14 — new: punctuality so rare nobody trusts it.
  "In Puddleton, rain and drizzle all morning, a high of 12; the 8:20 bus is on time for once, so nobody at the stop believes it.",
  // 15 — new: the locals forecast by sky, not by timetable.
  "In Brollywick today: showers, 13 degrees, and the umbrellas are out before the rain, as the locals read the sky like a timetable.",
];

// The invented city each candidate names, in the same order.
const CITIES: string[] = [
  "Zembleton",
  "Crumblewick",
  "Mizzlewick",
  "Fumbleport",
  "Wobbleford",
  "Dribbleton",
  "Snorlington",
  "Bumblewick",
  "Tangleford",
  "Drizzlewick",
  "Quibbleton",
  "Frogmorton",
  "Natterford",
  "Splott",
  "Puddleton",
  "Brollywick",
];

// ---------------------------------------------------------------------------
// Scoring. Each criterion returns 0-10. Criteria are compared in the
// brief's order, most important first; the final tie-break prefers the
// freshest punch, then the tighter line (fewer characters), then the
// earlier candidate, so the result is fully deterministic.
// ---------------------------------------------------------------------------

const WEATHER_TERMS: string[] = [
  "drizzle", "rain", "showers", "fog", "overcast", "sunny", "wind",
  "degrees", "snow", "sleet", "hail", "cloudy", "clearing", "storm",
  "grey skies",
];

// Stock phrases of a broadcast forecast: the rhythm the brief asks the
// entry to keep, bent rather than dropped.
const REGISTER_PHRASES: string[] = [
  "good morning", "today:", "today,", "expect", "sunny spells",
  "sunny intervals", "scattered showers", "chance of", "high of",
  "light drizzle", "heavy showers", "patchy rain", "wakes to",
  "forecast:", "degrees",
];

// The turn of phrase that makes a commuter smile. Each phrase carries
// points; the total is capped, so stuffing two jokes into one line does
// not beat one joke told well. A phrase told by more than one candidate
// earns only half its points in each of them: the second telling of a
// joke is stale, and the scorer should not reward the repeat.
const PUNCH_PHRASES: Array<[string, number]> = [
  ["as tradition demands", 4],
  ["claimed the dry seats", 4],
  ["saw his shadow", 3],
  ["went back to bed", 2],
  ["just to keep you honest", 3],
  ["right of way", 3],
  ["wait your turn", 2],
  ["exactly the spot where you always stand", 3],
  ["exactly your spot", 3],
  ["leaks in exactly", 2],
  ["mind the puddle, not the gap", 3],
  ["eating a sausage roll", 3],
  ["the moment you light a cigarette", 3],
  ["it always does", 2],
  ["turns inside out", 2],
  ["a swan is on the crossing", 3],
  ["it is not moving", 2],
  ["has given up", 2],
  ["just saying 'wet'", 3],
  ["on time for once", 3],
  ["nobody at the stop believes it", 2],
  ["umbrellas are out before the rain", 2],
  ["read the sky like a timetable", 3],
];

// References that date a line: a gag a modern commuter would read as
// stale rather than charming. Each one found costs points in the smile
// score. The brief says quirkiness for its own sake does not count.
const STALE_PHRASES: Array<[string, number]> = [
  ["light a cigarette", 3],
];

// How many candidates tell each punch phrase, computed once from the
// field itself so the freshness rule stays honest as lines are added.
function punchPhraseUseCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [phrase] of PUNCH_PHRASES) {
    let n = 0;
    for (const candidate of CANDIDATES) {
      if (candidate.toLowerCase().includes(phrase)) n++;
    }
    counts.set(phrase, n);
  }
  return counts;
}

const PUNCH_USE = punchPhraseUseCounts();

// Concrete details: a named time, a named number, a named creature, a
// named piece of commuter street furniture, or a stated punctuality.
const DETAIL_PATTERNS: RegExp[] = [
  /\b\d{1,2}:\d{2}\b/, // a bus time: 8:04, 7:52
  /\b\d+\s*(?:percent\b|%)/, // a stated chance: 40%, 90 percent
  /\b(four|three|two|five)\s+minutes?\b/, // a stated delay
  /\b(pigeons|ducks|swan)\b/, // the locals
  /\b(bus stop|bus shelter|station clock|station announcer|tram doors|the lights|every crossing|umbrellas)\b/,
  /\bon time\b/, // a bus running to the timetable, for once
];

function countMatches(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  let n = 0;
  for (const phrase of phrases) {
    if (lower.includes(phrase)) n++;
  }
  return n;
}

function wordsOf(text: string): string[] {
  return text.split(/\s+/).map((w) => w.replace(/[^A-Za-z]/g, ""));
}

// How many of this line's punch phrases are shared with another
// candidate: the freshness measure used by the tie-break.
function sharedPunchCount(text: string): number {
  const lower = text.toLowerCase();
  let n = 0;
  for (const [phrase] of PUNCH_PHRASES) {
    if (lower.includes(phrase) && (PUNCH_USE.get(phrase) ?? 1) > 1) n++;
  }
  return n;
}

// Criterion 1 (0-10): reads as a one-line forecast for an invented city.
// City named up front (4), at least two weather terms (3), a temperature
// or time or stated chance (2), ends as a finished sentence (1).
function scoreForecastShape(text: string, city: string): number {
  const words = wordsOf(text);
  const cityAt = words.indexOf(city);
  let score = 0;
  if (cityAt >= 0 && cityAt < 5) score += 4;
  else if (cityAt >= 0) score += 2;
  const weatherHits = countMatches(text, WEATHER_TERMS);
  if (weatherHits >= 2) score += 3;
  else if (weatherHits === 1) score += 1;
  if (/\b\d{1,2}\s*degrees\b/.test(text) || /\bhigh of \d+/.test(text) ||
      /\b\d{1,2}:\d{2}\b/.test(text) || /\b\d+\s*(?:percent\b|%)/.test(text)) {
    score += 2;
  }
  if (text.endsWith(".")) score += 1;
  return score;
}

// Criterion 2 (0-10): makes a bored commuter smile on one reading.
// A base of 4 for a second clause carrying the joke, plus the punch
// phrases found, capped so one good joke beats two crammed ones. A
// punch phrase shared with another candidate earns half points. A
// trailing "Again." only counts when the line already has a real punch
// phrase to punctuate. Stale references cost points.
function scoreSmile(text: string): number {
  const lower = text.toLowerCase();
  let punch = 0;
  let matchedAny = false;
  for (const [phrase, points] of PUNCH_PHRASES) {
    if (!lower.includes(phrase)) continue;
    matchedAny = true;
    const shared = (PUNCH_USE.get(phrase) ?? 1) > 1;
    punch += shared ? Math.floor(points / 2) : points;
  }
  if (/\bagain\b/.test(lower) && matchedAny) punch += 2;
  let stale = 0;
  for (const [phrase, penalty] of STALE_PHRASES) {
    if (lower.includes(phrase)) stale += penalty;
  }
  return Math.max(0, 4 + Math.min(6, punch) - stale);
}

// Criterion 3 (0-10): keeps the register of a real forecast.
function scoreRegister(text: string): number {
  return Math.min(10, 2 * countMatches(text, REGISTER_PHRASES));
}

// Criterion 4 (0-10): one concrete detail of the city's weather or life.
// One detail is enough; a second confirms it, a third adds nothing.
function scoreDetail(text: string): number {
  let hits = 0;
  for (const pattern of DETAIL_PATTERNS) {
    if (pattern.test(text)) hits++;
  }
  return 5 * Math.min(2, hits);
}

// Criterion 5 (0-10): uses its 140 characters well. The sweet spot is a
// full but not crammed line; a line that stops far short wastes the room,
// and one squeezed against the limit reads cramped.
function scoreEconomy(text: string): number {
  const len = [...text].length;
  if (len >= 100 && len <= 138) return 10;
  if (len >= 80 && len <= 99) return 8;
  if (len >= 139 && len <= 140) return 8;
  if (len >= 60 && len <= 79) return 6;
  return 4;
}

interface Scored {
  index: number;
  text: string;
  criteria: [number, number, number, number, number];
}

function scoreAll(): Scored[] {
  const scored: Scored[] = [];
  for (let i = 0; i < CANDIDATES.length; i++) {
    const text = CANDIDATES[i];
    const city = CITIES[i];
    scored.push({
      index: i,
      text,
      criteria: [
        scoreForecastShape(text, city),
        scoreSmile(text),
        scoreRegister(text),
        scoreDetail(text),
        scoreEconomy(text),
      ],
    });
  }
  return scored;
}

// Compare two scored candidates the way the brief tells the judge to:
// go through the criteria in order, let the first difference decide.
// Final tie-break: the fresher punch (fewer punch phrases shared with
// another candidate), then the tighter line (fewer characters), then
// the earlier candidate, so the pick is deterministic.
function compareScored(a: Scored, b: Scored): number {
  for (let k = 0; k < 5; k++) {
    if (a.criteria[k] !== b.criteria[k]) return b.criteria[k] - a.criteria[k];
  }
  const sharedDiff = sharedPunchCount(a.text) - sharedPunchCount(b.text);
  if (sharedDiff !== 0) return sharedDiff;
  const lenDiff = [...a.text].length - [...b.text].length;
  if (lenDiff !== 0) return lenDiff;
  return a.index - b.index;
}

// ---------------------------------------------------------------------------
// Gates: the sealed scorer's rules, re-checked here before we call the
// entry done. A candidate that fails any gate never wins.
// ---------------------------------------------------------------------------

function passesGate(text: string): boolean {
  if (typeof text !== "string") return false;
  const chars = [...text]; // code points, so "characters" means characters
  if (chars.length < 1 || chars.length > 140) return false;
  if (text.trim().length === 0) return false; // not only white space
  if (text.includes("\n") || text.includes("\r")) return false; // one line
  return true;
}

function main(): void {
  const scored = scoreAll();

  // The gate comes first: an over-long or multi-line candidate is out,
  // however charming it is.
  const valid = scored.filter((s) => passesGate(s.text));
  if (valid.length === 0) {
    throw new Error("no candidate passes the gate");
  }

  valid.sort(compareScored);
  const winner = valid[0];

  // Print the table so a human can see why this line won.
  for (const s of valid) {
    const marker = s === winner ? " <-- winner" : "";
    console.log(
      `#${s.index} [${s.criteria.join(", ")}] (${[...s.text].length} chars) ${s.text}${marker}`,
    );
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");

  // Write exactly the winning line: no trailing newline, so the file is
  // one line and its character count is the line's character count.
  writeFileSync(outPath, winner.text, "utf8");

  // Read it back and verify byte-for-byte against every gate.
  const back = readFileSync(outPath, "utf8");
  if (back !== winner.text) {
    throw new Error("read-back differs from the winning line");
  }
  if (!passesGate(back)) {
    throw new Error("written entry fails the gate");
  }
  // The output directory is expected to hold only the entry.
  void dirname(outPath);

  console.log(`wrote ${outPath} (${[...back].length} characters)`);
}

main();
