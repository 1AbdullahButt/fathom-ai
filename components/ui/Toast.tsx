"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

const TONES = {
  success: ["check", "var(--tide-200)"],
  error: ["circle-alert", "#F0A897"],
  info: ["info", "var(--night-300)"],
  link: ["link", "var(--tide-200)"],
} as const;

export interface ToastProps {
  tone?: keyof typeof TONES;
  title: ReactNode;
  body?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
}

/** Dark transient confirmation, bottom-center; optional single action (Undo). Positioning is the caller's. */
export function Toast({ tone = "success", title, body, actionLabel, onAction, onClose }: ToastProps) {
  const [ic, c] = TONES[tone];
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        width: "100%",
        maxWidth: 380,
        padding: "12px 12px 12px 14px",
        borderRadius: "var(--radius-md)",
        background: "var(--ink-900)",
        color: "var(--paper-50)",
        boxShadow: "var(--shadow-3)",
        animation: "sotto-fade-up var(--dur-3) var(--ease-out)",
      }}
    >
      <span style={{ color: c, paddingTop: 1 }}>
        <Icon name={ic} size={18} strokeWidth={2} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "500 14px/1.4 var(--font-sans)" }}>{title}</div>
        {body ? <div style={{ font: "400 13px/1.45 var(--font-sans)", color: "var(--night-300)", marginTop: 2 }}>{body}</div> : null}
      </div>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          style={{ background: "none", border: 0, color: "var(--tide-200)", font: "600 13px/1.4 var(--font-sans)", cursor: "pointer", padding: "0 4px" }}
        >
          {actionLabel}
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          style={{ background: "none", border: 0, color: "var(--night-300)", cursor: "pointer", padding: 0 }}
        >
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </div>
  );
}

export default Toast;
