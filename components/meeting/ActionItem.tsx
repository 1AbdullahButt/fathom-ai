"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { ActionItem as ActionItemData, Segment, Speaker } from "@/lib/types";
import { MAX_EDIT_CHARS, MAX_OWNER_CHARS } from "@/lib/edits";
import { formatDueDate } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { HumanEdit } from "./HumanEdit";
import { useSaveGuard } from "./useSaveGuard";
import styles from "./Edits.module.css";
import { ConfidenceFlag } from "./ConfidenceFlag";
import { NotStated } from "./NotStated";
import { EvidenceQuotes, speakerColor } from "./QuoteChip";

export interface ActionItemProps {
  item: ActionItemData;
  segments: Segment[];
  speakers: Speaker[];
  onSeek(s: number): void;
  /** Id of the segment playing now: its chip is highlighted and kept visible. */
  activeId?: string;
  /**
   * Inline edit of task, owner and due (P2-3). Empty owner/due save as null ("not stated").
   * Resolves null when saved, or an error message to show. Without it the item is read-only.
   */
  onSave?(patch: ActionItemEdit): Promise<string | null>;
}

export interface ActionItemEdit {
  task: string;
  owner: string | null;
  /** ISO date or null. */
  due: string | null;
}

const metaChip = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  font: "500 12px/1 var(--font-sans)",
  color: "var(--ink-700)",
} as const;

export function ActionItem({ item, segments, speakers, onSeek, activeId, onSave }: ActionItemProps) {
  const [editing, setEditing] = useState(false);
  const due = item.due ? (item.due_phrase ? `${item.due_phrase} (${formatDueDate(item.due)})` : formatDueDate(item.due)) : item.due_phrase;
  const ownerSpeaker = item.owner ? speakers.find((s) => s.name === item.owner) : undefined;
  const ownerColor = ownerSpeaker ? speakerColor(speakers, ownerSpeaker.id) : undefined;
  return (
    <div
      className={`action-item ${styles.editable}`}
      style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", minWidth: 0 }}
    >
      {editing && onSave ? (
        <ItemForm item={item} onSave={onSave} onDone={() => setEditing(false)} />
      ) : (
        <>
          <div className={styles.row}>
            <p
              className="action-item__task"
              style={{
                margin: 0,
                font: item.edited_by_human ? "var(--type-human)" : "400 14.5px/1.5 var(--font-sans)",
                color: item.edited_by_human ? "var(--human-text)" : "var(--text-1)",
                textWrap: "pretty",
              }}
            >
              {item.edited_by_human ? <HumanEdit>{item.task}</HumanEdit> : item.task}
            </p>
            {onSave ? (
              <IconButton className={styles.editBtn} icon="pencil" label="Edit action item" size="sm" onClick={() => setEditing(true)} />
            ) : null}
          </div>
          <p className="action-item__meta" style={{ margin: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <span className="action-item__owner" style={{ ...metaChip, gap: 6, fontSize: 12.5 }}>
              {item.owner ? (
                <>
                  <Avatar name={item.owner} color={ownerColor} size={20} />
                  {item.owner}
                </>
              ) : (
                <NotStated what="Owner" />
              )}
            </span>
            <span className="action-item__due" style={metaChip}>
              {due ? (
                <span
                  style={{
                    ...metaChip,
                    gap: 5,
                    padding: "0 7px",
                    borderRadius: "var(--radius-xs)",
                    background: "var(--paper-150)",
                  }}
                >
                  <Icon name="calendar" size={12} />
                  {due}
                </span>
              ) : (
                <NotStated what="Date" />
              )}
            </span>
            <ConfidenceFlag confidence={item.confidence} />
          </p>
        </>
      )}
      <EvidenceQuotes evidence={item.evidence} segments={segments} speakers={speakers} onSeek={onSeek} activeId={activeId} />
    </div>
  );
}

/** Task (serif textarea), owner and due fields + Save / Cancel. Esc cancels, Enter in the task saves. */
function ItemForm({
  item,
  onSave,
  onDone,
}: {
  item: ActionItemData;
  onSave(patch: ActionItemEdit): Promise<string | null>;
  onDone(): void;
}) {
  const [task, setTask] = useState(item.task);
  const [owner, setOwner] = useState(item.owner ?? "");
  const [due, setDue] = useState(item.due ?? "");
  const [saving, setSaving] = useState(false);
  useSaveGuard(saving);
  const [error, setError] = useState<string | null>(null);
  const over = task.length > MAX_EDIT_CHARS;
  const empty = !task.trim();

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving || over || empty) return;
    const patch: ActionItemEdit = { task, owner: owner.trim() || null, due: due || null };
    if (patch.task.trim() === item.task.trim() && patch.owner === item.owner && patch.due === item.due) return onDone();
    setSaving(true);
    setError(null);
    const err = await onSave(patch);
    setSaving(false);
    if (err) setError(err);
    else onDone();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onDone();
    } else if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName === "TEXTAREA") {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} onKeyDown={onKey}>
      <textarea
        autoFocus
        aria-label="Task"
        className={styles.text}
        value={task}
        onChange={(e) => setTask(e.target.value)}
        aria-invalid={over || empty || undefined}
        onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
      />
      <div className={styles.fields}>
        <label className={styles.label}>
          Owner
          <input
            className={styles.input}
            value={owner}
            maxLength={MAX_OWNER_CHARS}
            placeholder="Not stated"
            onChange={(e) => setOwner(e.target.value)}
          />
        </label>
        <label className={styles.label}>
          Due
          <input className={styles.input} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
      </div>
      <div className={styles.footer}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          <span className={styles.count} data-over={over || undefined}>
            {task.length > MAX_EDIT_CHARS - 100 ? `${task.length}/${MAX_EDIT_CHARS}` : ""}
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

export default ActionItem;
