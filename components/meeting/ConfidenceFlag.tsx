import type { ActionItem } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

export interface ConfidenceFlagProps {
  confidence: ActionItem["confidence"];
}

/** Renders a flag only for low-confidence items; high confidence renders nothing. */
export function ConfidenceFlag({ confidence }: ConfidenceFlagProps) {
  if (confidence !== "low") return null;
  return (
    <span
      className="confidence-flag"
      role="note"
      title="The meeting was vague about this item"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 22,
        padding: "0 7px",
        borderRadius: "var(--radius-xs)",
        background: "var(--warn-soft)",
        color: "var(--warn-text)",
        font: "500 12px/1 var(--font-sans)",
        whiteSpace: "nowrap",
      }}
    >
      <Icon name="triangle-alert" size={12} strokeWidth={2} />
      Low confidence
    </span>
  );
}

export default ConfidenceFlag;
