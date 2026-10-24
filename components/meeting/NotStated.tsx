import { Icon } from "@/components/ui/Icon";

export interface NotStatedProps {
  /** What was not stated, e.g. "Owner" or "Date". */
  what: string;
}

/** Shown instead of an invented value when the meeting did not state one. */
export function NotStated({ what }: NotStatedProps) {
  const key = what.toLowerCase();
  const icon = key === "date" ? "calendar" : key === "owner" ? "user" : "circle-help";
  return (
    <span
      className="not-stated"
      title={`No ${key} was said in the meeting`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 22,
        padding: "0 7px",
        borderRadius: "var(--radius-xs)",
        border: "1px dashed var(--paper-300)",
        color: "var(--text-muted)",
        font: "italic 400 12px/1 var(--font-sans)",
        whiteSpace: "nowrap",
      }}
    >
      <Icon name={icon} size={12} />
      {what} not stated
    </span>
  );
}

export default NotStated;
