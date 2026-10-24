import type { ActionItem } from "@/lib/types";

export interface ConfidenceFlagProps {
  confidence: ActionItem["confidence"];
}

/** Renders a flag only for low-confidence items; high confidence renders nothing. */
export function ConfidenceFlag({ confidence }: ConfidenceFlagProps) {
  if (confidence !== "low") return null;
  return (
    <span className="confidence-flag" role="note" title="The meeting was vague about this item">
      Low confidence
    </span>
  );
}

export default ConfidenceFlag;
