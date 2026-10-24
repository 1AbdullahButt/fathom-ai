"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Segment } from "@/lib/types";
import { formatTimestamp } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { NoteForm } from "./NoteForm";
import styles from "./Highlights.module.css";

export interface SelectionHighlighterProps {
  /** Element that contains the transcript lines (`[data-segment-id]`). */
  container: RefObject<HTMLElement | null>;
  segments: Segment[];
  /** Save [start_s, end_s] with a note; resolves true when saved. */
  onSave(start_s: number, end_s: number, note: string): Promise<boolean>;
}

interface Picked {
  start_s: number;
  end_s: number;
  x: number;
  y: number;
  below: boolean;
}

/** Room needed above the selection for the button; otherwise it goes below. */
const ABOVE_MIN = 64;

/** The transcript lines a DOM range covers, in order; a range that ends at offset 0 of a line excludes it. */
function linesIn(root: HTMLElement, r: Range): HTMLElement[] {
  const lines = [...root.querySelectorAll<HTMLElement>("[data-segment-id]")].filter((el) => r.intersectsNode(el));
  if (lines.length > 1) {
    const last = lines[lines.length - 1];
    const tail = document.createRange();
    tail.setStart(last, 0);
    tail.setEnd(r.endContainer, r.endOffset);
    if (!tail.toString().trim()) lines.pop();
  }
  return lines;
}

/**
 * Select transcript text -> a floating "Highlight" button -> a small note form -> save the range
 * from the first selected line's start to the last one's end (PLAN.md P1-3).
 */
export function SelectionHighlighter({ container, segments, onSave }: SelectionHighlighterProps) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [form, setForm] = useState(false);
  const pop = useRef<HTMLDivElement>(null);

  const read = useCallback((): Picked | null => {
    const root = container.current;
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (!root || !sel || sel.isCollapsed || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    if (!root.contains(r.commonAncestorContainer)) return null;
    if (!sel.toString().trim()) return null;
    const lines = linesIn(root, r);
    if (!lines.length) return null;
    const byId = new Map(segments.map((s) => [s.id, s]));
    const first = byId.get(lines[0].dataset.segmentId ?? "");
    const last = byId.get(lines[lines.length - 1].dataset.segmentId ?? "");
    if (!first || !last) return null;
    const rect = r.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    // Keep the popover over the transcript even when the selection runs out of view.
    const top = Math.max(rect.top, box.top);
    const below = top - box.top < ABOVE_MIN && rect.bottom + 8 < window.innerHeight - 140;
    const x = Math.min(Math.max(rect.left + rect.width / 2, 176), window.innerWidth - 176);
    return {
      start_s: Math.min(first.start_s, last.start_s),
      end_s: Math.max(first.end_s, last.end_s),
      x,
      y: below ? Math.min(rect.bottom, box.bottom - 8) : top,
      below,
    };
  }, [container, segments]);

  useEffect(() => {
    if (form) return;
    const update = () => setPicked(read());
    document.addEventListener("selectionchange", update);
    // Fixed position: follow the text when the transcript scrolls.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [form, read]);

  const close = useCallback(() => {
    setForm(false);
    setPicked(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // A click outside the open note form cancels it.
  useEffect(() => {
    if (!form) return;
    const onDown = (e: PointerEvent) => {
      if (pop.current && !pop.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [form, close]);

  if (!picked) return null;
  const range = `${formatTimestamp(picked.start_s)}–${formatTimestamp(picked.end_s)}`;
  return (
    <div ref={pop} className={styles.popover} data-below={picked.below || undefined} style={{ left: picked.x, top: picked.y }}>
      {form ? (
        <div className={styles.popoverCard} role="dialog" aria-label="Save highlight">
          <NoteForm
            label={`Highlight ${range}`}
            submitLabel="Save highlight"
            onCancel={close}
            onSave={async (note) => {
              const ok = await onSave(picked.start_s, picked.end_s, note);
              if (ok) close();
              return ok;
            }}
          />
        </div>
      ) : (
        <span style={{ display: "inline-flex", boxShadow: "var(--shadow-3)", borderRadius: "var(--radius-sm)" }}>
          <Button
            size="sm"
            variant="primary"
            icon="bookmark"
            // Keep the text selection: a mousedown on a button would otherwise clear it.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setForm(true)}
          >
            Highlight
          </Button>
        </span>
      )}
    </div>
  );
}

export default SelectionHighlighter;
