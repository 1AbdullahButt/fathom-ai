"use client";

import type { Segment, Speaker, SummaryPoint as SummaryPointData } from "@/lib/types";
import { EvidenceQuotes } from "./QuoteChip";

export interface SummaryPointProps {
  point: SummaryPointData;
  segments: Segment[];
  speakers: Speaker[];
  onSeek(s: number): void;
}

export function SummaryPoint({ point, segments, speakers, onSeek }: SummaryPointProps) {
  const human = point.edited_by_human === true;
  return (
    <div
      className="summary-point"
      style={{ display: "grid", gridTemplateColumns: "14px minmax(0,1fr)", gap: "0 8px", padding: "10px 0" }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: human ? "var(--human-mark)" : "var(--ink-400)",
          marginTop: 9,
          justifySelf: "center",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <p
          className="summary-point__text"
          style={{
            margin: 0,
            font: human ? "var(--type-human)" : "400 14.5px/1.55 var(--font-sans)",
            color: human ? "var(--human-text)" : "var(--text-1)",
            textWrap: "pretty",
          }}
        >
          {point.text}
        </p>
        <EvidenceQuotes evidence={point.evidence} segments={segments} speakers={speakers} onSeek={onSeek} />
      </div>
    </div>
  );
}

export default SummaryPoint;
