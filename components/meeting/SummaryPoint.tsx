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
  return (
    <div className="summary-point">
      <p className="summary-point__text">{point.text}</p>
      <EvidenceQuotes evidence={point.evidence} segments={segments} speakers={speakers} onSeek={onSeek} />
    </div>
  );
}

export default SummaryPoint;
