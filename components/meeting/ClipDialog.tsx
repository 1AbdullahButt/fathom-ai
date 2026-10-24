"use client";

import { useState } from "react";
import { MAX_TITLE_CHARS } from "@/lib/ranges";
import { formatTimestamp } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import styles from "./Highlights.module.css";

export interface ClipDialogProps {
  range: { start_s: number; end_s: number };
  onClose(): void;
  /** Create the clip and copy its link; the parent closes the dialog on success. */
  onCreate(title: string): Promise<void>;
}

/** "Clip this moment" (design MeetingPanel.jsx ClipDialog): range, optional title, create and copy link. */
export function ClipDialog({ range, onClose, onCreate }: ClipDialogProps) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const label = `${formatTimestamp(range.start_s)}–${formatTimestamp(range.end_s)}`;
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    await onCreate(title);
    setBusy(false);
  };
  return (
    <Dialog
      title="Clip this moment"
      description={`Plays ${label} with its transcript. Anyone with the link can watch — no sign-in.`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="link" loading={busy} onClick={submit}>
            Create and copy link
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          autoFocus
          className={styles.noteInput}
          style={{ minHeight: 0, height: 36 }}
          aria-label="Clip title"
          placeholder={`Clip title (optional) · Clip at ${formatTimestamp(range.start_s)}`}
          maxLength={MAX_TITLE_CHARS}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </form>
    </Dialog>
  );
}

/** Small "Clip" action on a HighlightCard: creates the public clip and copies its link. */
export function ClipButton({ onClip }: { onClip(): Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      icon="scissors"
      loading={busy}
      aria-label="Clip: create a public link and copy it"
      onClick={async () => {
        setBusy(true);
        await onClip();
        setBusy(false);
      }}
    >
      Clip
    </Button>
  );
}

export default ClipDialog;
