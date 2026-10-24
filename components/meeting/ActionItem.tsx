"use client";

import type { ActionItem as ActionItemData, Segment, Speaker } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { ConfidenceFlag } from "./ConfidenceFlag";
import { NotStated } from "./NotStated";
import { EvidenceQuotes, speakerColor } from "./QuoteChip";

export interface ActionItemProps {
  item: ActionItemData;
  segments: Segment[];
  speakers: Speaker[];
  onSeek(s: number): void;
  /** Id of the segment playing now: its chip is highlighted and kept visible. */
  activeId?: string;
}

const metaChip = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  font: "500 12px/1 var(--font-sans)",
  color: "var(--ink-700)",
} as const;

export function ActionItem({ item, segments, speakers, onSeek, activeId }: ActionItemProps) {
  const due = item.due
    ? item.due_phrase
      ? `${item.due_phrase} (${item.due})`
      : item.due
    : item.due_phrase;
  const ownerSpeaker = item.owner ? speakers.find((s) => s.name === item.owner) : undefined;
  const ownerColor = ownerSpeaker ? speakerColor(speakers, ownerSpeaker.id) : undefined;
  return (
    <div className="action-item" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", minWidth: 0 }}>
      <p
        className="action-item__task"
        style={{
          margin: 0,
          font: item.edited_by_human ? "var(--type-human)" : "400 14.5px/1.5 var(--font-sans)",
          color: item.edited_by_human ? "var(--human-text)" : "var(--text-1)",
          textWrap: "pretty",
        }}
      >
        {item.task}
      </p>
      <p className="action-item__meta" style={{ margin: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <span className="action-item__owner" style={{ ...metaChip, gap: 6, fontSize: 12.5 }}>
          {item.owner ? (
            <>
              <Avatar name={item.owner} color={ownerColor} size={20} />
              {item.owner}
            </>
          ) : (
            <NotStated what="Owner" />
          )}
        </span>
        <span className="action-item__due" style={metaChip}>
          {due ? (
            <span
              style={{
                ...metaChip,
                gap: 5,
                padding: "0 7px",
                borderRadius: "var(--radius-xs)",
                background: "var(--paper-150)",
              }}
            >
              <Icon name="calendar" size={12} />
              {due}
            </span>
          ) : (
            <NotStated what="Date" />
          )}
        </span>
        <ConfidenceFlag confidence={item.confidence} />
      </p>
      <EvidenceQuotes evidence={item.evidence} segments={segments} speakers={speakers} onSeek={onSeek} activeId={activeId} />
    </div>
  );
}

export default ActionItem;
