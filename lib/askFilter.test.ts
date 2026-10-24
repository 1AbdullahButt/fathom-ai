// Deterministic tests for the Ask post-filter (lib/askFilter.ts). Lives in lib/ because tests/
// is locked (CLAUDE.md); the human asked for this test (DECISIONS.md). Segment text is copied
// from the m1 fixture ("Weekly product sync").
import { describe, expect, it } from "vitest";
import { filterClaims, NOT_FOUND, type RetrievedSegment } from "./askFilter";

const M1: [string, string][] = [
  ["m1-s1", "Okay, let's start. Two things today: the onboarding drop-off and the release date."],
  ["m1-s2", "Drop-off is mostly at the phone verification step. About 40 percent leave there."],
  ["m1-s3", "That's a lot. Omar, can you look at whether the SMS code is arriving late? Please have a finding by Thursday."],
  ["m1-s4", "Sure, I'll check the provider logs by Thursday."],
  ["m1-s5", "On the release, marketing wants the 15th, but I think the 22nd is safer."],
  ["m1-s6", "I agree with the 22nd, QA needs the extra week."],
  ["m1-s7", "Fine, we go with the 22nd. I'll tell marketing today."],
  ["m1-s8", "One more thing, we should probably think about dark mode at some point."],
];
const retrieved = new Map<string, RetrievedSegment>(M1.map(([id, text]) => [id, { meeting_id: "m1", text }]));
const ids = (r: { citations: { segment_id: string }[] }) => r.citations.map((c) => c.segment_id);

describe("filterClaims", () => {
  it("collapses near-duplicate claims into one and merges their citations", () => {
    const r = filterClaims(
      "What did Omar commit to?",
      [
        { text: "Omar committed to checking the provider logs by Thursday.", citations: ["m1-s4"] },
        { text: "Omar committed to check the provider logs by Thursday.", citations: ["m1-s3", "m1-s4"] },
        { text: "Omar will check provider logs by Thursday!", citations: ["m1-s4"] },
      ],
      retrieved,
    );
    expect(r.claims).toHaveLength(1);
    expect(r.answer).toBe("Omar committed to checking the provider logs by Thursday.");
    expect(ids(r)).toEqual(["m1-s4", "m1-s3"]);
    expect(r.claims![0].citations.map((c) => c.segment_id)).toEqual(["m1-s4", "m1-s3"]);
  });

  it("drops the dark-mode suggestion for a commitment question and keeps the real commitment", () => {
    const r = filterClaims(
      "What did Omar commit to?",
      [
        { text: "Sure, I'll check the provider logs by Thursday, Omar said.", citations: ["m1-s4"] },
        { text: "Omar committed to thinking about dark mode at some point.", citations: ["m1-s8"] },
        { text: "Omar suggested looking at dark mode.", citations: ["m1-s8"] },
      ],
      retrieved,
    );
    expect(r.answer).toBe("Sure, I'll check the provider logs by Thursday, Omar said.");
    expect(ids(r)).toEqual(["m1-s4"]);
    expect(r.answer).not.toMatch(/dark mode/i);
  });

  it("never lets a claim say 'committed to' on a hedged suggestion, whatever the question", () => {
    const r = filterClaims(
      "What did Omar say about dark mode?",
      [
        { text: "Omar committed to dark mode.", citations: ["m1-s8"] },
        { text: "Omar suggested thinking about dark mode at some point.", citations: ["m1-s8"] },
      ],
      retrieved,
    );
    expect(r.answer).toBe("Omar suggested thinking about dark mode at some point.");
    expect(ids(r)).toEqual(["m1-s8"]);
  });

  it("drops uncited claims and claims citing ids outside the retrieved set", () => {
    const r = filterClaims(
      "What was decided about the release?",
      [
        { text: "The budget is 10k.", citations: [] },
        { text: "The release moved to the 29th.", citations: ["m9-s1"] },
        { text: "The release is on the 22nd.", citations: ["m1-s7", "nope"] },
      ],
      retrieved,
    );
    expect(r.answer).toBe("The release is on the 22nd.");
    expect(ids(r)).toEqual(["m1-s7"]);
  });

  it("keeps at most 3 sentences, in order", () => {
    const r = filterClaims(
      "What happened in the sync?",
      [
        { text: "Drop-off is about 40 percent at phone verification.", citations: ["m1-s2"] },
        { text: "Sara asked Omar to look at late SMS codes.", citations: ["m1-s3"] },
        { text: "Marketing wanted the 15th.", citations: ["m1-s5"] },
        { text: "QA needs the extra week.", citations: ["m1-s6"] },
        { text: "Sara will tell marketing today.", citations: ["m1-s7"] },
      ],
      retrieved,
    );
    expect(r.claims!.map((c) => c.text)).toEqual([
      "Drop-off is about 40 percent at phone verification.",
      "Sara asked Omar to look at late SMS codes.",
      "Marketing wanted the 15th.",
    ]);
    expect(ids(r)).toEqual(["m1-s2", "m1-s3", "m1-s5"]);
  });

  it("returns exactly the sentinel when every claim is dropped", () => {
    const r = filterClaims(
      "What did Omar promise?",
      [
        { text: "Omar promised dark mode.", citations: ["m1-s8"] },
        { text: "The budget is 10k.", citations: ["m2-s9"] },
      ],
      retrieved,
    );
    expect(r).toEqual({ answer: NOT_FOUND, citations: [], claims: [] });
    expect(filterClaims("anything", [], retrieved)).toEqual({ answer: NOT_FOUND, citations: [], claims: [] });
  });
});
