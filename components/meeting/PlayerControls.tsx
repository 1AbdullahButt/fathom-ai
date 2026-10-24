"use client";

import { useRef, useState, type PointerEvent } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { formatTimestamp } from "@/lib/time";

export interface PlayerControlsProps {
  playing: boolean;
  current: number;
  duration: number;
  onToggle(): void;
  onSeek(s: number): void;
  rate?: number;
  onRate?(): void;
  compact?: boolean;
  /** Chapter starts: a small tick on the scrubber for each chapter after the first. */
  chapters?: { start_s: number; title: string }[];
}

/** Night-surface scrubber + transport (back 10 s, play/pause, forward 10 s, speed). */
export function PlayerControls({ playing, current, duration, onToggle, onSeek, rate = 1, onRate, compact = false, chapters = [] }: PlayerControlsProps) {
  const bar = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  const d = duration > 0 ? duration : 1;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / d) * 100))}%`;
  const at = (e: PointerEvent) => {
    const r = bar.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * d;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? 4 : 8,
        padding: compact ? "6px 10px 8px" : "10px 14px 12px",
        background: "var(--surface-player)",
        color: "var(--text-on-player)",
      }}
    >
      <div
        ref={bar}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(d)}
        aria-valuenow={Math.round(current)}
        aria-valuetext={`${formatTimestamp(current)} of ${formatTimestamp(d)}`}
        tabIndex={0}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onSeek(at(e));
        }}
        onPointerMove={(e) => {
          setHover(at(e));
          if (dragging.current) onSeek(at(e));
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onSeek(Math.min(d, current + 5));
          else if (e.key === "ArrowLeft") onSeek(Math.max(0, current - 5));
          else return;
          e.preventDefault();
        }}
        style={{ position: "relative", height: 16, cursor: "pointer", display: "flex", alignItems: "center", touchAction: "none" }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: "var(--night-700)" }} />
        <div style={{ position: "absolute", left: 0, width: pct(current), height: 4, borderRadius: 2, background: "var(--tide-200)" }} />
        {chapters.slice(1).map((c) => (
          <div
            key={c.start_s}
            title={c.title}
            aria-hidden="true"
            style={{ position: "absolute", left: pct(c.start_s), width: 2, height: 8, marginLeft: -1, background: "var(--surface-player)" }}
          />
        ))}
        {hover != null ? (
          <div
            style={{
              position: "absolute",
              left: pct(hover),
              bottom: 16,
              transform: "translateX(-50%)",
              padding: "3px 6px",
              borderRadius: 4,
              background: "var(--night-700)",
              font: "400 11px/1 var(--font-mono)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {formatTimestamp(hover)}
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: pct(current),
            width: 12,
            height: 12,
            marginLeft: -6,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,.4)",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: compact ? 2 : 6 }}>
        <IconButton icon="rotate-ccw" label="Back 10 seconds" variant="player" size="sm" onClick={() => onSeek(Math.max(0, current - 10))} />
        <IconButton icon={playing ? "pause" : "play"} label={playing ? "Pause" : "Play"} variant="playerPrimary" size="md" onClick={onToggle} />
        <IconButton icon="rotate-cw" label="Forward 10 seconds" variant="player" size="sm" onClick={() => onSeek(Math.min(d, current + 10))} />
        <span
          style={{
            marginLeft: 6,
            font: "400 12.5px/1 var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            color: "var(--text-on-player)",
            whiteSpace: "nowrap",
          }}
        >
          {formatTimestamp(current)}
          <span style={{ color: "var(--text-on-player-muted)" }}> / {formatTimestamp(d)}</span>
        </span>
        <span style={{ flex: 1 }} />
        {onRate ? (
          <button
            type="button"
            onClick={onRate}
            aria-label={`Playback speed ${rate}×`}
            style={{
              height: 28,
              minWidth: 40,
              padding: "0 8px",
              border: 0,
              borderRadius: "var(--radius-sm)",
              background: "rgba(255,255,255,.08)",
              color: "var(--text-on-player)",
              font: "500 12px/1 var(--font-mono)",
              cursor: "pointer",
            }}
          >
            {rate}×
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default PlayerControls;
