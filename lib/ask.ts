import type { Meeting, Segment } from "./types";

export interface AskResult {
  answer: string;
  citations: { meeting_id: string; segment_id: string }[];
}

/**
 * Answer only from cited segments; no supporting segments means
 * answer exactly "not found in meetings" with citations []. Implemented in P2-4.
 */
export async function ask(
  question: string,
  corpus: { meeting: Meeting; segments: Segment[] }[],
): Promise<AskResult> {
  void question;
  void corpus;
  throw new Error("not implemented");
}
