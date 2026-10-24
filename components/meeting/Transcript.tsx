"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import type { Segment, Speaker } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StateBlock } from "@/components/ui/StateBlock";
import { speakerColor } from "./QuoteChip";
import { TranscriptLine } from "./TranscriptLine";

export interface TranscriptProps {
  segments: Segment[];
  speakers: Speaker[];
  activeIndex: number;
  onSeek(s: number): void;
  follow: boolean;
  onFollowChange(follow: boolean): void;
  /** Bumped on every jump (quote click, ?t=) so the active line is re-centred even if unchanged. */
  jumpKey: number;
}

/** A new speaker block starts on a speaker change or after a 30 s pause (design kit rule). */
const GAP_S = 30;
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/**
 * The scrolling transcript. Memoised: it re-renders only when the active index (not the clock)
 * changes, and each TranscriptLine is memoised, so a tick touches at most two lines.
 */
function TranscriptImpl({ segments, speakers, activeIndex, onSeek, follow, onFollowChange, jumpKey }: TranscriptProps) {
  const box = useRef<HTMLDivElement>(null);
  const lastJump = useRef(-1);

  const rows = useMemo(() => {
    const byId = new Map(speakers.map((s) => [s.id, s]));
    return segments.map((seg, i) => {
      const prev = segments[i - 1];
      return {
        seg,
        speaker: byId.get(seg.speaker_id),
        color: speakerColor(speakers, seg.speaker_id),
        showSpeaker: !prev || prev.speaker_id !== seg.speaker_id || seg.start_s - prev.end_s > GAP_S,
      };
    });
  }, [segments, speakers]);

  // Auto-follow: keep the active line about a quarter from the top.
  const followRef = useRef(follow);
  useEffect(() => {
    followRef.current = follow;
  }, [follow]);
  useEffect(() => {
    const c = box.current;
    if (!c || activeIndex < 0) return;
    const forced = jumpKey !== lastJump.current;
    if (!follow && !forced) return;
    lastJump.current = jumpKey;
    const id = segments[activeIndex].id;
    const find = () => c.querySelector<HTMLElement>(`[data-segment-id="${CSS.escape(id)}"]`);
    /** Line top relative to the scroll box's visible top. */
    const offset = (el: HTMLElement) => el.getBoundingClientRect().top - c.getBoundingClientRect().top;
    const target = () => c.clientHeight * 0.25;
    const place = (smooth: boolean) => {
      const el = find();
      if (!el || c.clientHeight === 0) return;
      c.scrollTo({ top: Math.max(0, c.scrollTop + offset(el) - target()), behavior: smooth ? "smooth" : "auto" });
    };

    if (!forced) {
      const el = find();
      if (!el) return;
      const top = offset(el);
      if (top >= 40 && top <= c.clientHeight * 0.6) return;
      place(true);
      return;
    }

    // A jump (quote chip, ?t=). On phones the transcript tab may have only just been shown, and
    // fonts may still swap in, so place the line after layout settles (two frames), then check it
    // once more a little later and correct if it drifted.
    let f1 = 0;
    let f2 = 0;
    let cancelled = false;
    const recheck = () => {
      if (cancelled || !followRef.current) return;
      const el = find();
      if (el && Math.abs(offset(el) - target()) > 24) place(false);
    };
    f1 = requestAnimationFrame(() => {
      f2 = requestAnimationFrame(() => place(false));
    });
    const timer = window.setTimeout(recheck, 350);
    void document.fonts?.ready.then(recheck);
    return () => {
      cancelled = true;
      cancelAnimationFrame(f1);
      cancelAnimationFrame(f2);
      window.clearTimeout(timer);
    };
  }, [activeIndex, follow, jumpKey, segments]);

  // Any scroll the user starts pauses follow.
  useEffect(() => {
    const c = box.current;
    if (!c) return;
    const stop = () => onFollowChange(false);
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key) && e.target === c) stop();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.target === c) stop(); // scrollbar drag
    };
    c.addEventListener("wheel", stop, { passive: true });
    c.addEventListener("touchmove", stop, { passive: true });
    c.addEventListener("keydown", onKey);
    c.addEventListener("pointerdown", onPointer);
    return () => {
      c.removeEventListener("wheel", stop);
      c.removeEventListener("touchmove", stop);
      c.removeEventListener("keydown", onKey);
      c.removeEventListener("pointerdown", onPointer);
    };
  }, [onFollowChange]);

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        ref={box}
        tabIndex={0}
        aria-label="Transcript"
        style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 8px 96px", outline: "none" }}
      >
        {rows.length ? (
          rows.map((r, i) => (
            <TranscriptLine
              key={r.seg.id}
              segment={r.seg}
              speaker={r.speaker}
              color={r.color}
              showSpeaker={r.showSpeaker}
              active={i === activeIndex}
              onSeek={onSeek}
            />
          ))
        ) : (
          <StateBlock compact kind="empty" icon="file-text" title="No transcript yet" body="Transcript lines appear here once the recording has been transcribed." />
        )}
      </div>
      {!follow && rows.length ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <span style={{ pointerEvents: "auto", boxShadow: "var(--shadow-2)", borderRadius: "var(--radius-sm)" }}>
            <Button size="sm" icon="captions" onClick={() => onFollowChange(true)}>
              Resume follow
            </Button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

export const Transcript = memo(TranscriptImpl);
export default Transcript;
