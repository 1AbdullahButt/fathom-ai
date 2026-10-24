import { formatTimestamp } from "@/lib/time";

describe("formatTimestamp", () => {
  it.each([
    [0, "0:00"],
    [5, "0:05"],
    [25, "0:25"],
    [78, "1:18"],
    [600, "10:00"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3738, "1:02:18"],
  ])("formats %d s as %s", (s, out) => {
    expect(formatTimestamp(s)).toBe(out);
  });
});
