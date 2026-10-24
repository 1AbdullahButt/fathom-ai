// Validation for user-made time ranges (highlights, clips). Pure, no I/O.
import { z } from "zod";

export const MAX_NOTE_CHARS = 500;
export const MAX_TITLE_CHARS = 120;
/** Media duration and transcript end can differ by a little; allow this much past the end. */
const END_SLACK_S = 1;

/**
 * User text stored as plain text: control characters (except newline and tab) removed,
 * whitespace trimmed. It is always rendered as React text, never as HTML.
 */
export function plainText(v: string): string {
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n?/g, "\n").trim();
}

const seconds = z.number().finite().min(0);

export const rangeInput = z.object({
  meeting_id: z.string().min(1).max(100),
  start_s: seconds,
  end_s: seconds,
});

export type RangeCheck = { ok: true; start_s: number; end_s: number } | { ok: false; error: string };

/** start <= end (or < when `strict`), both inside [0, duration]. Rounded to ms. */
export function checkRange(start_s: number, end_s: number, duration: number, strict = false): RangeCheck {
  const s = Math.round(start_s * 1000) / 1000;
  const e = Math.round(end_s * 1000) / 1000;
  if (strict ? e <= s : e < s) return { ok: false, error: "The range must end after it starts." };
  if (e > duration + END_SLACK_S) return { ok: false, error: "The range goes past the end of the meeting." };
  return { ok: true, start_s: s, end_s: Math.min(e, Math.max(duration, s)) };
}

/** Duration used to bound ranges: the longer of the stored duration and the transcript end. */
export function meetingLength(duration_s: number, segments: { end_s: number }[]): number {
  return segments.reduce((m, seg) => Math.max(m, seg.end_s), duration_s);
}
