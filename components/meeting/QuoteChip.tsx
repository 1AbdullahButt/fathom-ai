"use client";

import { useState } from "react";
import type { Segment, Speaker } from "@/lib/types";
import { formatTimestamp } from "@/lib/time";
import { Icon } from "@/components/ui/Icon";

/** Speaker hue token (--spk-1..8) by the speaker's position in the meeting's speaker list. */
export function speakerColor(speakers: Speaker[], speakerId: string | undefined): string {
  const i = speakers.findIndex((s) => s.id === speakerId);
  return i < 0 ? "var(--ink-600)" : `var(--spk-${(i % 8) + 1})`;
}

export interface QuoteChipProps {
  segment: Segment;
  speaker?: Speaker;
  onSeek(s: number): void;
  /** Speaker dot colour; defaults to ink. */
  color?: string;
  /** The chip currently playing gets a tide outline + tint. */
  active?: boolean;
}

/** Evidence quote: verbatim text, speaker, mono timestamp. Clicking seeks to the segment start. */
export function QuoteChip({ segment, speaker, onSeek, color = "var(--ink-600)", active = false }: QuoteChipProps) {
  const [hover, setHover] = useState(false);
  const ts = formatTimestamp(segment.start_s);
  const name = speaker ? `Play quote from ${speaker.name} at ${ts}` : `Play quote at ${ts}`;
  return (
    <button
      type="button"
      className="quote-chip"
      aria-label={name}
      onClick={() => onSeek(segment.start_s)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        border: `1px solid ${active ? "var(--tide-200)" : "transparent"}`,
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--accent-soft)" : hover ? "var(--paper-150)" : "var(--quote-bg)",
        cursor: "pointer",
        transition: "background var(--dur-1) var(--ease-out)",
      }}
    >
      <span style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--ink-700)", textWrap: "pretty" }}>
        &ldquo;{segment.text}&rdquo;
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, font: "500 12px/1 var(--font-sans)", color: "var(--text-muted)" }}>
        {speaker ? (
          <>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
            <span style={{ color: "var(--ink-600)" }}>{speaker.name}</span>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: hover || active ? "var(--accent)" : "var(--text-muted)",
            font: "400 12px/1 var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Icon name="play" size={11} strokeWidth={2.25} />
          {ts}
        </span>
      </span>
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
    <ul className="evidence" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
      {evidence.map((id) => {
        const seg = byId.get(id);
        if (!seg) return null;
        return (
          <li key={id}>
            <QuoteChip
              segment={seg}
              speaker={speakerById.get(seg.speaker_id)}
              color={speakerColor(speakers, seg.speaker_id)}
              onSeek={onSeek}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default QuoteChip;
