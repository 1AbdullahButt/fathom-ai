// Chapters (SPEC §2 item 8): one LLM call over a compact transcript returns [{title, start_s}].
// The model's start times are never trusted: each is snapped to the nearest real segment start,
// invalid entries are dropped, the first chapter starts at 0, and the count is kept in a range
// that fits the meeting length.
import { completeJSON, type ChatMessage } from "./llm";
import { formatTimestamp } from "./time";
import type { Chapter, Segment, Speaker } from "./types";

/** Below this length a meeting gets no chapters (nothing to navigate). */
export const MIN_CHAPTER_MEETING_S = 5 * 60;
const MAX_TITLE = 60;
/** Transcript budget for the prompt, in characters (fits Groq's free-tier tokens-per-minute cap). */
const PROMPT_CHARS = 12_000;
/** Output cap: prompt + this must stay under the per-minute input-token limit (about 7k). */
const MAX_TOKENS = 2500;

export interface RawChapter {
  title: unknown;
  start_s: unknown;
}

/** How many chapters fit a meeting: 2–4 for 15 minutes, 4–10 for an hour. */
export function chapterRange(duration_s: number): { min: number; max: number } {
  const min = duration_s / 60;
  return { min: Math.max(2, Math.round(min / 15)), max: Math.min(10, Math.max(4, Math.round(min / 6))) };
}

/** Index of the segment whose start is closest to t (segments sorted by start). */
function nearestStart(segments: Segment[], t: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start_s < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(segments[lo - 1].start_s - t) <= Math.abs(segments[lo].start_s - t)) return lo - 1;
  return lo;
}

function cleanTitle(t: unknown): string | null {
  if (typeof t !== "string") return null;
  const s = t.replace(/\s+/g, " ").trim().replace(/[.:;,]+$/, "");
  if (!s) return null;
  return s.length > MAX_TITLE ? s.slice(0, MAX_TITLE - 1).trimEnd() + "…" : s;
}

/**
 * Validate model output against the transcript. Pure.
 * - start_s must be a number inside the meeting; it is snapped to the nearest segment start.
 * - Two chapters on the same segment: the first one wins.
 * - The first chapter starts at 0.
 * - Too many: the shortest chapters are merged into the one before them until it fits.
 * - Fewer than two usable chapters: [] (a single chapter navigates nowhere).
 */
export function validateChapters(raw: unknown, segments: Segment[], meetingId: string, duration_s: number): Chapter[] {
  if (!segments.length || !Array.isArray(raw)) return [];
  const sorted = [...segments].sort((a, b) => a.start_s - b.start_s);
  const end = Math.max(duration_s, sorted.at(-1)!.end_s);
  const byIndex = new Map<number, string>();
  for (const r of raw as RawChapter[]) {
    if (!r || typeof r !== "object") continue;
    const title = cleanTitle(r.title);
    const t = typeof r.start_s === "string" ? Number(r.start_s) : r.start_s;
    if (!title || typeof t !== "number" || !Number.isFinite(t) || t < 0 || t > end) continue;
    const i = nearestStart(sorted, t);
    if (!byIndex.has(i)) byIndex.set(i, title);
  }
  let chapters = [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, title]) => ({ meeting_id: meetingId, title, start_s: sorted[i].start_s }));
  if (chapters.length < 2) return [];
  chapters[0] = { ...chapters[0], start_s: 0 };

  const { max } = chapterRange(end);
  while (chapters.length > max) {
    // Drop the start of the shortest chapter after the first (it merges into the previous one).
    let shortest = 1;
    let len = Infinity;
    for (let k = 1; k < chapters.length; k++) {
      const l = (chapters[k + 1]?.start_s ?? end) - chapters[k].start_s;
      if (l < len) {
        len = l;
        shortest = k;
      }
    }
    chapters = chapters.filter((_, k) => k !== shortest);
  }
  return chapters;
}

/**
 * The transcript as "[m:ss] X: text" lines, where X is a short speaker label (legend first).
 * When that is over the prompt budget (long meetings), consecutive segments are grouped into
 * blocks of a few tens of seconds, each stamped with its first segment's start and cut to an
 * even share of the budget: chapters need topics, not every word.
 */
