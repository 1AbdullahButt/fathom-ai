"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_NOTE_CHARS } from "@/lib/ranges";
import { Button } from "@/components/ui/Button";
import styles from "./Highlights.module.css";

export interface NoteFormProps {
  /** Shown above the field, e.g. "Highlight 0:12–0:38". */
  label: string;
  initial?: string;
  submitLabel?: string;
  /** Resolves true when saved; the form stays open (with the text) on false. */
  onSave(note: string): Promise<boolean>;
  onCancel(): void;
}

/** Small inline note form: one textarea, Save / Cancel. Enter saves, Shift+Enter is a new line, Esc cancels. */
export function NoteForm({ label, initial = "", submitLabel = "Save", onSave, onCancel }: NoteFormProps) {
  const [note, setNote] = useState(initial);
  const [saving, setSaving] = useState(false);
  const over = note.length > MAX_NOTE_CHARS;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving || over) return;
    setSaving(true);
    // On success the parent unmounts the form; on failure it stays open with the text.
    await onSave(note);
    setSaving(false);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form className={styles.noteForm} onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
      <label className={styles.noteLabel}>
        {label}
        <textarea
          autoFocus
          className={styles.noteInput}
          rows={2}
          placeholder="Add a note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={onKey}
          aria-invalid={over || undefined}
        />
      </label>
      <div className={styles.noteFooter}>
        <span className={styles.noteCount} data-over={over || undefined}>
          {note.length > MAX_NOTE_CHARS - 100 ? `${note.length}/${MAX_NOTE_CHARS}` : ""}
        </span>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit" loading={saving} disabled={over}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default NoteForm;
