import type { CSSProperties } from "react";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: string;
  lines?: number;
  gap?: number;
  style?: CSSProperties;
}

/** Shimmer placeholder; `lines` > 1 stacks bars with a short last line. */
export function Skeleton({ width = "100%", height = 12, radius = "var(--radius-xs)", lines = 1, gap = 8, style }: SkeletonProps) {
  const bar = (w: number | string, k: number) => (
    <span
      key={k}
      aria-hidden="true"
      style={{
        display: "block",
        width: w,
        height,
        borderRadius: radius,
        background: "linear-gradient(90deg,var(--paper-150) 0%,var(--paper-100) 50%,var(--paper-150) 100%)",
        backgroundSize: "480px 100%",
        animation: "sotto-shimmer 1.4s var(--ease-in-out) infinite",
        ...style,
      }}
    />
  );
  if (lines <= 1) return bar(width, 0);
  return (
    <span style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }, (_, i) => bar(i === lines - 1 ? "62%" : width, i))}
    </span>
  );
}

export default Skeleton;
