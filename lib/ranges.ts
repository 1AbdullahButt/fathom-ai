// Validation for user-made time ranges (highlights, clips). Pure, no I/O.
import { z } from "zod";
import { formatTimestamp } from "./time";

export const MAX_NOTE_CHARS = 500;
export const MAX_TITLE_CHARS = 120;
/** Longest clip (the database enforces the same bound, 0005_highlights_clips.sql). */
export const MAX_CLIP_S = 600;
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

/** Default clip title when none is given. */
export function clipTitle(start_s: number): string {
  return `Clip at ${formatTimestamp(start_s)}`;
}

/** Shortest clip; shorter ranges (a 0-length highlight) are widened to this, inside the meeting. */
export const MIN_CLIP_S = 1;

/** A clip range from [start, end]: at least MIN_CLIP_S long and within [0, duration]. */
export function clipRange(start_s: number, end_s: number, duration: number): { start_s: number; end_s: number } {
  let s = Math.max(0, start_s);
  let e = Math.min(duration, Math.max(end_s, s + MIN_CLIP_S));
  if (e - s < MIN_CLIP_S) s = Math.max(0, e - MIN_CLIP_S);
  e = Math.max(e, s + Math.min(MIN_CLIP_S, duration));
  return { start_s: s, end_s: e };
}

/** Segments that overlap [start, end] (a zero-length range picks the line playing at that moment). */
export function segmentsInRange<T extends { start_s: number; end_s: number }>(segments: T[], start: number, end: number): T[] {
  return segments.filter((s) => (end > start ? s.start_s < end && s.end_s > start : s.start_s <= start && s.end_s >= start));
}
