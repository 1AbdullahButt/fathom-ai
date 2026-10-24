// GET /api/meetings/[id] -> { meeting, segments, chapters, summaries, action_items, error, stage }
// Polled by the meetings list every 3 s while an upload processes.
import { NextResponse } from "next/server";
import { getMeeting } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const bundle = await getMeeting(id);
    if (!bundle) return NextResponse.json({ error: "not found" }, { status: 404 });
    // Transcript saved but notes not yet: the pipeline is on its last step.
    const stage =
      bundle.meeting.status !== "processing" ? null : bundle.segments.length ? "writing_notes" : "transcribing";
    return NextResponse.json({ ...bundle, stage }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(`GET /api/meetings/${id}`, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
