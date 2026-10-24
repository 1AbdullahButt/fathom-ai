// Talk time per speaker (PLAN.md contract). Pure.
import type { Segment } from "./types";

export interface TalkTime {
  speaker_id: string;
  seconds: number;
  /** Fraction of all talk time, 0..1 (shares sum to 1 when anyone spoke). */
  share: number;
}

/** Seconds spoken per speaker (sum of segment lengths) and their share, most talk first. */
export function talkTime(segments: Segment[]): TalkTime[] {
  const by = new Map<string, number>();
  for (const s of segments) {
    const len = Math.max(0, s.end_s - s.start_s);
    by.set(s.speaker_id, (by.get(s.speaker_id) ?? 0) + len);
  }
  const total = [...by.values()].reduce((a, b) => a + b, 0);
  return [...by.entries()]
    .map(([speaker_id, seconds]) => ({ speaker_id, seconds, share: total > 0 ? seconds / total : 0 }))
    .sort((a, b) => b.seconds - a.seconds || a.speaker_id.localeCompare(b.speaker_id));
}
