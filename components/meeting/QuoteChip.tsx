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

/** Lists longer than this collapse to the first COLLAPSED_COUNT chips (design/review-p0.md §2). */
const COLLAPSE_ABOVE = 3;
const COLLAPSED_COUNT = 2;

/**
 * Quote chips for a list of evidence ids; ids that are not in `segments` are skipped. More than
 * 3 quotes show the first 2 plus a "+N more quotes" toggle; the list opens by itself when the
 * playing segment (`activeId`) is one of the hidden quotes.
 */
export function EvidenceQuotes({
  evidence,
  segments,
  speakers,
  onSeek,
  activeId,
}: {
  evidence: string[];
  segments: Segment[];
  speakers: Speaker[];
  onSeek(s: number): void;
  activeId?: string;
}) {
  const byId = new Map(segments.map((s) => [s.id, s]));
  const speakerById = new Map(speakers.map((s) => [s.id, s]));
  const quotes = evidence.map((id) => byId.get(id)).filter((s): s is Segment => !!s);
  const collapsible = quotes.length > COLLAPSE_ABOVE;
  const activeHidden = collapsible && quotes.findIndex((q) => q.id === activeId) >= COLLAPSED_COUNT;
  const [open, setOpen] = useState(activeHidden);
  // Open by itself when playback reaches a hidden quote; the user can still close it again.
  const [seenActive, setSeenActive] = useState(activeId);
  if (activeId !== seenActive) {
    setSeenActive(activeId);
    if (activeHidden) setOpen(true);
  }
  const expanded = !collapsible || open;
  const shown = expanded ? quotes : quotes.slice(0, COLLAPSED_COUNT);
  const hiddenCount = quotes.length - COLLAPSED_COUNT;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
      <ul
        className="evidence"
        style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)", width: "100%" }}
      >
        {shown.map((seg) => (
          <li key={seg.id}>
            <QuoteChip
              segment={seg}
              speaker={speakerById.get(seg.speaker_id)}
              color={speakerColor(speakers, seg.speaker_id)}
              onSeek={onSeek}
              active={seg.id === activeId}
            />
          </li>
        ))}
      </ul>
      {collapsible ? (
        <button
          type="button"
          className="evidence__toggle"
          aria-expanded={expanded}
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) 0",
            border: 0,
            background: "transparent",
            font: "var(--type-caption)",
            color: "var(--ink-600)",
            cursor: "pointer",
          }}
        >
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={14} />
          {expanded ? "Show fewer" : `+${hiddenCount} more ${hiddenCount === 1 ? "quote" : "quotes"}`}
        </button>
      ) : null}
    </div>
  );
}

export default QuoteChip;
