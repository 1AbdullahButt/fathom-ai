import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { Spinner } from "./Spinner";

const KINDS = {
  empty: ["inbox", "var(--paper-150)", "var(--ink-500)"],
  noResults: ["search", "var(--paper-150)", "var(--ink-500)"],
  error: ["circle-alert", "var(--danger-soft)", "var(--danger)"],
  offline: ["wifi-off", "var(--danger-soft)", "var(--danger)"],
  notFound: ["link", "var(--paper-150)", "var(--ink-500)"],
  locked: ["lock", "var(--paper-150)", "var(--ink-500)"],
  processing: ["audio-lines", "var(--accent-soft)", "var(--accent)"],
} as const;

export interface StateBlockProps {
  kind?: keyof typeof KINDS;
  icon?: string;
  title?: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  loading?: boolean;
  /** Render the title as the page's <h1> (full-page states such as 404s). */
  titleAsHeading?: boolean;
}

/** Centered empty / error / not-found / processing message with optional actions. */
export function StateBlock({ kind = "empty", icon, title, body, actions, compact = false, loading = false, titleAsHeading = false }: StateBlockProps) {
  const [ic, bg, fg] = KINDS[kind];
  const d = compact ? 36 : 48;
  const titleStyle = { font: `600 ${compact ? 14 : 16}px/1.35 var(--font-sans)`, color: "var(--text-1)", textWrap: "balance" } as const;
  return (
    <div
      role={kind === "error" || kind === "offline" ? "alert" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: compact ? 8 : 12,
        padding: compact ? "24px 16px" : "48px 24px",
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      <span
        style={{ width: d, height: d, borderRadius: "50%", background: bg, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        {loading ? <Spinner size={compact ? 18 : 22} /> : <Icon name={icon || ic} size={compact ? 18 : 22} />}
      </span>
      {title ? (
        titleAsHeading ? (
          <h1 style={{ margin: 0, ...titleStyle }}>{title}</h1>
        ) : (
          <div style={titleStyle}>{title}</div>
        )
      ) : null}
      {body ? (
        <div style={{ font: `400 ${compact ? 13 : 14}px/1.55 var(--font-sans)`, color: "var(--text-muted)", textWrap: "pretty" }}>{body}</div>
      ) : null}
      {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>{actions}</div> : null}
    </div>
  );
}

export default StateBlock;
