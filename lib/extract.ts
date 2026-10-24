// Summary + action-item extraction (PLAN.md contract). One LLM call in strict JSON,
// validated against the segment ids; retried once with the validation error on ok:false.
// Meetings over 15 minutes go map-reduce (P2-1): extract per ~10-minute chunk, then one merge
// call that groups chunk points by number, so merged evidence is built in code, not by the model.
import { chunkSegments } from "./chunk";
import { completeJSON, LlmJsonError, mockExtraction, type ChatMessage } from "./llm";
import { templateFocus } from "./templates";
import { formatTimestamp } from "./time";
import type { Segment, Speaker, Template } from "./types";
import { validateExtraction, type ExtractedActionItem, type ValidationResult } from "./validate";

export interface ExtractOptions {
  /** Override the summary length target. */
  maxPoints?: number;
  /** Long meetings only: wait this long between LLM calls (per-minute provider limits). */
  pauseMs?: number;
  /** Long meetings only: progress lines (one per chunk, one for the merge). */
  onProgress?: (line: string) => void;
}

interface Part {
  index: number;
  total: number;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Meeting date plus the next 14 days, so the model looks dates up instead of doing arithmetic. */
function calendar(meetingDate: string): string {
  const start = parseDate(meetingDate);
  const lines: string[] = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const label = i === 0 ? " (meeting day, \"today\")" : i === 1 ? " (\"tomorrow\")" : "";
    lines.push(`${isoDay(d)} ${WEEKDAYS[d.getUTCDay()]}${label}`);
  }
  return lines.join("\n");
}

/** About 3 points per 10 minutes, at least 3, at most 12. */
export function summaryTarget(segments: Segment[]): number {
  if (segments.length === 0) return 3;
  const span = segments[segments.length - 1].end_s - segments[0].start_s;
  return Math.min(12, Math.max(3, Math.round((span / 600) * 3)));
}

/** "Andrew (marketing)" -> "Andrew"; unnamed speakers have no usable name. */
function personName(name: string): string | null {
  if (/name not stated/i.test(name)) return null;
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim() || null;
}

function speakerLabel(s: Speaker | undefined, id: string): string {
  if (!s) return id;
  return personName(s.name) ? s.name : `Unnamed speaker ${id}`;
}

