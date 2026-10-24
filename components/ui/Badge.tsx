import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

const TONES = {
  neutral: ["var(--paper-150)", "var(--ink-600)", "transparent"],
  outline: ["transparent", "var(--ink-600)", "var(--line-2)"],
  accent: ["var(--accent-soft)", "var(--tide-700)", "transparent"],
  warn: ["var(--warn-soft)", "var(--warn-text)", "transparent"],
  danger: ["var(--danger-soft)", "var(--danger-text)", "transparent"],
  human: ["var(--human-soft)", "var(--human-text)", "transparent"],
  dark: ["rgba(255,255,255,.12)", "var(--text-on-player)", "transparent"],
} as const;

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "style"> {
  tone?: keyof typeof TONES;
  size?: "sm" | "md";
  icon?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

/** Small static label for status/source/metadata. */
export function Badge({ tone = "neutral", size = "md", icon, children, style, ...rest }: BadgeProps) {
  const [bg, fg, bd] = TONES[tone];
  const sm = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: sm ? 20 : 24,
        padding: sm ? "0 6px" : "0 8px",
        borderRadius: "var(--radius-xs)",
        background: bg,
        color: fg,
        border: `1px solid ${bd}`,
        font: `500 ${sm ? 11.5 : 12}px/1 var(--font-sans)`,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={sm ? 12 : 13} strokeWidth={2} /> : null}
      {children}
    </span>
  );
}

export default Badge;
