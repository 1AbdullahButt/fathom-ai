"use client";

import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Spinner } from "./Spinner";

const SIZES = {
  sm: { h: 28, px: 10, fs: 13, gap: 6, ic: 15 },
  md: { h: 36, px: 14, fs: 14, gap: 8, ic: 17 },
  lg: { h: 44, px: 18, fs: 15, gap: 8, ic: 18 },
} as const;

const VARIANTS = {
  primary: { bg: "var(--accent)", h: "var(--accent-hover)", p: "var(--accent-press)", fg: "var(--text-on-accent)", bd: "transparent" },
  secondary: { bg: "var(--surface-card)", h: "var(--surface-hover)", p: "var(--paper-200)", fg: "var(--text-1)", bd: "var(--line-2)" },
  ghost: { bg: "transparent", h: "var(--surface-hover)", p: "var(--paper-200)", fg: "var(--text-1)", bd: "transparent" },
  danger: { bg: "var(--surface-card)", h: "var(--danger-soft)", p: "var(--rust-100)", fg: "var(--danger-text)", bd: "var(--rust-100)" },
  player: { bg: "rgba(255,255,255,.08)", h: "rgba(255,255,255,.14)", p: "rgba(255,255,255,.2)", fg: "var(--text-on-player)", bd: "transparent" },
} as const;

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "style"> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  icon?: string;
  iconRight?: string;
  iconColor?: string;
  loading?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit";
  children?: ReactNode;
  style?: CSSProperties;
}

/** Text button for primary/secondary actions; Record and Upload always render as an equal pair. */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  iconColor,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = "button",
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const s = SIZES[size];
  const v = VARIANTS[variant];
  const off = disabled || loading;
  return (
    <button
      type={type}
      disabled={off}
      aria-busy={loading || undefined}
      onMouseEnter={(e) => { setHover(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHover(false); setPress(false); onMouseLeave?.(e); }}
      onMouseDown={(e) => { setPress(true); onMouseDown?.(e); }}
      onMouseUp={(e) => { setPress(false); onMouseUp?.(e); }}
      style={{
        display: fullWidth ? "flex" : "inline-flex",
        width: fullWidth ? "100%" : undefined,
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${v.bd}`,
        background: off ? v.bg : press ? v.p : hover ? v.h : v.bg,
        color: v.fg,
        font: `500 ${s.fs}px/1 var(--font-sans)`,
        whiteSpace: "nowrap",
        cursor: off ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background var(--dur-1) var(--ease-out)",
        boxShadow: variant === "secondary" ? "var(--shadow-1)" : "none",
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <Spinner size={s.ic} color="currentColor" />
      ) : icon ? (
        <Icon name={icon} size={s.ic} color={iconColor || "currentColor"} />
      ) : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={s.ic} /> : null}
    </button>
  );
}

export default Button;
