// POST /api/highlights {meeting_id, start_s, end_s, note?} -> { highlight }
// PLAN.md P1-3. Listing comes with the meeting bundle (GET /api/meetings/[id], the meeting page).
// Adding a note to a saved highlight posts the same range again; the newest row per range wins.
import { NextResponse } from "next/server";
import { z } from "zod";
import { countRateEventsSince, createHighlight, getMeeting, logRateEvent, type MeetingBundle } from "@/lib/data";
import { checkRange, MAX_NOTE_CHARS, meetingLength, plainText, rangeInput } from "@/lib/ranges";
import { clientIp, hashIp } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const HIGHLIGHTS_PER_HOUR = 30;

const body = rangeInput.extend({ note: z.string().max(MAX_NOTE_CHARS * 2).optional() });

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(400, "Send JSON.");
  }
  const parsed = body.safeParse(raw);
  if (!parsed.success) return fail(400, "Send meeting_id, start_s and end_s as numbers, and an optional note.");
  const note = plainText(parsed.data.note ?? "");
  if (note.length > MAX_NOTE_CHARS) return fail(400, `Notes can be up to ${MAX_NOTE_CHARS} characters.`);

  let bundle: MeetingBundle | null;
  try {
    bundle = await getMeeting(parsed.data.meeting_id);
  } catch (e) {
    console.error("highlight: load failed", e instanceof Error ? e.message : e);
    return fail(503, "We couldn’t save this highlight right now.");
  }
  if (!bundle) return fail(404, "This meeting doesn’t exist.");
  if (bundle.meeting.status !== "ready") return fail(409, "This meeting is still processing.");

  const range = checkRange(parsed.data.start_s, parsed.data.end_s, meetingLength(bundle.meeting.duration_s, bundle.segments));
  if (!range.ok) return fail(400, range.error);

  const ipHash = hashIp(clientIp(req.headers));
  try {
    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await countRateEventsSince("hl", ipHash, since)) >= HIGHLIGHTS_PER_HOUR) {
      return fail(429, "You’ve saved a lot of highlights in the last hour. Try again later.");
    }
    await logRateEvent("hl", ipHash, bundle.meeting.id);
    const highlight = await createHighlight({ meeting_id: bundle.meeting.id, start_s: range.start_s, end_s: range.end_s, note });
    return NextResponse.json({ highlight }, { status: 201 });
  } catch (e) {
    console.error("highlight: save failed", e instanceof Error ? e.message : e);
    return fail(503, "We couldn’t save this highlight right now.");
  }
}
