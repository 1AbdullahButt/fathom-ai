"use client";

import type { Segment, Speaker } from "@/lib/types";
import { formatTimestamp } from "@/lib/time";

export interface QuoteChipProps {
  segment: Segment;
  speaker?: Speaker;
  onSeek(s: number): void;
}

/** Evidence quote: timestamp + speaker + verbatim text. Clicking seeks to the segment start. */
export function QuoteChip({ segment, speaker, onSeek }: QuoteChipProps) {
  const ts = formatTimestamp(segment.start_s);
  return (
    <button type="button" className="quote-chip" onClick={() => onSeek(segment.start_s)}>
      <span className="quote-chip__time">{ts}</span>
      {speaker ? <span className="quote-chip__speaker"> {speaker.name}:</span> : null}
      <span className="quote-chip__text"> &ldquo;{segment.text}&rdquo;</span>
    </button>
  );
}

/** Quote chips for a list of evidence ids; ids that are not in `segments` are skipped. */
export function EvidenceQuotes({
  evidence,
  segments,
  speakers,
  onSeek,
}: {
  evidence: string[];
  segments: Segment[];
  speakers: Speaker[];
  onSeek(s: number): void;
}) {
  const byId = new Map(segments.map((s) => [s.id, s]));
  const speakerById = new Map(speakers.map((s) => [s.id, s]));
  return (
    <ul className="evidence">
      {evidence.map((id) => {
        const seg = byId.get(id);
        if (!seg) return null;
        return (
          <li key={id}>
            <QuoteChip segment={seg} speaker={speakerById.get(seg.speaker_id)} onSeek={onSeek} />
          </li>
        );
      })}
    </ul>
  );
}

export default QuoteChip;
