// POST /api/clips {meeting_id, start_s, end_s, title?} -> { id }
// PLAN.md P1-4. The clip is public: /c/<id> plays just that range, signed out (SPEC A6).
import { NextResponse } from "next/server";
import { z } from "zod";
import { countRateEventsSince, createClip, getMeeting, logRateEvent, type MeetingBundle } from "@/lib/data";
import { checkRange, clipTitle, MAX_TITLE_CHARS, meetingLength, plainText, rangeInput } from "@/lib/ranges";
import { clientIp, hashIp } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const CLIPS_PER_HOUR = 30;

const body = rangeInput.extend({ title: z.string().max(MAX_TITLE_CHARS * 2).optional() });

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(400, "Send JSON.");
  }
  const parsed = body.safeParse(raw);
  if (!parsed.success) return fail(400, "Send meeting_id, start_s and end_s as numbers, and an optional title.");
  const title = plainText(parsed.data.title ?? "").replace(/\s+/g, " ");
  if (title.length > MAX_TITLE_CHARS) return fail(400, `Titles can be up to ${MAX_TITLE_CHARS} characters.`);

  let bundle: MeetingBundle | null;
  try {
    bundle = await getMeeting(parsed.data.meeting_id);
  } catch (e) {
    console.error("clip: load failed", e instanceof Error ? e.message : e);
    return fail(503, "We couldn’t create this clip right now.");
  }
  if (!bundle) return fail(404, "This meeting doesn’t exist.");
  if (bundle.meeting.status !== "ready") return fail(409, "This meeting is still processing.");

  const range = checkRange(parsed.data.start_s, parsed.data.end_s, meetingLength(bundle.meeting.duration_s, bundle.segments), true);
  if (!range.ok) return fail(400, range.error);

  const ipHash = hashIp(clientIp(req.headers));
  try {
    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await countRateEventsSince("clip", ipHash, since)) >= CLIPS_PER_HOUR) {
      return fail(429, "You’ve made a lot of clips in the last hour. Try again later.");
    }
    await logRateEvent("clip", ipHash, bundle.meeting.id);
    const clip = await createClip({
      meeting_id: bundle.meeting.id,
      start_s: range.start_s,
      end_s: range.end_s,
      title: title || clipTitle(range.start_s),
    });
    return NextResponse.json({ id: clip.id }, { status: 201 });
  } catch (e) {
    console.error("clip: save failed", e instanceof Error ? e.message : e);
    return fail(503, "We couldn’t create this clip right now.");
  }
}
