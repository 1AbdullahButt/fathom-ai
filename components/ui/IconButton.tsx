"use client";

import { useState, type ButtonHTMLAttributes, type CSSProperties } from "react";
import { Icon } from "./Icon";

const SIZES = {
  sm: { d: 28, i: 16 },
  md: { d: 36, i: 18 },
  lg: { d: 44, i: 20 },
  xl: { d: 56, i: 24 },
} as const;

const VARIANTS = {
  ghost: { bg: "transparent", h: "var(--surface-hover)", fg: "var(--text-2)", bd: "transparent", a: "var(--accent-soft)", afg: "var(--accent)" },
  secondary: { bg: "var(--surface-card)", h: "var(--surface-hover)", fg: "var(--text-1)", bd: "var(--line-2)", a: "var(--accent-soft)", afg: "var(--accent)" },
  player: { bg: "transparent", h: "rgba(255,255,255,.12)", fg: "var(--text-on-player)", bd: "transparent", a: "rgba(255,255,255,.16)", afg: "#fff" },
  playerPrimary: { bg: "var(--paper-0)", h: "var(--paper-150)", fg: "var(--ink-900)", bd: "transparent", a: "var(--paper-0)", afg: "var(--ink-900)" },
} as const;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style" | "children"> {
  icon: string;
  /** Required accessible name; also shown as the tooltip. */
  label: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  active?: boolean;
  round?: boolean;
  style?: CSSProperties;
}

/** Icon-only button. Always has an aria-label. */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  active = false,
  disabled = false,
  round,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: IconButtonProps) {
  const [hover, setHover] = useState(false);
  const s = SIZES[size];
  const v = VARIANTS[variant];
  const isRound = round ?? variant === "playerPrimary";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      onMouseEnter={(e) => { setHover(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHover(false); onMouseLeave?.(e); }}
      style={{
        width: s.d,
        height: s.d,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: isRound ? "50%" : "var(--radius-sm)",
        border: `1px solid ${v.bd}`,
        background: active ? v.a : hover && !disabled ? v.h : v.bg,
        color: active ? v.afg : v.fg,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        padding: 0,
        transition: "background var(--dur-1) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={s.i} strokeWidth={variant === "playerPrimary" ? 2 : 1.75} />
    </button>
  );
}

export default IconButton;
