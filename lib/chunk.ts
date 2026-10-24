// Splits a transcript into ~10-minute chunks for map-reduce extraction (PLAN.md P2-1).
// Pure, no I/O. Chunks are contiguous, never split a segment, and when a chunk has to end
// it prefers to end at a speaker change close to the limit rather than mid-monologue.
import type { Segment } from "./types";

/** How far back from the limit (as a share of maxSeconds) a speaker change may pull the cut. */
const LOOKBACK = 0.2;

export function chunkSegments(segments: Segment[], maxSeconds = 600): Segment[][] {
  const out: Segment[][] = [];
  let cur: Segment[] = [];
  for (const s of segments) {
    if (cur.length && s.end_s - cur[0].start_s > maxSeconds) {
      // Cut before index `cut` of cur. Cutting right before s is ideal if s starts a new speaker.
      let cut = cur.length;
      if (s.speaker_id === cur[cur.length - 1].speaker_id) {
        const earliest = cur[0].start_s + maxSeconds * (1 - LOOKBACK);
        for (let k = cur.length - 1; k > 0 && cur[k].start_s >= earliest; k--) {
          if (cur[k].speaker_id !== cur[k - 1].speaker_id) {
            cut = k;
            break;
          }
        }
      }
      out.push(cur.slice(0, cut));
      cur = cur.slice(cut);
      // The carried-over tail plus s can still be too long (e.g. one very long segment).
      if (cur.length && s.end_s - cur[0].start_s > maxSeconds) {
        out.push(cur);
        cur = [];
      }
    }
    cur.push(s);
  }
  if (cur.length) out.push(cur);
  return out;
}
