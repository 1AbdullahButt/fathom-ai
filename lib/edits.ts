// Human edits (PLAN.md P2-3). Pure: validation of edit input and the summary overlay.
// Summaries are write-once; a human edit of a point is a separate row (summary_edits, 0004),
// and the newest row per (template, point) replaces that point's text on read. Evidence is
// never part of an edit, so quotes stay attached and unchanged.
import { z } from "zod";
import { plainText } from "./ranges";
import type { Summary, Template } from "./types";

export const MAX_EDIT_CHARS = 1000;
export const MAX_OWNER_CHARS = 200;
export const EDITS_PER_HOUR = 60;

export interface SummaryEdit {
  meeting_id: string;
  template: Template;
  point_index: number;
  text: string;
  /** The AI text the edit replaced; the edit applies only while the point still has it. */
  ai_text: string;
  created_at: string;
}

/** Newest edit per (template, point) replaces the text and marks the point human-written. */
export function applySummaryEdits(
  summaries: Partial<Record<Template, Summary>>,
  edits: SummaryEdit[],
): Partial<Record<Template, Summary>> {
  if (!edits.length) return summaries;
  const newest = new Map<string, SummaryEdit>();
  for (const e of edits) {
    const key = `${e.template}:${e.point_index}`;
    const prev = newest.get(key);
    if (!prev || e.created_at >= prev.created_at) newest.set(key, e);
  }
  const out: Partial<Record<Template, Summary>> = { ...summaries };
  for (const [t, s] of Object.entries(summaries) as [Template, Summary][]) {
    if (!s) continue;
    out[t] = {
      ...s,
      points: s.points.map((p, i) => {
        const e = newest.get(`${t}:${i}`);
        return e && e.ai_text === p.text ? { ...p, text: e.text, edited_by_human: true } : p;
      }),
    };
  }
  return out;
}

const template = z.enum(["general", "sales", "one_on_one"]);

export const editInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("summary_point"),
    template,
    index: z.number().int().min(0).max(99),
    text: z.string().max(MAX_EDIT_CHARS * 2),
  }),
  z.object({
    kind: z.literal("action_item"),
    id: z.string().min(1).max(100),
    task: z.string().max(MAX_EDIT_CHARS * 2),
    owner: z.string().max(MAX_OWNER_CHARS * 2).nullable(),
    due: z.string().max(20).nullable(),
  }),
]);

export type EditInput = z.infer<typeof editInput>;

/** Plain, single-paragraph-ish text: control characters stripped, trimmed, 1..max characters. */
export function cleanText(v: string, max: number, what: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = plainText(v);
  if (!text) return { ok: false, error: `${what} can’t be empty.` };
  if (text.length > max) return { ok: false, error: `${what} can be up to ${max} characters.` };
  return { ok: true, text };
}

/** "" or null -> null (not stated); otherwise a real calendar date YYYY-MM-DD. */
export function cleanDue(v: string | null): { ok: true; due: string | null } | { ok: false; error: string } {
  const s = (v ?? "").trim();
  if (!s) return { ok: true, due: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, error: "Use a date like 2025-03-14." };
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return { ok: false, error: "That date doesn’t exist." };
  return { ok: true, due: s };
}

/** "" or null -> null (not stated). */
export function cleanOwner(v: string | null): { ok: true; owner: string | null } | { ok: false; error: string } {
  const s = plainText(v ?? "").replace(/\s+/g, " ");
  if (!s) return { ok: true, owner: null };
  if (s.length > MAX_OWNER_CHARS) return { ok: false, error: `Owner can be up to ${MAX_OWNER_CHARS} characters.` };
  return { ok: true, owner: s };
}

/** Client side: PATCH /api/meetings/[id]/edits. Resolves the JSON body, or an error message. */
export async function sendEdit<T>(meetingId: string, body: EditInput): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/edits`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: json.error || "We couldn’t save this edit. Try again." };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "We couldn’t reach the server. Try again." };
  }
}
