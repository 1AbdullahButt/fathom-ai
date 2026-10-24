// SPEC §7 Layer 1: schema_valid, evidence_valid, evidence_present, null_not_invented.
import { validateExtraction } from "@/lib/validate";
import {
  expected1,
  expected2,
  meeting1,
  meeting2,
  rawFromExpected,
  segmentIds,
} from "../helpers/fixtures";

const ids1 = segmentIds(meeting1);
const ids2 = segmentIds(meeting2);

function expectOk(r: ReturnType<typeof validateExtraction>) {
  if (!r.ok) throw new Error(`expected ok:true, got error: ${r.error}`);
  return r;
}

describe("schema_valid", () => {
  it("accepts the expected Meeting 1 output unchanged", () => {
    const r = expectOk(validateExtraction(rawFromExpected(expected1), ids1));
    expect(r.dropped).toBe(0);
    expect(r.summary).toHaveLength(2);
    expect(r.summary[0]).toMatchObject({ text: expected1.summary[0].text, evidence: ["m1-s2"] });
    expect(r.summary[1].evidence).toEqual(["m1-s5", "m1-s6", "m1-s7"]);
    expect(r.actionItems).toHaveLength(2);
    expect(r.actionItems[0]).toMatchObject({
      task: "Check SMS provider logs for delayed codes",
      owner: "Omar",
      due: "2026-10-22",
      due_phrase: "by Thursday",
      confidence: "high",
      evidence: ["m1-s3", "m1-s4"],
    });
    expect(r.actionItems[1]).toMatchObject({
      task: "Tell marketing the release is the 22nd",
      owner: "Sara",
      due: "2026-10-19",
      due_phrase: "today",
      confidence: "high",
      evidence: ["m1-s7"],
    });
  });

  it("accepts the expected Meeting 2 output unchanged", () => {
    const r = expectOk(validateExtraction(rawFromExpected(expected2), ids2));
    expect(r.dropped).toBe(0);
    expect(r.summary).toHaveLength(3);
    expect(r.actionItems).toHaveLength(2);
    expect(r.actionItems[0]).toMatchObject({ owner: "Sara", confidence: "high", evidence: ["m2-s4"] });
    expect(r.actionItems[1]).toMatchObject({ confidence: "low", evidence: ["m2-s5", "m2-s6"] });
  });

  const good = () => rawFromExpected(expected1);
  const withItem = (patch: Record<string, unknown>) => {
    const g = good();
    return { ...g, action_items: [{ ...g.action_items[0], ...patch }] };
  };
  const malformed: [string, () => unknown][] = [
    ["null", () => null],
    ["a string", () => "summary: none"],
    ["a number", () => 42],
    ["an array", () => []],
    ["an empty object (missing keys)", () => ({})],
    ["missing action_items", () => ({ summary: good().summary })],
    ["missing summary", () => ({ action_items: good().action_items })],
    ["summary is not an array", () => ({ ...good(), summary: "Onboarding drop-off" })],
    ["action_items is not an array", () => ({ ...good(), action_items: { task: "x" } })],
    ["summary point without text", () => ({ ...good(), summary: [{ evidence: ["m1-s2"] }] })],
    [
      "action item without task",
      () => {
        const g = good();
        const rest: Record<string, unknown> = { ...g.action_items[0] };
        delete rest.task;
        return { ...g, action_items: [rest] };
      },
    ],
    ["task is a number", () => withItem({ task: 7 })],
    ["owner is a number", () => withItem({ owner: 5 })],
    ["confidence outside high|low", () => withItem({ confidence: "medium" })],
    ["evidence is a string, not an array", () => withItem({ evidence: "m1-s3" })],
    [
      "evidence contains a non-string",
      () => {
        const g = good();
        return { ...g, summary: [{ ...g.summary[0], evidence: [12] }] };
      },
    ],
  ];

  it.each(malformed)("rejects malformed output: %s", (_name, make) => {
    const r = validateExtraction(make(), ids1);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(typeof r.error).toBe("string");
      expect(r.error.length).toBeGreaterThan(0);
    }
  });
});

