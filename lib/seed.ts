// Seeded meetings: static JSON in seed/meetings/*.json, bundled through the generated
// seed/index.ts (scripts/build-seed.ts). Never touches Supabase, so the demo works even
// if the free Supabase project pauses.
import type { ActionItem, Chapter, Meeting, Segment, Summary, Template } from "./types";
import { seedFiles } from "../seed";

export interface SeedMeetingFile {
  meeting: Meeting;
  segments: Segment[];
  chapters: Chapter[];
  summaries: Partial<Record<Template, Summary>>;
  action_items: ActionItem[];
}

const byId = new Map<string, SeedMeetingFile>(seedFiles.map((f) => [f.meeting.id, f]));

/** All seeded meetings, newest first. */
export function seedMeetings(): SeedMeetingFile[] {
  return [...byId.values()].sort((a, b) => b.meeting.date.localeCompare(a.meeting.date));
}

export function seedMeeting(id: string): SeedMeetingFile | null {
  return byId.get(id) ?? null;
}

export function isSeedId(id: string): boolean {
  return byId.has(id);
}
