// POST /api/ask {question} -> AskResponse
// PLAN.md P2-4: answer only from cited transcript lines, else "not found in meetings".
import { NextResponse } from "next/server";
import { z } from "zod";
import { ask, MAX_QUESTION_CHARS, type AskClaim } from "@/lib/ask";
import { countRateEventsSince, listCorpus, logRateEvent } from "@/lib/data";
import { clientIp, hashIp } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const ASKS_PER_HOUR = 20;

const body = z.object({ question: z.string() });

/** One cited transcript line, with what the UI needs to render its quote chip and link. */
export interface AskSource {
  meeting_id: string;
  meeting_title: string;
  segment_id: string;
  start_s: number;
  speaker: string;
  /** Speaker position in the meeting (for the --spk-N colour); -1 when unknown. */
  speaker_index: number;
  text: string;
}

export interface AskResponse {
  answer: string;
  found: boolean;
  claims: AskClaim[];
  sources: Record<string, AskSource>;
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(400, "Send JSON.");
  }
  const parsed = body.safeParse(raw);
  if (!parsed.success) return fail(400, "Send a question.");
  const question = parsed.data.question.replace(/\s+/g, " ").trim();
  if (!question) return fail(400, "Type a question first.");
  if (question.length > MAX_QUESTION_CHARS) return fail(400, `Questions can be up to ${MAX_QUESTION_CHARS} characters.`);

  const ipHash = hashIp(clientIp(req.headers));
  // The rate limit and the uploaded part of the corpus are bounded reads on the fast store (no
  // retries, 1.5 s), run in parallel. If Supabase is slow or down, Ask still answers from the
  // seeded meetings: the limit fails open (logged, DECISIONS.md) and listCorpus returns seeds only.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const [limit, corpusResult] = await Promise.allSettled([
    countRateEventsSince("ask", ipHash, since, { fast: true }),
    listCorpus(),
  ]);
  const why = (r: PromiseRejectedResult) => (r.reason instanceof Error ? r.reason.message : r.reason);
  if (limit.status === "fulfilled") {
    if (limit.value >= ASKS_PER_HOUR) return fail(429, "You’ve asked a lot of questions in the last hour. Try again later.");
    try {
      await logRateEvent("ask", ipHash, null, { fast: true });
    } catch (e) {
      console.error("ask: rate log failed:", e instanceof Error ? e.message : e);
    }
  } else {
    console.error("ask: rate limit unavailable, allowing the question:", why(limit));
  }
  if (corpusResult.status === "rejected") {
    console.error("ask: load failed", why(corpusResult));
    return fail(503, "Ask isn’t working right now. Try again in a moment.");
  }
  const corpus = corpusResult.value;

  try {
    const result = await ask(question, corpus);
    const meetings = new Map(corpus.map((c) => [c.meeting.id, c]));
    const sources: Record<string, AskSource> = {};
    for (const cit of result.citations) {
      const entry = meetings.get(cit.meeting_id);
      const seg = entry?.segments.find((s) => s.id === cit.segment_id);
      if (!entry || !seg) continue;
      const idx = entry.meeting.speakers.findIndex((s) => s.id === seg.speaker_id);
      sources[seg.id] = {
        meeting_id: entry.meeting.id,
        meeting_title: entry.meeting.title,
        segment_id: seg.id,
        start_s: seg.start_s,
        speaker: idx >= 0 ? entry.meeting.speakers[idx].name : "Unknown speaker",
        speaker_index: idx,
        text: seg.text,
      };
    }
    const found = result.citations.length > 0;
    const response: AskResponse = {
      answer: result.answer,
      found,
      claims: found ? (result.claims ?? [{ text: result.answer, citations: result.citations }]) : [],
      sources,
    };
    return NextResponse.json(response);
  } catch (e) {
    console.error("ask: answer failed", e instanceof Error ? e.message : e);
    return fail(503, "We couldn’t answer that right now. Try again in a moment.");
  }
}
