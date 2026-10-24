import type { Meeting, Segment } from "./types";

export interface SearchHit {
  meeting_id: string;
  meeting_title: string;
  segment_id: string | null;
  start_s: number;
  snippet: string;
}

const SNIPPET_RADIUS = 60;

function snippetAround(text: string, index: number, length: number): string {
  if (text.length <= SNIPPET_RADIUS * 2 + length) return text;
  const from = Math.max(0, index - SNIPPET_RADIUS);
  const to = Math.min(text.length, index + length + SNIPPET_RADIUS);
  return `${from > 0 ? "…" : ""}${text.slice(from, to)}${to < text.length ? "…" : ""}`;
}

/** Case-insensitive phrase search over meeting titles (segment_id null, start_s 0) and segment text. */
export function searchMeetings(
  query: string,
  corpus: { meeting: Meeting; segments: Segment[] }[],
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const { meeting, segments } of corpus) {
    if (meeting.title.toLowerCase().includes(q)) {
      hits.push({
        meeting_id: meeting.id,
        meeting_title: meeting.title,
        segment_id: null,
        start_s: 0,
        snippet: meeting.title,
      });
    }
    for (const seg of segments) {
      const i = seg.text.toLowerCase().indexOf(q);
      if (i === -1) continue;
      hits.push({
        meeting_id: meeting.id,
        meeting_title: meeting.title,
        segment_id: seg.id,
        start_s: seg.start_s,
        snippet: snippetAround(seg.text, i, q.length),
      });
    }
  }
  return hits;
}
