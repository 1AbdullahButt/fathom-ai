// Summary + action-item extraction (PLAN.md contract). One LLM call in strict JSON,
// validated against the segment ids; retried once with the validation error on ok:false.
import { completeJSON, LlmJsonError, mockExtraction, type ChatMessage } from "./llm";
import { templateFocus } from "./templates";
import { formatTimestamp } from "./time";
import type { Segment, Speaker, Template } from "./types";
import { validateExtraction, type ValidationResult } from "./validate";

export interface ExtractOptions {
  /** Override the summary length target (used when a long meeting is extracted in chunks). */
  maxPoints?: number;
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
- Every summary point and every action item cites the ids (like "${segments[0]?.id ?? "x-s1"}") of the transcript lines that support it. Use only ids that appear in the transcript, copied exactly. Cite every line needed to support it (the request AND the acceptance, the proposal AND the decision), and nothing unrelated.

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

  const user = `Meeting date: ${meetingDate} (${weekday})

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

/**
 * One LLM call (strict JSON), validate, retry once on ok:false.
 * Relative dates resolve against meetingDate.
 */
export async function extract(
  segments: Segment[],
  speakers: Speaker[],
  meetingDate: string,
  template: Template,
  opts: ExtractOptions = {},
): Promise<ValidationResult> {
  const ids = segments.map((s) => s.id);
  const messages = buildMessages(segments, speakers, meetingDate, template, opts.maxPoints ?? summaryTarget(segments));
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
