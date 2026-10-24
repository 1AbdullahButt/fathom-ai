import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export interface HumanEditProps {
  children: ReactNode;
  /** Show the small "Edited" chip after the text. */
  showMark?: boolean;
}

/**
 * Text written by a person (design/components/meeting/HumanEdit.jsx): Newsreader serif in
 * --human-text plus a pencil "Edited" chip, so it is never confused with AI text (sans, ink).
 * No accounts, so the chip says "Edited" instead of the editor's name.
 */
export function HumanEdit({ children, showMark = true }: HumanEditProps) {
  return (
    <span style={{ font: "var(--type-human)", color: "var(--human-text)" }}>
      {children}
      {showMark ? (
        <span
          title="Edited by a person"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            marginLeft: 6,
            verticalAlign: "1px",
            padding: "2px 5px",
            borderRadius: "var(--radius-xs)",
            background: "var(--human-soft)",
            color: "var(--human-mark)",
            font: "500 11px/1 var(--font-sans)",
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="pencil" size={10} strokeWidth={2.25} />
          Edited
        </span>
      ) : null}
    </span>
  );
}

export default HumanEdit;
