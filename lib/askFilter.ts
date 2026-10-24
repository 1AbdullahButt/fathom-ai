// Ask post-filter: the code-side guarantee on what an Ask answer may contain, applied after the
// LLM call in lib/ask.ts. Pure (no I/O) so it is unit-tested deterministically.
// 1. Every claim cites at least one retrieved segment id (others are dropped).
// 2. Near-duplicate claims collapse into the first one, which takes their citations.
// 3. Hedged suggestions ("we should probably think about dark mode at some point") are never
//    reported as commitments.
// 4. At most MAX_CLAIMS sentences; nothing left means exactly "not found in meetings".
import type { AskCitation, AskClaim, AskResult } from "./ask";
import { terms } from "./terms";

export const NOT_FOUND = "not found in meetings";
export const MAX_CLAIMS = 3;
export const MAX_WORDS = 120;
const DUPLICATE_JACCARD = 0.6;

/** A claim as the model returned it: text plus the segment ids it cites. */
export interface RawClaim {
  text: string;
  citations: string[];
}

/** What the filter needs to know about each retrieved segment. */
export interface RetrievedSegment {
  meeting_id: string;
  text: string;
}

const DAY = "(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tonight|tomorrow|eod|eow|end of (?:the )?(?:day|week|month)|next week|the \\d{1,2}(?:st|nd|rd|th))";
const COMMITMENT = new RegExp(`\\b(?:i'll|i will|i can|we'll|we will|sure|will do)\\b|\\bby ${DAY}\\b`, "i");
const HEDGE = /\b(?:should probably|maybe|at some point|might|could|we should think about|it would be nice)\b/i;
/** The question asks what someone committed to / promised / will do. */
const COMMITMENT_QUESTION = /\b(?:commit\w*|promis\w*|action items?|agree[ds]? to|agreeing to|will do|to-?dos?)\b/i;
/** The claim itself asserts a commitment. */
const COMMITMENT_CLAIM = /\b(?:commit\w*|promis\w*|agreed to|pledged?)\b/i;

const norm = (s: string) => s.replace(/[‘’]/g, "'");

/** A line that only hedges ("should probably ... at some point") and makes no first-person commitment. */
export function isHedgeOnly(text: string): boolean {
  const t = norm(text);
  return HEDGE.test(t) && !COMMITMENT.test(t);
}

export function isCommitmentQuestion(question: string): boolean {
  return COMMITMENT_QUESTION.test(norm(question));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

const isSubset = (a: Set<string>, b: Set<string>) => [...a].every((t) => b.has(t));

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

export function filterClaims(
  question: string,
  raw: RawClaim[],
  retrieved: ReadonlyMap<string, RetrievedSegment>,
): AskResult {
  const commitmentQuestion = isCommitmentQuestion(question);
  const kept: { text: string; ids: string[]; tokens: Set<string> }[] = [];

  for (const claim of raw) {
    const text = claim.text.replace(/\s+/g, " ").trim();
    if (!text || text.toLowerCase().includes(NOT_FOUND)) continue;
    const ids = [...new Set(claim.citations.filter((id) => retrieved.has(id)))];
    if (ids.length === 0) continue; // uncited, or cited outside the retrieved lines

    const onlyHedged = ids.every((id) => isHedgeOnly(retrieved.get(id)!.text));
    if (onlyHedged && (commitmentQuestion || COMMITMENT_CLAIM.test(text))) continue;

    const tokens = new Set(terms(text));
    const dup = kept.find(
      (k) => isSubset(tokens, k.tokens) || jaccard(tokens, k.tokens) >= DUPLICATE_JACCARD,
    );
    if (dup) {
      for (const id of ids) if (!dup.ids.includes(id)) dup.ids.push(id);
      continue;
    }
    kept.push({ text, ids, tokens });
  }

  const claims = limitWords(
    kept.slice(0, MAX_CLAIMS).map((k) => ({
      text: k.text,
      citations: k.ids.map((id) => ({ meeting_id: retrieved.get(id)!.meeting_id, segment_id: id })),
    })),
    MAX_WORDS,
  );
  if (claims.length === 0) return { answer: NOT_FOUND, citations: [], claims: [] };

  const seen = new Set<string>();
  const citations: AskCitation[] = [];
  for (const c of claims) {
    for (const cit of c.citations) {
      if (seen.has(cit.segment_id)) continue;
      seen.add(cit.segment_id);
      citations.push(cit);
    }
  }
  return { answer: claims.map((c) => c.text).join(" "), citations, claims };
}
