// Guards the eval matcher itself, so a Layer 2 pass/fail means what SPEC §7 says.
import { findMatch, forbiddenItems, taskOverlap } from "../evals/match";
import { expected1, expected2 } from "../helpers/fixtures";

const [omar, sara] = expected1.action_items;

describe("eval matcher", () => {
  it("fuzzy-matches reworded tasks", () => {
    expect(taskOverlap(omar.task, "Check the SMS provider logs to see if codes are delayed")).toBeGreaterThanOrEqual(0.5);
    expect(taskOverlap(sara.task, "Inform marketing that the release date is the 22nd")).toBeGreaterThanOrEqual(0.5);
    expect(taskOverlap(omar.task, "Tell marketing the release is the 22nd")).toBeLessThan(0.5);
  });

  it("requires exact owner and resolved due", () => {
    const ok = { task: "Check SMS provider logs for late codes", owner: "Omar", due: "2026-10-22", evidence: ["m1-s4"] };
    expect(findMatch(omar, [ok])).toBe(ok);
    expect(findMatch(omar, [{ ...ok, owner: "Sara" }])).toBeUndefined();
    expect(findMatch(omar, [{ ...ok, due: "2026-10-23" }])).toBeUndefined();
    expect(findMatch(omar, [{ ...ok, due: null }])).toBeUndefined();
    expect(findMatch(omar, [{ ...ok, evidence: ["m1-s8"] }])).toBeUndefined();
  });

  it("treats null owner as exact (an invented owner fails)", () => {
    const pricing = expected2.action_items[1];
    const base = { task: "Look at the pricing page", owner: null, due: null, evidence: ["m2-s5"] };
    expect(findMatch(pricing, [base])).toBe(base);
    expect(findMatch(pricing, [{ ...base, owner: "Sara" }])).toBeUndefined();
  });

  it("flags dark-mode items", () => {
    const items = [{ task: "Think about Dark-mode" }, { task: "Tell marketing" }];
    expect(forbiddenItems(items, ["dark mode"])).toHaveLength(1);
  });
});
