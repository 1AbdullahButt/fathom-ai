// Ask across meetings (PLAN.md P2-4, SPEC §2 stretch, §7 "budget" eval).
// Retrieval first: keyword overlap picks candidate segments. Nothing relevant means the exact
// sentinel without an LLM call. Otherwise one JSON LLM call answers only from those segments,
// citing segment ids per claim; lib/askFilter.ts then enforces citations, dedupe, no hedged
// "commitments" and a 3-sentence cap in code.
import { completeJSON } from "./llm";
import { formatTimestamp } from "./time";
import { filterClaims, MAX_CLAIMS, MAX_WORDS, NOT_FOUND, type RawClaim } from "./askFilter";
import { stem, terms } from "./terms";
import type { Meeting, Segment } from "./types";

export { NOT_FOUND };

export interface AskCitation {
  meeting_id: string;
  segment_id: string;
}

export interface AskClaim {
  text: string;
  citations: AskCitation[];
}

export interface AskResult {
  answer: string;
  citations: AskCitation[];
  /** The answer split into sentences, each with its own citations (for per-sentence quote chips). */
  claims?: AskClaim[];
}

type Corpus = { meeting: Meeting; segments: Segment[] }[];

export const MAX_QUESTION_CHARS = 300;
const MAX_CONTEXT_SEGMENTS = 40;
const TOP_HITS = 12;
const MAX_SEGMENT_CHARS = 600;

export { stem, terms };

export interface Candidate {
  meeting: Meeting;
  segment: Segment;
  speaker: string;
  score: number;
}

/** Neighbour offsets added around each hit, nearest first (a figure is often a line or two away). */
const NEIGHBOUR_OFFSETS = [-1, 1, -2, 2, -3, 3];

/**
 * Segments that share content terms with the question, best first, plus up to three lines either
 * side for context (a reply often needs the line before it, and "remember the budget" often
 * follows the line that states the figure). The speaker's name counts as
 * part of the segment, so "What did Omar say" finds Omar's lines. Empty when nothing matches.
 */
export function retrieve(question: string, corpus: Corpus, limit = MAX_CONTEXT_SEGMENTS): Candidate[] {
  const q = [...new Set(terms(question))];
  if (q.length === 0) return [];

  const rows: (Candidate & { termSet: Set<string>; index: number; group: number })[] = [];
  corpus.forEach(({ meeting, segments }, group) => {
    const names = new Map(meeting.speakers.map((s) => [s.id, s.name]));
    segments.forEach((segment, index) => {
      const speaker = names.get(segment.speaker_id) ?? "Unknown speaker";
      const termSet = new Set(terms(`${speaker} ${segment.text}`));
      rows.push({ meeting, segment, speaker, score: 0, termSet, index, group });
    });
  });
  if (rows.length === 0) return [];

  // Inverse document frequency: rare words weigh more than words said in every other line.
  const idf = new Map<string, number>();
  for (const t of q) {
    const df = rows.reduce((n, r) => n + (r.termSet.has(t) ? 1 : 0), 0);
    idf.set(t, df === 0 ? 0 : Math.log(1 + rows.length / df));
  }
  for (const r of rows) r.score = q.reduce((s, t) => s + (r.termSet.has(t) ? idf.get(t)! : 0), 0);

  const hits = rows.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, TOP_HITS);
  if (hits.length === 0) return [];

  const chosen = new Set<(typeof rows)[number]>(hits);
  const byPos = new Map(rows.map((r) => [`${r.group}:${r.index}`, r]));
  // Nearest neighbours of every hit first, then wider ones, so every hit gets some context.
  for (const d of NEIGHBOUR_OFFSETS) {
    for (const h of hits) {
      if (chosen.size >= limit) break;
      const n = byPos.get(`${h.group}:${h.index + d}`);
      if (n) chosen.add(n);
    }
  }
  return [...chosen]
    .sort((a, b) => a.group - b.group || a.index - b.index)
    .map(({ meeting, segment, speaker, score }) => ({ meeting, segment, speaker, score }));
}

const notFound = (): AskResult => ({ answer: NOT_FOUND, citations: [], claims: [] });

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

const SYSTEM = `You answer questions about recorded meetings using ONLY the transcript lines given.
Each line starts with its id in square brackets.
Rules:
- Use only what the lines say. No outside knowledge, no guesses, no inference beyond the words.
- Every claim must cite the id(s) of the line(s) that directly support it.
- Lines next to each other in the same meeting are consecutive: read them together as context.
- If the lines discuss what the question asks about, answer with what they say about it (figures, limits, decisions, who said what), citing those lines, even when they answer only part of the question.
- Set "found" to false and return no claims only when no line says anything about it. A line that uses the same word in an unrelated sense is not an answer.
- At most ${MAX_CLAIMS} short sentences, ${MAX_WORDS} words in total. Plain sentences, no markdown.
- Never repeat a point: each claim says something the others do not. Cite every supporting line on that one claim instead.
- A suggestion or idea ("we should probably", "maybe", "at some point", "it would be nice") is NOT a commitment, promise or action item. Only first-person agreement ("I'll", "I will", "sure", "by Thursday") is a commitment.
Return JSON: {"found": true|false, "claims": [{"text": "one sentence", "citations": ["<line id>", ...]}]}`;

/**
 * Answer only from cited segments; no supporting segments means
 * answer exactly "not found in meetings" with citations [].
 */
export async function ask(question: string, corpus: Corpus): Promise<AskResult> {
  const q = question.trim().slice(0, MAX_QUESTION_CHARS);
  if (!q) return notFound();
  const candidates = retrieve(q, corpus);
  if (candidates.length === 0) return notFound();

  const lines = candidates.map(
    (c) =>
      `[${c.segment.id}] ${c.meeting.title} (${c.meeting.date}) · ${c.speaker} · ${formatTimestamp(c.segment.start_s)}: ${clip(c.segment.text, MAX_SEGMENT_CHARS)}`,
  );
  const top = [...candidates].sort((a, b) => b.score - a.score)[0];

  const raw = (await completeJSON({
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Transcript lines:\n${lines.join("\n")}\n\nQuestion: ${q}` },
    ],
    // LLM_MOCK (e2e): answer from the best-matching line so the UI path is exercised.
    mock: () => ({
      found: true,
      claims: [{ text: `${top.speaker} said: “${clip(top.segment.text, 160)}”`, citations: [top.segment.id] }],
    }),
  })) as { found?: unknown; claims?: unknown };

  if (raw?.found === false || !Array.isArray(raw?.claims)) return notFound();
  const claims: RawClaim[] = [];
  for (const c of raw.claims as unknown[]) {
    const item = c as { text?: unknown; citations?: unknown };
    if (typeof item?.text !== "string" || !Array.isArray(item.citations)) continue;
    claims.push({ text: item.text, citations: item.citations.filter((id): id is string => typeof id === "string") });
  }
  const retrieved = new Map(
    candidates.map((c) => [c.segment.id, { meeting_id: c.meeting.id, text: c.segment.text }]),
  );
  return filterClaims(q, claims, retrieved);
}