export function compactTranscript(segments: Segment[], speakers: Speaker[]): string {
  const label = new Map(speakers.map((s, i) => [s.id, String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "")]));
  const legend = speakers.map((s) => `${label.get(s.id)} = ${s.name}`).join("\n");
  const lbl = (id: string) => label.get(id) ?? id;
  const clean = (t: string) => t.replace(/\s+/g, " ").trim();
  const full = segments.map((s) => `[${formatTimestamp(s.start_s)}] ${lbl(s.speaker_id)}: ${clean(s.text)}`);
  if (full.reduce((n, l) => n + l.length + 1, 0) <= PROMPT_CHARS) return `Speakers:\n${legend}\n\n${full.join("\n")}`;

  const maxBlocks = Math.max(10, Math.floor(PROMPT_CHARS / 90));
  const span = segments.at(-1)!.start_s - segments[0].start_s;
  const gap = span / maxBlocks;
  const blocks: Segment[][] = [];
  for (const s of segments) {
    const cur = blocks.at(-1);
    if (cur && s.start_s - cur[0].start_s < gap) cur.push(s);
    else blocks.push([s]);
  }
  const per = Math.max(40, Math.floor(PROMPT_CHARS / blocks.length) - 12);
  const lines = blocks.map((b) => {
    const text = b.map((s) => `${lbl(s.speaker_id)}: ${clean(s.text)}`).join(" / ");
    return `[${formatTimestamp(b[0].start_s)}] ${text.length > per ? text.slice(0, per - 1).trimEnd() + "…" : text}`;
  });
  return `Speakers:\n${legend}\n\n${lines.join("\n")}`;
}

function buildMessages(segments: Segment[], speakers: Speaker[], duration_s: number): ChatMessage[] {
  const { min, max } = chapterRange(duration_s);
  const system = `You split a meeting transcript into chapters for navigation.
Return ONLY a JSON object: {"chapters":[{"title":string,"start_s":number}]}
Rules:
- ${min} to ${max} chapters, in time order, covering the whole meeting. The first starts at 0.
- start_s is the time in seconds where the topic starts: take it from the [m:ss] or [h:mm:ss] stamp of the transcript line where that topic begins (e.g. [12:05] is 725).
- A new chapter only where the topic really changes, not on every speaker change.
- title: 2 to 6 words naming the topic, in sentence case, plain words from the meeting (e.g. "Budget for the pilot", "Public comment"). No numbering, no timestamps, no ending period.
- Use only what is in the transcript.`;
  const user = `Meeting length: ${formatTimestamp(duration_s)} (${Math.round(duration_s)} s).
Transcript (long passages are shortened; each line starts with the time it begins):
${compactTranscript(segments, speakers)}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Evenly spaced placeholder chapters at real segment starts (LLM_MOCK only). */
function mockChapters(duration_s: number): { chapters: RawChapter[] } {
  const { min } = chapterRange(duration_s);
  const n = Math.max(2, min);
  return { chapters: Array.from({ length: n }, (_, k) => ({ title: `Part ${k + 1}`, start_s: (duration_s * k) / n })) };
}

/**
 * Generate chapters for a meeting. Returns [] for short meetings or unusable output; throws only
 * on provider errors (callers treat that as "no chapters").
 */
export async function generateChapters(meetingId: string, segments: Segment[], speakers: Speaker[], duration_s: number): Promise<Chapter[]> {
  const sorted = [...segments].sort((a, b) => a.start_s - b.start_s);
  const span = Math.max(duration_s, sorted.at(-1)?.end_s ?? 0);
  if (!sorted.length || span < MIN_CHAPTER_MEETING_S) return [];
  const messages = buildMessages(sorted, speakers, span);
  const data = (await completeJSON({ messages, mock: () => mockChapters(span), maxTokens: MAX_TOKENS })) as { chapters?: unknown } | null;
  return validateChapters(data?.chapters, sorted, meetingId, span);
}
