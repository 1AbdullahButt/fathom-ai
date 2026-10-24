"use client";

import { Avatar } from "@/components/ui/Avatar";
import styles from "./Navigator.module.css";

export interface TalkTimeBarProps {
  name: string;
  color: string;
  seconds: number;
  /** 0..1 of all talk time. */
  share: number;
  selected?: boolean;
  dimmed?: boolean;
  speaking?: boolean;
  onToggle(): void;
}

/** "14m", or seconds under a minute so short meetings don't read "0m". */
export function talkLabel(seconds: number): string {
  return seconds < 59.5 ? `${Math.round(seconds)}s` : `${Math.round(seconds / 60)}m`;
}

/** Speaker filter row with a talk-time bar; toggling filters the transcript to that speaker. */
export function TalkTimeBar({ name, color, seconds, share, selected = false, dimmed = false, speaking = false, onToggle }: TalkTimeBarProps) {
  const pct = Math.round(share * 100);
  return (
    <button
      type="button"
      className={styles.speaker}
      aria-pressed={selected}
      data-dimmed={dimmed || undefined}
      aria-label={`${name}, ${talkLabel(seconds)}, ${pct}% of talk time`}
      onClick={onToggle}
    >
      <Avatar name={name} color={color} size={24} speaking={speaking} />
      <span className={styles.speakerBody}>
        <span className={styles.speakerName}>{name}</span>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} style={{ width: `${Math.max(2, share * 100)}%`, background: color }} />
        </span>
      </span>
      <span className={styles.speakerTime} aria-hidden="true">
        {talkLabel(seconds)} <span className={styles.share}>{pct}%</span>
      </span>
    </button>
  );
}

export default TalkTimeBar;
