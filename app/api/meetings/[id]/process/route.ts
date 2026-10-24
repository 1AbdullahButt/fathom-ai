// POST /api/meetings/[id]/process {retry?: boolean}
// Starts the pipeline (lib/process.ts) after the response is sent, so the browser gets 202 at
// once and polls GET /api/meetings/[id]. Idempotent: a meeting already being processed, or ready,
// is not processed again. Only "processing" meetings run; {retry:true} re-queues an "error" one.
import { after, NextResponse } from "next/server";
import { countProcessStartsSince, getMeeting, logProcessStart, updateMeeting } from "@/lib/data";
import { isProcessing, processMeeting } from "@/lib/process";
import { PROCESS_STARTS_PER_HOUR, clientIp, hashIp } from "@/lib/uploads";

export const dynamic = "force-dynamic";
// Transcription is polled inside this function (Vercel Fluid compute limit).
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const retry = await req
    .json()
    .then((b: { retry?: unknown }) => b?.retry === true)
    .catch(() => false);

  const bundle = await getMeeting(id).catch(() => null);
  if (!bundle) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { meeting } = bundle;
  if (meeting.source !== "upload") return NextResponse.json({ error: "only uploads are processed" }, { status: 409 });
  if (meeting.status === "ready") return NextResponse.json({ status: "ready" });
  if (meeting.status === "error" && !retry) {
    return NextResponse.json({ error: "meeting failed; send {retry:true} to try again", status: "error" }, { status: 409 });
  }
  if (isProcessing(id)) return NextResponse.json({ status: "processing" }, { status: 202 });

  // Cost guard: every start pays for transcription and/or the LLM (SECURITY.md).
  try {
    const ipHash = hashIp(clientIp(req.headers));
    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await countProcessStartsSince(ipHash, since)) >= PROCESS_STARTS_PER_HOUR) {
      return NextResponse.json({ error: "Too many processing runs in the last hour. Try again later.", status: meeting.status }, { status: 429 });
    }
    await logProcessStart(ipHash, id);
    if (meeting.status === "error") await updateMeeting(id, { status: "processing", error: null });
  } catch (e) {
    console.error(`POST /api/meetings/${id}/process`, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const started = Date.now();
  after(() => processMeeting(id, started + (maxDuration - 15) * 1000));
  return NextResponse.json({ status: "processing" }, { status: 202 });
}
