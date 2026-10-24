// SPEC §7 Layer 1 "seek": clicking an item's evidence seeks the player to that segment's start_s.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import type { ActionItem, Segment, Speaker, SummaryPoint } from "@/lib/types";
import * as ActionItemModule from "@/components/meeting/ActionItem";
import * as SummaryPointModule from "@/components/meeting/SummaryPoint";
import {
  expected1,
  expected2,
  meeting1,
  meeting2,
  toActionItem,
  toSummaryPoint,
} from "../helpers/fixtures";

// PLAN.md fixes the module paths and props, not the export style: accept default or named export.
interface Common {
  segments: Segment[];
  speakers: Speaker[];
  onSeek(s: number): void;
}
function pick<P>(mod: object, name: string): ComponentType<P> {
  const m = mod as Record<string, unknown>;
  const c = m.default ?? m[name];
  if (!c) throw new Error(`module exports neither default nor ${name}`);
  return c as ComponentType<P>;
}
const ActionItemView = pick<Common & { item: ActionItem }>(ActionItemModule, "ActionItem");
const SummaryPointView = pick<Common & { point: SummaryPoint }>(SummaryPointModule, "SummaryPoint");

describe("seek from evidence", () => {
  it("ActionItem: clicking the 0:25 quote seeks to 25 s, the 0:38 quote to 38 s", async () => {
    const onSeek = vi.fn();
    const item = toActionItem(expected1.action_items[0], "m1", "a1");
    render(
      <ActionItemView
        item={item}
        segments={meeting1.segments}
        speakers={meeting1.meeting.speakers}
        onSeek={onSeek}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /0:25/ }));
    expect(onSeek).toHaveBeenLastCalledWith(25);
    await userEvent.click(screen.getByRole("button", { name: /0:38/ }));
    expect(onSeek).toHaveBeenLastCalledWith(38);
    expect(onSeek).toHaveBeenCalledTimes(2);
  });

  it("ActionItem: shows the task and its owner", () => {
    const item = toActionItem(expected1.action_items[0], "m1", "a1");
    const { container } = render(
      <ActionItemView
        item={item}
        segments={meeting1.segments}
        speakers={meeting1.meeting.speakers}
        onSeek={() => {}}
      />,
    );
    expect(container.textContent).toContain("Check SMS provider logs for delayed codes");
    expect(container.textContent).toContain("Omar");
  });

  it("SummaryPoint: clicking the 0:12 quote seeks to 12 s", async () => {
    const onSeek = vi.fn();
    render(
      <SummaryPointView
        point={toSummaryPoint(expected1.summary[0])}
        segments={meeting1.segments}
        speakers={meeting1.meeting.speakers}
        onSeek={onSeek}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /0:12/ }));
    expect(onSeek).toHaveBeenCalledWith(12);
  });

  it("SummaryPoint: each evidence segment gets its own quote button (1:05 -> 65 s)", async () => {
    const onSeek = vi.fn();
    render(
      <SummaryPointView
        point={toSummaryPoint(expected1.summary[1])}
        segments={meeting1.segments}
        speakers={meeting1.meeting.speakers}
        onSeek={onSeek}
      />,
    );
    screen.getByRole("button", { name: /0:50/ }); // throws if missing
    screen.getByRole("button", { name: /1:18/ });
    await userEvent.click(screen.getByRole("button", { name: /1:05/ }));
    expect(onSeek).toHaveBeenCalledWith(65);
  });
});

describe("null owner / due (A8)", () => {
  it("renders 'not stated' for a null owner and due, and still seeks from its quote", async () => {
    const onSeek = vi.fn();
    const item = toActionItem(expected2.action_items[1], "m2", "a2");
    const { container } = render(
      <ActionItemView
        item={item}
        segments={meeting2.segments}
        speakers={meeting2.meeting.speakers}
        onSeek={onSeek}
      />,
    );
    expect(container.textContent ?? "").toMatch(/not stated/i);
    await userEvent.click(screen.getByRole("button", { name: /0:55/ }));
    expect(onSeek).toHaveBeenCalledWith(55);
  });
});
