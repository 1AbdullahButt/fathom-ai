// Validates raw LLM extraction JSON. Pure, no I/O.
import { z } from "zod";
import type { ActionItem, SummaryPoint } from "./types";

export type ExtractedActionItem = Omit<ActionItem, "id" | "meeting_id" | "edited_by_human">;

export type ValidationResult =
  | { ok: true; summary: SummaryPoint[]; actionItems: ExtractedActionItem[]; dropped: number }
  | { ok: false; error: string };

const evidence = z.array(z.string());
const nullableText = z.string().nullable();

const rawSchema = z.object({
  summary: z.array(z.object({ text: z.string(), evidence })),
  action_items: z.array(
    z.object({
      task: z.string(),
      owner: nullableText,
      due: nullableText,
      due_phrase: nullableText,
      confidence: z.enum(["high", "low"]),
      evidence,
    }),
  ),
});

const PLACEHOLDERS = new Set(["", "unknown", "not stated", "n/a", "none", "tbd"]);

/** Placeholder strings are not real values: the model must not invent an owner or date. */
function orNull(v: string | null): string | null {
  if (v === null) return null;
  const t = v.trim();
  return PLACEHOLDERS.has(t.toLowerCase()) ? null : t;
}

export function validateExtraction(raw: unknown, segmentIds: readonly string[]): ValidationResult {
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? issue.path.join(".") : "(root)";
    return { ok: false, error: `invalid extraction at ${where}: ${issue?.message ?? "malformed"}` };
  }

  const known = new Set(segmentIds);
  const grounded = (ids: string[]) => ids.length > 0 && ids.every((id) => known.has(id));
  let dropped = 0;

  const summary: SummaryPoint[] = [];
  for (const p of parsed.data.summary) {
    if (grounded(p.evidence)) summary.push({ text: p.text, evidence: [...p.evidence] });
    else dropped++;
  }

  const actionItems: ExtractedActionItem[] = [];
  for (const a of parsed.data.action_items) {
    if (!grounded(a.evidence)) {
      dropped++;
      continue;
    }
    actionItems.push({
      task: a.task,
      owner: orNull(a.owner),
      due: orNull(a.due),
      due_phrase: orNull(a.due_phrase),
      confidence: a.confidence,
      evidence: [...a.evidence],
    });
  }

  return { ok: true, summary, actionItems, dropped };
}