describe("evidence_valid", () => {
  it("drops an action item that cites a segment id that does not exist, and counts it", () => {
    const raw = rawFromExpected(expected1);
    raw.action_items[0].evidence = ["m1-s99"];
    const r = expectOk(validateExtraction(raw, ids1));
    expect(r.actionItems).toHaveLength(1);
    expect(r.actionItems[0].owner).toBe("Sara");
    expect(r.dropped).toBe(1);
  });

  it("drops an item if any cited id is unknown, even when others are valid", () => {
    const raw = rawFromExpected(expected1);
    raw.action_items[1].evidence = ["m1-s7", "m2-s4"]; // m2-s4 belongs to another meeting
    const r = expectOk(validateExtraction(raw, ids1));
    expect(r.actionItems.map((a) => a.owner)).toEqual(["Omar"]);
    expect(r.dropped).toBe(1);
  });

  it("drops a summary point that cites an unknown id, and counts it", () => {
    const raw = rawFromExpected(expected1);
    raw.summary[0].evidence = ["nope"];
    const r = expectOk(validateExtraction(raw, ids1));
    expect(r.summary).toHaveLength(1);
    expect(r.summary[0].evidence).toEqual(["m1-s5", "m1-s6", "m1-s7"]);
    expect(r.dropped).toBe(1);
  });

  it("counts every dropped item across summary and action items", () => {
    const raw = rawFromExpected(expected1);
    raw.summary[1].evidence = ["m1-s100"];
    raw.action_items[0].evidence = ["x"];
    raw.action_items[1].evidence = ["y"];
    const r = expectOk(validateExtraction(raw, ids1));
    expect(r.summary).toHaveLength(1);
    expect(r.actionItems).toHaveLength(0);
    expect(r.dropped).toBe(3);
  });

  it("checks ids against the segment list given, not a hard-coded one", () => {
    const r = expectOk(validateExtraction(rawFromExpected(expected1), ids2));
    expect(r.summary).toHaveLength(0);
    expect(r.actionItems).toHaveLength(0);
    expect(r.dropped).toBe(4);
  });
});

describe("evidence_present", () => {
  it("drops an action item with empty evidence", () => {
    const raw = rawFromExpected(expected2);
    raw.action_items[0].evidence = [];
    const r = expectOk(validateExtraction(raw, ids2));
    expect(r.actionItems).toHaveLength(1);
    expect(r.actionItems[0].evidence).toEqual(["m2-s5", "m2-s6"]);
    expect(r.dropped).toBe(1);
  });

  it("drops a summary point with empty evidence", () => {
    const raw = rawFromExpected(expected2);
    raw.summary[2].evidence = [];
    const r = expectOk(validateExtraction(raw, ids2));
    expect(r.summary).toHaveLength(2);
    expect(r.dropped).toBe(1);
  });

  it("never returns an item without evidence", () => {
    const raw = rawFromExpected(expected1);
    raw.summary[0].evidence = [];
    raw.action_items[1].evidence = [];
    const r = expectOk(validateExtraction(raw, ids1));
    expect(r.dropped).toBe(2);
    for (const p of r.summary) expect(p.evidence.length).toBeGreaterThan(0);
    for (const a of r.actionItems) expect(a.evidence.length).toBeGreaterThan(0);
  });
});

describe("null_not_invented", () => {
  it("keeps null owner, due and due_phrase as null", () => {
    const r = expectOk(validateExtraction(rawFromExpected(expected2), ids2));
    const pricing = r.actionItems[1];
    expect(pricing.owner).toBeNull();
    expect(pricing.due).toBeNull();
    expect(pricing.due_phrase).toBeNull();
    const roadmap = r.actionItems[0];
    expect(roadmap.owner).toBe("Sara");
    expect(roadmap.due).toBeNull();
    expect(roadmap.due_phrase).toBeNull();
  });

  it.each(["", "unknown", "Unknown", "not stated", "Not stated"])(
    "normalises a placeholder owner/due of %j to null instead of keeping an invented value",
    (placeholder) => {
      const raw = rawFromExpected(expected2);
      const item = raw.action_items[1] as unknown as Record<string, unknown>;
      item.owner = placeholder;
      item.due = placeholder;
      item.due_phrase = placeholder;
      const r = expectOk(validateExtraction(raw, ids2));
      expect(r.actionItems[1].owner).toBeNull();
      expect(r.actionItems[1].due).toBeNull();
      expect(r.actionItems[1].due_phrase).toBeNull();
    },
  );

  it("does not fill a missing owner with a speaker, or a missing due with the meeting date", () => {
    const r = expectOk(validateExtraction(rawFromExpected(expected2), ids2));
    const pricing = r.actionItems[1];
    expect(pricing.owner).not.toBe("Sara");
    expect(pricing.owner).not.toBe("Ayesha");
    expect(pricing.due).not.toBe(meeting2.meeting.date);
  });
});