function buildMessages(
  segments: Segment[],
  speakers: Speaker[],
  meetingDate: string,
  template: Template,
  maxPoints: number,
  part?: Part,
): ChatMessage[] {
  const byId = new Map(speakers.map((s) => [s.id, s]));
  const weekday = WEEKDAYS[parseDate(meetingDate).getUTCDay()];
  const transcript = segments
    .map((s) => `[${s.id}] (${formatTimestamp(s.start_s)}) ${speakerLabel(byId.get(s.speaker_id), s.speaker_id)}: ${s.text}`)
    .join("\n");
  const people = speakers
    .map((s) => {
      const n = personName(s.name);
      return n ? `- ${s.name} -> owner name "${n}"` : `- ${speakerLabel(s, s.id)} (no name known; cannot be an owner)`;
    })
    .join("\n");

  const system = `You extract a grounded summary and action items from a meeting transcript.
Return ONLY a JSON object of this exact shape:
{"summary":[{"text":string,"evidence":[segment ids]}],
 "action_items":[{"task":string,"owner":string|null,"due":"YYYY-MM-DD"|null,"due_phrase":string|null,"confidence":"high"|"low","evidence":[segment ids]}]}

Evidence rules:
- Every summary point and every action item cites the ids (like "${segments[0]?.id ?? "x-s1"}") of the transcript lines that support it. Use only ids that appear in the transcript, copied exactly. Cite only the 1-3 lines that directly state the point (for a decision: the proposal AND the decision; for an action item: the request AND the acceptance). Never cite lines that are merely on the same topic, background, or procedure around it.

Summary rules:
- ${templateFocus(template)}
- Write at most ${maxPoints} points (fewer if the meeting has less to say). Do not invent facts.
- Skip small talk, introductions, ice-breakers, tool tryouts and off-topic personal chat (studies, courses, weekend plans) unless something important was decided in them. If a stretch of transcript is only that, write fewer points; returning fewer than the maximum is expected.
- Never write a point about what did not happen (e.g. "no actions were assigned").

Action item rules:
- An action item is a concrete task that someone committed to out loud ("I'll...", "I will...", "Sure, I'll...") or was asked to do and accepted, OR a task the group clearly said must be done.
- Only follow-up work to be done after the meeting. Things done during the meeting itself (introductions, ice-breakers, volunteering to go first, trying the whiteboard, presenting a slide) are NOT action items.
- Ideas, wishes and suggestions with no commitment ("we should probably think about X at some point", "it would be nice to...") are NOT action items. Leave them out entirely.
- A request addressed to nobody in particular ("someone should look at X") that nobody takes on IS an action item, but with owner null and confidence "low". A reply like "Good point" is not acceptance.
- task: one imperative sentence starting with a verb that is self-explanatory out of context: name the concrete object, the subject/topic and the purpose, combining details from the request and the reply. Reuse the speakers' own key words (their verb and nouns, not synonyms) and keep specific values such as dates, numbers and names (e.g. "I'll tell sales it's the 5th" -> "Tell sales the launch is the 5th"; asked "can you look at whether invoices arrive late?" + reply "I'll check the mail server" -> "Check the mail server logs for late invoices"; "someone should look at the docs, they're confusing" -> "Review the docs for clarity").
- owner: a person is the owner only if (a) they themselves said out loud they will do it, or (b) they were asked to do it and replied accepting it. Being assigned work with no reply from that person, or replying "Sure"/"Good point" to an idea someone else floated, does NOT make them the owner: owner is null (and confidence "low"). Never infer an owner from a job title or role. Write the owner exactly as the owner name listed under "Owner names" below.
- due: only if a deadline was said aloud. Resolve it to an ISO date using the calendar below (a weekday name means its next occurrence after the meeting day; "today" is the meeting day). due_phrase is the exact words used (e.g. "by Thursday", "today"). If no deadline was said, due and due_phrase are both null. If the phrase is vague ("soon", "at some point"), due is null and due_phrase keeps the words.
- confidence: "high" when there is a clear owner and an explicit commitment; otherwise "low".
- Use null (not "", "unknown" or "TBD") for anything not stated.`;

  const partNote = part
    ? `This is part ${part.index + 1} of ${part.total} of a longer meeting; summarise only this part.

`
    : "";
  const user = `${partNote}Meeting date: ${meetingDate} (${weekday})

Calendar:
${calendar(meetingDate)}

Owner names (speakers):
${people}

Transcript ([segment id] (m:ss) Speaker: text):
${transcript}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * Normalise owners to the listed speaker names, and enforce "owner only if said aloud":
 * an owner must speak in, or be named in, one of the item's evidence lines. Otherwise the
 * owner is dropped to null with low confidence rather than kept as a guess.
 */
function groundOwners(r: ValidationResult, segments: Segment[], speakers: Speaker[]): ValidationResult {
  if (!r.ok) return r;
  const names = new Map<string, string>();
  const speakerName = new Map<string, string>();
  for (const s of speakers) {
    const n = personName(s.name);
    if (!n) continue;
    names.set(s.name.toLowerCase(), n);
    names.set(n.toLowerCase(), n);
    speakerName.set(s.id, n.toLowerCase());
  }
  const byId = new Map(segments.map((s) => [s.id, s]));
  return {
    ...r,
    actionItems: r.actionItems.map((a) => {
      if (!a.owner) return a;
      const stripped = a.owner.replace(/\s*\([^)]*\)\s*$/, "").trim();
      const owner = names.get(a.owner.toLowerCase()) ?? names.get(stripped.toLowerCase()) ?? stripped;
      const key = owner.toLowerCase();
      const nameWords = key.split(/\s+/).filter((w) => w.length > 2 && !/^(councilmember|chair|dr|mr|mrs|ms)$/.test(w));
      const supported = a.evidence.some((id) => {
        const seg = byId.get(id);
        if (!seg) return false;
        if (speakerName.get(seg.speaker_id) === key) return true;
        const words = new Set(seg.text.toLowerCase().split(/[^\p{L}\p{N}'-]+/u));
        return nameWords.some((w) => words.has(w));
      });
      return supported ? { ...a, owner } : { ...a, owner: null, confidence: "low" as const };
    }),
  };
}

/** One LLM call (strict JSON), validate, retry once on ok:false. */
async function extractOnce(
  segments: Segment[],
  speakers: Speaker[],
  meetingDate: string,
  template: Template,
  opts: ExtractOptions = {},
  part?: Part,
): Promise<ValidationResult> {
  const ids = segments.map((s) => s.id);
  const messages = buildMessages(segments, speakers, meetingDate, template, opts.maxPoints ?? summaryTarget(segments), part);
  const mock = () => mockExtraction(ids);

  let last: ValidationResult = { ok: false, error: "no attempt made" };
  let lastContent = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const convo =
      attempt === 0
        ? messages
        : [
            ...messages,
            { role: "assistant" as const, content: lastContent },
            {
              role: "user" as const,
              content: `That output was rejected: ${last.ok ? "" : last.error}. Return the corrected JSON object with exactly the required shape.`,
            },
          ];
    try {
      const raw = await completeJSON({ messages: convo, mock });
      lastContent = JSON.stringify(raw);
      last = groundOwners(validateExtraction(raw, ids), segments, speakers);
    } catch (e) {
      if (!(e instanceof LlmJsonError)) throw e;
      lastContent = e.content.slice(0, 4000);
      last = { ok: false, error: e.message };
    }
    if (last.ok) return last;
    if (attempt === 0) console.warn(`extract: retrying after invalid output: ${last.error}`);
  }
  return last;
}

/** Above this span one call risks provider token limits and long-context sloppiness. */
const SINGLE_CALL_MAX_S = 15 * 60;
const CHUNK_S = 600;

const span = (segments: Segment[]) =>
  segments.length ? segments[segments.length - 1].end_s - segments[0].start_s : 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STOP = new Set(["the", "a", "an", "to", "of", "for", "and", "or", "on", "in", "with", "about", "at", "by", "from"]);
const words = (t: string) =>
  new Set(
    t
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !STOP.has(w)),
  );

/** Token overlap (Jaccard) of two task sentences, ignoring filler words. */
function similarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
}

function sortIds(ids: string[], order: Map<string, number>): string[] {
  return [...new Set(ids)].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

/** Same owner and a similar task = the same item seen in two chunks: keep one, union evidence. */
function dedupeActionItems(items: ExtractedActionItem[], order: Map<string, number>): ExtractedActionItem[] {
  const out: ExtractedActionItem[] = [];
  for (const a of items) {
    const prev = out.find(
      (p) => (p.owner ?? "").toLowerCase() === (a.owner ?? "").toLowerCase() && similarity(p.task, a.task) >= 0.5,
    );
    if (!prev) {
      out.push({ ...a, evidence: [...a.evidence] });
      continue;
    }
    prev.evidence = sortIds([...prev.evidence, ...a.evidence], order);
    if (!prev.due && a.due) {
      prev.due = a.due;
      prev.due_phrase = a.due_phrase;
    }
    if (a.confidence === "high" && prev.owner) prev.confidence = "high";
  }
  return out;
}

interface ChunkPoint {
  text: string;
  evidence: string[];
  start_s: number;
}

type Point = { text: string; evidence: string[] };

function reduceMessages(points: ChunkPoint[], template: Template, target: number): ChatMessage[] {
  const system = `You merge the per-part summary points of one long meeting into its final summary.
Return ONLY a JSON object: {"summary":[{"text":string,"merged":[point numbers]}]}

Rules:
- ${templateFocus(template)}
- Write at most ${target} points (fewer is fine). Combine points that say the same thing or are steps of the same topic or decision; drop minor points if there are too many.
- "merged" lists the numbers of the input points each final point is built from (at least one). Use only numbers from the list. Do not use a point in two final points.
- The text of a final point may only state what its merged input points say. Do not add facts.
- Order the final points chronologically (by when their earliest merged point happened).`;
  const user = `Input points ([number] (m:ss) text):
${points.map((p, i) => `[${i}] (${formatTimestamp(p.start_s)}) ${p.text}`).join("\n")}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Map the reduce output back to evidence ids (union of merged points), in meeting order. */
function buildMerged(
  raw: unknown,
  points: ChunkPoint[],
  order: Map<string, number>,
): { ok: true; points: Point[] } | { ok: false; error: string } {
  const list = (raw as { summary?: unknown } | null)?.summary;
  if (!Array.isArray(list) || list.length === 0) return { ok: false, error: '"summary" must be a non-empty array' };
  const used = new Set<number>();
  const out: (Point & { first: number })[] = [];
  for (const [i, p] of list.entries()) {
    const { text, merged } = (p ?? {}) as { text?: unknown; merged?: unknown };
    if (typeof text !== "string" || !text.trim()) return { ok: false, error: `summary.${i}.text must be a string` };
    if (!Array.isArray(merged) || merged.length === 0) return { ok: false, error: `summary.${i}.merged must list point numbers` };
    const idx = merged.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < points.length && !used.has(n));
    if (!idx.length) return { ok: false, error: `summary.${i}.merged has no valid unused point numbers (0-${points.length - 1})` };
    idx.forEach((n) => used.add(n));
    const evidence = sortIds(
      idx.flatMap((n) => points[n].evidence),
      order,
    );
    out.push({ text: text.trim(), evidence, first: order.get(evidence[0]) ?? 0 });
  }
  out.sort((a, b) => a.first - b.first);
  return { ok: true, points: out.map(({ text, evidence }) => ({ text, evidence })) };
}

