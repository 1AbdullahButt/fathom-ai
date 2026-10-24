// POST /api/meetings/[id]/process {retry?: boolean}
// Starts the pipeline (lib/process.ts) after the response is sent, so the browser gets 202 at
// once and polls GET /api/meetings/[id]. Idempotent: a meeting already being processed, or ready,
// is not processed again. Only "processing" meetings run; {retry:true} re-queues an "error" one.
import { after, NextResponse } from "next/server";
import { getMeeting, updateMeeting } from "@/lib/data";
import { isProcessing, processMeeting } from "@/lib/process";

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
  if (meeting.status === "error") {
    if (!retry) return NextResponse.json({ error: "meeting failed; send {retry:true} to try again", status: "error" }, { status: 409 });
    await updateMeeting(id, { status: "processing", error: null });
  }
  if (isProcessing(id)) return NextResponse.json({ status: "processing" }, { status: 202 });

  const started = Date.now();
  after(() => processMeeting(id, started + (maxDuration - 15) * 1000));
  return NextResponse.json({ status: "processing" }, { status: 202 });
}
