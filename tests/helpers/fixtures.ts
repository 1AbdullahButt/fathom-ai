// Typed access to the locked fixtures (tests/fixtures). Shared by unit, component and eval tests.
import type { ActionItem, Meeting, Segment, SummaryPoint } from "@/lib/types";
import m1 from "../fixtures/meeting1.json";
import m2 from "../fixtures/meeting2.json";
import e1 from "../fixtures/meeting1.expected.json";
import e2 from "../fixtures/meeting2.expected.json";

export interface Fixture {
  meeting: Meeting;
  segments: Segment[];
}

export interface ExpectedActionItem {
  task: string;
  owner: string | null;
  due: string | null;
  due_phrase: string | null;
  confidence: "high" | "low";
  evidence: string[];
}

export interface Expected {
  meeting_id: string;
  meeting_date: string;
  summary: { text: string; evidence: string[] }[];
  action_items: ExpectedActionItem[];
  mustNotInclude: string[];
}

export const meeting1 = m1 as unknown as Fixture;
export const meeting2 = m2 as unknown as Fixture;
export const expected1 = e1 as unknown as Expected;
export const expected2 = e2 as unknown as Expected;

export const corpus: Fixture[] = [meeting1, meeting2];

export function segmentIds(f: Fixture): string[] {
  return f.segments.map((s) => s.id);
}

/** A deep copy of the raw LLM-shaped payload ({summary, action_items}) for an expected file. */
export function rawFromExpected(e: Expected): {
  summary: Expected["summary"];
  action_items: ExpectedActionItem[];
} {
  return JSON.parse(JSON.stringify({ summary: e.summary, action_items: e.action_items }));
}

export function toActionItem(e: ExpectedActionItem, meetingId: string, id: string): ActionItem {
  return { ...e, evidence: [...e.evidence], id, meeting_id: meetingId, edited_by_human: false };
}

export function toSummaryPoint(p: { text: string; evidence: string[] }): SummaryPoint {
  return { text: p.text, evidence: [...p.evidence] };
}