/** Reduce fallback: keep chunk points in order, evenly thinned to the target. */
function thin(points: ChunkPoint[], target: number): Point[] {
  const pick =
    points.length <= target
      ? points
      : Array.from({ length: target }, (_, i) => points[Math.floor((i * points.length) / target)]);
  return pick.map(({ text, evidence }) => ({ text, evidence }));
}

async function mergePoints(points: ChunkPoint[], template: Template, target: number, order: Map<string, number>): Promise<Point[] | null> {
  const messages = reduceMessages(points, template, target);
  const mock = () => ({ summary: points.slice(0, target).map((p, i) => ({ text: p.text, merged: [i] })) });
  let error = "";
  let lastContent = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const convo =
      attempt === 0
        ? messages
        : [
            ...messages,
            { role: "assistant" as const, content: lastContent },
            { role: "user" as const, content: `That output was rejected: ${error}. Return the corrected JSON object.` },
          ];
    try {
      const raw = await completeJSON({ messages: convo, mock });
      lastContent = JSON.stringify(raw);
      const b = buildMerged(raw, points, order);
      if (b.ok) return b.points.slice(0, target);
      error = b.error;
    } catch (e) {
      if (!(e instanceof LlmJsonError)) throw e;
      lastContent = e.content.slice(0, 4000);
      error = e.message;
    }
  }
  console.warn(`extract: merge step failed (${error}); keeping chunk points`);
  return null;
}

