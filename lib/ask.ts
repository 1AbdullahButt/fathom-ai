// Ask across meetings (PLAN.md P2-4, SPEC §2 stretch, §7 "budget" eval).
// Retrieval first: keyword overlap picks candidate segments. Nothing relevant means the exact
// sentinel without an LLM call. Otherwise one JSON LLM call answers only from those segments,
// citing segment ids per claim; uncited or invalid claims are dropped.
import { completeJSON } from "./llm";
import { formatTimestamp } from "./time";
import type { Meeting, Segment } from "./types";

export const NOT_FOUND = "not found in meetings";

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
const MAX_ANSWER_WORDS = 120;
const MAX_CONTEXT_SEGMENTS = 25;
const TOP_HITS = 12;
const MAX_SEGMENT_CHARS = 600;

// Function words and question scaffolding: they never decide relevance.
const STOPWORDS = new Set(
  (
    "a an the and or but if then so of to in on at by for from with about into over under as is are was were be been being " +
    "am do does did done doing have has had having will would shall should can could may might must " +
    "i me my we us our you your he him his she her it its they them their this that these those there here " +
    "what which who whom whose when where why how whats any anything some something all every each no not " +
    "yes ok okay just also very really much many more most less least than too only own same other " +
    "say said says tell told talk talked discuss discussed mention mentioned meeting meetings call calls " +
    "anyone someone everyone get got let lets know think thing things one ones out up down off again"
  ).split(" "),
);

/** Light suffix stemmer: enough to match budget/budgets, commit/committed, check/checking. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("es") && /(ss|sh|ch|x|z)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  else if (w.length > 4 && w.endsWith("ly")) w = w.slice(0, -2);
  // committ -> commit, plann -> plan
  if (w.length > 4 && /([b-df-hj-np-tv-z])\1$/.test(w) && !/(ll|ss|zz)$/.test(w)) w = w.slice(0, -1);
  return w;
}

/** Content terms of a text: lowercased, split on non-alphanumerics, stopwords removed, stemmed. */
export function terms(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().replace(/['’]s\b/g, "").split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

export interface Candidate {
  meeting: Meeting;
  segment: Segment;
  speaker: string;
  score: number;
}

/**
 * Segments that share content terms with the question, best first, plus their immediate
 * neighbours for context (a reply often needs the line before it). The speaker's name counts as
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
  for (const h of hits) {
    if (chosen.size >= limit) break;
    for (const d of [-1, 1]) {
      const n = byPos.get(`${h.group}:${h.index + d}`);
      if (n && chosen.size < limit) chosen.add(n);
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

function limitWords(claims: AskClaim[], max: number): AskClaim[] {
  const out: AskClaim[] = [];
  let used = 0;
  for (const c of claims) {
    const words = c.text.split(/\s+/).filter(Boolean);
    if (used + words.length > max) {
      const room = max - used;
      if (room >= 5) out.push({ ...c, text: `${words.slice(0, room).join(" ")}…` });
      break;
    }
    out.push(c);
    used += words.length;
  }
  return out;
}

const SYSTEM = `You answer questions about recorded meetings using ONLY the transcript lines given.
Each line starts with its id in square brackets.
Rules:
- Use only what the lines say. No outside knowledge, no guesses, no inference beyond the words.
- Every claim must cite the id(s) of the line(s) that directly support it.
- If the lines do not answer the question, set "found" to false and return no claims. A line that only shares a word with the question is not an answer.
- At most 4 short claims, ${MAX_ANSWER_WORDS} words in total. Plain sentences, no markdown.
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

  const byId = new Map(candidates.map((c) => [c.segment.id, c]));
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
  const claims: AskClaim[] = [];
  for (const c of raw.claims as unknown[]) {
    const item = c as { text?: unknown; citations?: unknown };
    if (typeof item?.text !== "string" || !Array.isArray(item.citations)) continue;
    const text = item.text.replace(/\s+/g, " ").trim();
    if (!text || text.toLowerCase().includes(NOT_FOUND)) continue;
    const ids = [...new Set(item.citations.filter((id): id is string => typeof id === "string" && byId.has(id)))];
    if (ids.length === 0) continue; // uncited (or cited outside the given lines): drop the claim
    claims.push({ text, citations: ids.map((id) => ({ meeting_id: byId.get(id)!.meeting.id, segment_id: id })) });
  }
  const kept = limitWords(claims, MAX_ANSWER_WORDS);
  if (kept.length === 0) return notFound();

  const seen = new Set<string>();
  const citations: AskCitation[] = [];
  for (const c of kept) {
    for (const cit of c.citations) {
      if (seen.has(cit.segment_id)) continue;
      seen.add(cit.segment_id);
      citations.push(cit);
    }
  }
  return { answer: kept.map((c) => c.text).join(" "), citations, claims: kept };
}
