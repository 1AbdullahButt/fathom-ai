"use client";

import { formatTimestamp } from "@/lib/time";
import styles from "./Navigator.module.css";

export interface ChapterItemProps {
  /** 1-based position, shown as "01". */
  index: number;
  title: string;
  seconds: number;
  active?: boolean;
  /** 0..1 through the active chapter. */
  progress?: number;
  onSeek(s: number): void;
}

/** Chapter row for long-meeting navigation; the active row shows how far playback is into it. */
export function ChapterItem({ index, title, seconds, active = false, progress = 0, onSeek }: ChapterItemProps) {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <button
      type="button"
      className={styles.chapter}
      aria-current={active ? "true" : undefined}
      aria-label={`${title}, ${formatTimestamp(seconds)}`}
      onClick={() => onSeek(seconds)}
    >
      <span className={styles.chapterIndex} aria-hidden="true">
        {String(index).padStart(2, "0")}
      </span>
      <span className={styles.chapterTitle}>{title}</span>
      <span className={styles.time}>{formatTimestamp(seconds)}</span>
      {active ? (
        <span className={styles.progress} aria-hidden="true">
          <span className={styles.progressFill} style={{ width: `${Math.round(p * 100)}%` }} />
        </span>
      ) : null}
    </button>
  );
}

export default ChapterItem;
