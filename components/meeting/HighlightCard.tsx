"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import type { Highlight, Segment, Speaker } from "@/lib/types";
import { segmentsInRange } from "@/lib/ranges";
import { formatTimestamp } from "@/lib/time";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { NoteForm } from "./NoteForm";
import { speakerColor } from "./QuoteChip";
import styles from "./Highlights.module.css";

export interface HighlightCardProps {
  highlight: Highlight;
  segments: Segment[];
  speakers: Speaker[];
  /** Seek to the start of the range and play. */
  onPlay(s: number): void;
  /** Save a new note for this range; resolves true when saved. */
  onSaveNote?(note: string): Promise<boolean>;
  /** Playback is inside the range. */
  active?: boolean;
  /** Extra actions in the header row (the Clip button, P1-4). */
  actions?: ReactNode;
}

/** Saved highlight: play range, note, the words said in the range. */
function HighlightCardImpl({ highlight, segments, speakers, onPlay, onSaveNote, active = false, actions }: HighlightCardProps) {
  const [editing, setEditing] = useState(false);
  const { start_s, end_s, note } = highlight;
  const range = `${formatTimestamp(start_s)}–${formatTimestamp(end_s)}`;
  const lines = useMemo(() => segmentsInRange(segments, start_s, end_s), [segments, start_s, end_s]);
  const first = lines[0];
  const speaker = first ? speakers.find((s) => s.id === first.speaker_id) : undefined;
  const quote = lines.map((l) => l.text).join(" ");

  return (
    <article className={styles.card} data-active={active || undefined} aria-label={`Highlight ${range}`}>
      <div className={styles.cardHead}>
        <button type="button" className={styles.playRange} onClick={() => onPlay(start_s)} aria-label={`Play highlight ${range}`}>
          <Icon name="play" size={11} strokeWidth={2.25} />
          {range}
        </button>
        <span className={styles.len}>{formatTimestamp(Math.max(1, Math.round(end_s - start_s)))}</span>
        <span style={{ flex: 1 }} />
        {onSaveNote && !editing ? (
          <IconButton icon="pencil" size="sm" label={note ? "Edit note" : "Add note"} onClick={() => setEditing(true)} />
        ) : null}
        {actions}
      </div>
      {editing && onSaveNote ? (
        <NoteForm
          label="Note"
          initial={note}
          submitLabel="Save note"
          onCancel={() => setEditing(false)}
          onSave={async (n) => {
            const ok = await onSaveNote(n);
            if (ok) setEditing(false);
            return ok;
          }}
        />
      ) : note ? (
        <p className={styles.note}>{note}</p>
      ) : null}
      {quote ? (
        <p className={styles.quote}>
          {speaker ? (
            <span style={{ color: speakerColor(speakers, speaker.id), fontWeight: 600 }}>{speaker.name}: </span>
          ) : null}
          {"“" + quote + "”"}
        </p>
      ) : null}
    </article>
  );
}

export const HighlightCard = memo(HighlightCardImpl);
export default HighlightCard;
