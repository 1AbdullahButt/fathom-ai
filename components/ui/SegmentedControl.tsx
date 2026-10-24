"use client";

import { Icon } from "./Icon";

export type SegmentOption = string | { value: string; label: string; icon?: string };

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
  /** Accessible name for the radiogroup. */
  label?: string;
}

/** Compact exclusive switch for views/filters (Transcript / Chapters, All / Uploaded / Recorded). */
export function SegmentedControl({ options, value, onChange, size = "md", fullWidth = false, label }: SegmentedControlProps) {
  const h = size === "sm" ? 28 : 34;
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o, icon: undefined } : o));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{ display: fullWidth ? "flex" : "inline-flex", padding: 2, gap: 2, borderRadius: "var(--radius-sm)", background: "var(--paper-150)" }}
    >
      {opts.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            type="button"
            onClick={() => onChange?.(o.value)}
            style={{
              flex: fullWidth ? 1 : "none",
              height: h - 4,
              padding: "0 10px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              border: 0,
              borderRadius: 4,
              cursor: "pointer",
              background: on ? "var(--surface-card)" : "transparent",
              boxShadow: on ? "var(--shadow-1)" : "none",
              color: on ? "var(--text-1)" : "var(--text-2)",
              font: "500 13px/1 var(--font-sans)",
              whiteSpace: "nowrap",
            }}
          >
            {o.icon ? <Icon name={o.icon} size={15} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
