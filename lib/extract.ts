import type { Segment, Speaker, Template } from "./types";
import type { ValidationResult } from "./validate";

/**
 * One LLM call (strict JSON), validate, retry once on ok:false.
 * Relative dates resolve against meetingDate. Implemented in P0-6.
 */
export async function extract(
  segments: Segment[],
  speakers: Speaker[],
  meetingDate: string,
  template: Template,
): Promise<ValidationResult> {
  void segments;
  void speakers;
  void meetingDate;
  void template;
  throw new Error("not implemented");
}
