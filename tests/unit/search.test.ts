// SPEC A5: search finds a phrase across meetings (transcript text + titles).
import { searchMeetings } from "@/lib/search";
import { corpus } from "../helpers/fixtures";

describe("searchMeetings", () => {
  it("finds 'phone verification' in Meeting 1 at the right moment", () => {
    const hits = searchMeetings("phone verification", corpus);
    const hit = hits.find((h) => h.segment_id === "m1-s2");
    expect(hit).toBeDefined();
    expect(hit).toMatchObject({ meeting_id: "m1", meeting_title: "Weekly product sync", start_s: 12 });
    expect(hit!.snippet.toLowerCase()).toContain("phone verification");
    // Meeting 2 says "The verification step", not "phone verification": it is a phrase match.
    expect(hits.some((h) => h.meeting_id === "m2")).toBe(false);
  });

  it("finds 'verification' across both meetings", () => {
    const hits = searchMeetings("verification", corpus);
    const segs = hits.map((h) => h.segment_id);
    expect(segs).toContain("m1-s2");
    expect(segs).toContain("m2-s2");
    const m2hit = hits.find((h) => h.segment_id === "m2-s2")!;
    expect(m2hit).toMatchObject({ meeting_id: "m2", meeting_title: "Customer call: Ayesha", start_s: 10 });
  });

  it("matches meeting titles with segment_id null and start_s 0", () => {
    const hits = searchMeetings("customer call", corpus);
    const titleHit = hits.find((h) => h.meeting_id === "m2" && h.segment_id === null);
    expect(titleHit).toBeDefined();
    expect(titleHit!.start_s).toBe(0);
    expect(titleHit!.meeting_title).toBe("Customer call: Ayesha");
  });

  it("is case-insensitive", () => {
    const upper = searchMeetings("PHONE VERIFICATION", corpus).map((h) => h.segment_id);
    expect(upper).toContain("m1-s2");
    const title = searchMeetings("WEEKLY PRODUCT", corpus);
    expect(title.some((h) => h.meeting_id === "m1" && h.segment_id === null)).toBe(true);
  });

  it("returns nothing for a phrase no meeting contains", () => {
    expect(searchMeetings("quarterly budget", corpus)).toEqual([]);
  });
});