async function extractLong(
  segments: Segment[],
  speakers: Speaker[],
  meetingDate: string,
  template: Template,
  opts: ExtractOptions,
): Promise<ValidationResult> {
  const ids = segments.map((s) => s.id);
  const order = new Map(ids.map((id, i) => [id, i]));
  const startOf = new Map(segments.map((s) => [s.id, s.start_s]));
  const chunks = chunkSegments(segments, CHUNK_S);
  const log = opts.onProgress ?? (() => {});
  const pause = () => (opts.pauseMs ? sleep(opts.pauseMs) : Promise.resolve());

  // Map: sequential calls (rate limits), each grounded in its own chunk's segment ids only.
  const points: ChunkPoint[] = [];
  const items: ExtractedActionItem[] = [];
  let dropped = 0;
  for (const [i, chunk] of chunks.entries()) {
    if (i > 0) await pause();
    const r = await extractOnce(chunk, speakers, meetingDate, template, { maxPoints: summaryTarget(chunk) }, { index: i, total: chunks.length });
    if (!r.ok) return { ok: false, error: `chunk ${i + 1}/${chunks.length}: ${r.error}` };
    for (const p of r.summary) {
      const evidence = sortIds(p.evidence, order);
      points.push({ text: p.text, evidence, start_s: startOf.get(evidence[0]) ?? 0 });
    }
    items.push(...r.actionItems);
    dropped += r.dropped;
    log(`chunk ${i + 1}/${chunks.length}: ${r.summary.length} points, ${r.actionItems.length} items`);
  }
  points.sort((a, b) => a.start_s - b.start_s);

  // Reduce: one call groups chunk points by number; the evidence union is built in code.
  const target = summaryTarget(segments);
  let summary: Point[] = [];
  if (points.length) {
    await pause();
    const merged = await mergePoints(points, template, target, order);
    summary = merged ?? thin(points, target);
    log(`merge: ${points.length} chunk points -> ${summary.length}${merged ? "" : " (fallback)"}`);
  }

  const v = validateExtraction({ summary, action_items: dedupeActionItems(items, order) }, ids);
  return v.ok ? { ...v, dropped: v.dropped + dropped } : v;
}

/**
 * Summary + action items for a meeting. Up to 15 minutes: one call. Longer: map-reduce over
 * ~10-minute chunks (lib/chunk.ts). Relative dates resolve against meetingDate.
 */
export async function extract(
  segments: Segment[],
  speakers: Speaker[],
  meetingDate: string,
  template: Template,
  opts: ExtractOptions = {},
): Promise<ValidationResult> {
  if (span(segments) > SINGLE_CALL_MAX_S) return extractLong(segments, speakers, meetingDate, template, opts);
  return extractOnce(segments, speakers, meetingDate, template, opts);
}
