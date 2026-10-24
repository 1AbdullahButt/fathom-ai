"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { Segment, Speaker, SummaryPoint as SummaryPointData } from "@/lib/types";
import { MAX_EDIT_CHARS } from "@/lib/edits";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { HumanEdit } from "./HumanEdit";
import { useSaveGuard } from "./useSaveGuard";
import { EvidenceQuotes } from "./QuoteChip";
import styles from "./Edits.module.css";

export interface SummaryPointProps {
  point: SummaryPointData;
  segments: Segment[];
  speakers: Speaker[];
  onSeek(s: number): void;
  /** Id of the segment playing now: its chip is highlighted and kept visible. */
  activeId?: string;
  /**
   * Inline edit (P2-3). Resolves null when saved, or an error message to show. Without it the
   * point is read-only (no pencil).
   */
  onSave?(text: string): Promise<string | null>;
}

export function SummaryPoint({ point, segments, speakers, onSeek, activeId, onSave }: SummaryPointProps) {
  const human = point.edited_by_human === true;
  const [editing, setEditing] = useState(false);
  return (
    <div
      className={`summary-point ${styles.editable}`}
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
        {editing && onSave ? (
          <TextForm label="Summary point" initial={point.text} onSave={onSave} onDone={() => setEditing(false)} />
        ) : (
          <div className={styles.row}>
            <p
              className="summary-point__text"
              style={{
                margin: 0,
                font: human ? "var(--type-human)" : "400 14.5px/1.55 var(--font-sans)",
                color: human ? "var(--human-text)" : "var(--text-1)",
                textWrap: "pretty",
              }}
            >
              {human ? <HumanEdit>{point.text}</HumanEdit> : point.text}
            </p>
            {onSave ? (
              <IconButton className={styles.editBtn} icon="pencil" label="Edit summary point" size="sm" onClick={() => setEditing(true)} />
            ) : null}
          </div>
        )}
        <EvidenceQuotes evidence={point.evidence} segments={segments} speakers={speakers} onSeek={onSeek} activeId={activeId} />
      </div>
    </div>
  );
}

/** Serif textarea + Save / Cancel. Enter saves, Shift+Enter is a new line, Esc cancels. */
function TextForm({
  label,
  initial,
  onSave,
  onDone,
}: {
  label: string;
  initial: string;
  onSave(text: string): Promise<string | null>;
  onDone(): void;
}) {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  useSaveGuard(saving);
  const [error, setError] = useState<string | null>(null);
  const over = text.length > MAX_EDIT_CHARS;
  const empty = !text.trim();

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving || over || empty) return;
    if (text.trim() === initial.trim()) return onDone();
    setSaving(true);
    setError(null);
    const err = await onSave(text);
    setSaving(false);
    if (err) setError(err);
    else onDone();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onDone();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} onKeyDown={onKey}>
      <textarea
        autoFocus
        aria-label={label}
        className={styles.text}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-invalid={over || empty || undefined}
        onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
      />
      <div className={styles.footer}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          <span className={styles.count} data-over={over || undefined}>
            {text.length > MAX_EDIT_CHARS - 100 ? `${text.length}/${MAX_EDIT_CHARS}` : ""}
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit" loading={saving} disabled={over || empty}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export default SummaryPoint;
