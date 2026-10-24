"use client";

import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type SelectOption = string | { value: string; label: string };

export interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  /** Inline label, also the accessible name of the native select. */
  label?: string;
  icon?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  style?: CSSProperties;
}

/** Native-select dropdown with an inline label (design/components/forms/Select.jsx). */
export function Select({ value, options, onChange, label, icon, size = "md", disabled = false, style }: SelectProps) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = opts.find((o) => o.value === value) ?? opts[0];
  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: size === "sm" ? 28 : 36,
        padding: "0 30px 0 10px",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-card)",
        border: "1px solid var(--line-2)",
        boxShadow: "var(--shadow-1)",
        font: `500 ${size === "sm" ? 13 : 14}px/1 var(--font-sans)`,
        color: "var(--text-1)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={16} color="var(--text-muted)" /> : null}
      {label ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{label}</span> : null}
      <span aria-hidden="true">{current?.label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "inherit", font: "inherit", width: "100%" }}
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)", display: "inline-flex" }}
      >
        <Icon name="chevron-down" size={15} />
      </span>
    </label>
  );
}

export default Select;
