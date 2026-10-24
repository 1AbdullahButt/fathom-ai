"use client";

import { memo, type MouseEvent } from "react";
import type { Segment, Speaker } from "@/lib/types";
import { formatTimestamp } from "@/lib/time";
import styles from "./TranscriptLine.module.css";

export interface TranscriptLineProps {
  segment: Segment;
  speaker: Speaker | undefined;
  active: boolean;
  onSeek(s: number): void;
  /** Speaker hue (--spk-N). */
  color?: string;
  /** False for consecutive lines from the same speaker: the name is hidden visually. */
  showSpeaker?: boolean;
}

/** One utterance: timestamp, speaker, text. Clicking the line (or its timestamp) seeks to its start. */
function TranscriptLineImpl({ segment, speaker, active, onSeek, color = "var(--ink-600)", showSpeaker = true }: TranscriptLineProps) {
  const ts = formatTimestamp(segment.start_s);
  const name = speaker?.name ?? "Unknown speaker";
  const onLineClick = (e: MouseEvent) => {
    // Selecting text (for highlights) must not jump playback.
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && e.currentTarget.contains(sel.anchorNode)) return;
    onSeek(segment.start_s);
  };
  return (
    <div
      data-segment-id={segment.id}
      aria-current={active ? "true" : undefined}
      className={`${styles.line} ${showSpeaker ? "" : styles.continued} ${active ? styles.active : ""}`}
      onClick={onLineClick}
    >
      <span className={styles.tsCell}>
        <button
          type="button"
          className={styles.ts}
          aria-label={`Jump to ${ts}`}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(segment.start_s);
          }}
        >
          {ts}
        </button>
      </span>
      <div style={{ minWidth: 0 }}>
        {showSpeaker ? (
          <div className={styles.speaker} style={{ color }}>
            <span className={styles.dot} style={{ background: color }} aria-hidden="true" />
            {name}
          </div>
        ) : (
          <span className={styles.srOnly}>{name}</span>
        )}
        <p className={styles.text}>{segment.text}</p>
      </div>
    </div>
  );
}

export const TranscriptLine = memo(TranscriptLineImpl);
export default TranscriptLine;
