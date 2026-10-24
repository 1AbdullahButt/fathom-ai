// Shared domain types. Contract fixed in PLAN.md (Architecture: module contracts).

export type Template = "general" | "sales" | "one_on_one";

export interface Speaker {
  id: string;
  name: string;
}

export interface Segment {
  id: string;
  meeting_id: string;
  start_s: number;
  end_s: number;
  speaker_id: string;
  text: string;
}

export interface Meeting {
  id: string;
  title: string;
  /** ISO date */
  date: string;
  duration_s: number;
  media_url: string | null;
  speakers: Speaker[];
  status: "processing" | "ready" | "error";
  source: "seed" | "upload";
}

export interface SummaryPoint {
  text: string;
  /** segment ids, non-empty */
  evidence: string[];
  edited_by_human?: boolean;
}

export interface Summary {
  meeting_id: string;
  template: Template;
  points: SummaryPoint[];
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  task: string;
  owner: string | null;
  /** ISO date */
  due: string | null;
  due_phrase: string | null;
  confidence: "high" | "low";
  evidence: string[];
  edited_by_human: boolean;
}

export interface Highlight {
  id: string;
  meeting_id: string;
  start_s: number;
  end_s: number;
  note: string;
  created_at: string;
}

export interface Clip {
  id: string;
  meeting_id: string;
  start_s: number;
  end_s: number;
  title: string;
  public: true;
}

export interface Chapter {
  meeting_id: string;
  title: string;
  start_s: number;
}
