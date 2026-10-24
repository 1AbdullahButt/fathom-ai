"use client";

import type { ActionItem as ActionItemData, Segment, Speaker } from "@/lib/types";
import { ConfidenceFlag } from "./ConfidenceFlag";
import { NotStated } from "./NotStated";
import { EvidenceQuotes } from "./QuoteChip";

export interface ActionItemProps {
  item: ActionItemData;
  segments: Segment[];
  speakers: Speaker[];
  onSeek(s: number): void;
}

export function ActionItem({ item, segments, speakers, onSeek }: ActionItemProps) {
  const due = item.due
    ? item.due_phrase
      ? `${item.due_phrase} (${item.due})`
      : item.due
    : item.due_phrase;
  return (
    <div className="action-item">
      <p className="action-item__task">{item.task}</p>
      <p className="action-item__meta">
        <span className="action-item__owner">{item.owner ?? <NotStated what="Owner" />}</span>
        {" · "}
        <span className="action-item__due">{due ?? <NotStated what="Date" />}</span>{" "}
        <ConfidenceFlag confidence={item.confidence} />
      </p>
      <EvidenceQuotes evidence={item.evidence} segments={segments} speakers={speakers} onSeek={onSeek} />
    </div>
  );
}

export default ActionItem;
