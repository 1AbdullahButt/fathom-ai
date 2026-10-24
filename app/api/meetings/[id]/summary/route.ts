// POST /api/meetings/[id]/summary?template=general|sales|one_on_one -> { summary }
// Template switch (PLAN.md P1-1, SPEC A4). Returns the saved summary for that template if one
// exists; otherwise generates it once with lib/extract, saves it via lib/data (an overlay row for
// seeded meetings) and returns it. Action items are not regenerated per template.
// Cost guard: only the 3 templates; at most one generation per (meeting, template) ever (a saved
// row is always returned instead); at most GENERATIONS_PER_HOUR generations per client.
import { NextResponse } from "next/server";
import { countGenerationsSince, getMeeting, logGeneration, saveSummary, type MeetingBundle } from "@/lib/data";
import { extract } from "@/lib/extract";
import { isTemplate } from "@/lib/templates";
import type { Summary, Template } from "@/lib/types";
import { clientIp, hashIp } from "@/lib/uploads";

export const dynamic = "force-dynamic";
// One extraction, possibly across the Groq model chain.
export const maxDuration = 120;

const GENERATIONS_PER_HOUR = 10;

/** Generations running in this server instance, so a double click doesn't pay twice. */
function inFlight(): Map<string, Promise<Summary | null>> {
  const g = globalThis as unknown as { __fathomSummaryGen?: Map<string, Promise<Summary | null>> };
  return (g.__fathomSummaryGen ??= new Map());
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = new URL(req.url).searchParams.get("template");
  if (!isTemplate(template)) return fail(400, "Unknown template.");

  let bundle: MeetingBundle | null;
  try {
    bundle = await getMeeting(id);
  } catch (e) {
    console.error(`summary ${id}: load failed`, e instanceof Error ? e.message : e);
    return fail(503, "We couldn’t load this meeting right now.");
  }
  if (!bundle) return fail(404, "This meeting doesn’t exist.");

  const saved = bundle.summaries[template];
  if (saved) return NextResponse.json({ summary: saved });

  const { meeting, segments } = bundle;
  if (meeting.status !== "ready" || !segments.length) return fail(409, "This meeting has no transcript to summarise yet.");

  const key = `${id}:${template}`;
  const running = inFlight().get(key);
  if (running) {
    const summary = await running;
    return summary ? NextResponse.json({ summary }) : fail(502, "Writing this summary failed.");
  }

  const ipHash = hashIp(clientIp(req.headers));
  try {
    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await countGenerationsSince(ipHash, since)) >= GENERATIONS_PER_HOUR) {
      return fail(429, "You’ve switched to new templates a lot in the last hour. Try again later.");
    }
    await logGeneration(ipHash, id);
  } catch (e) {
    console.error(`summary ${id}: rate limit check failed`, e instanceof Error ? e.message : e);
    return fail(503, "We couldn’t write this summary right now.");
  }

  const job = generate(id, template, bundle);
  inFlight().set(key, job);
  try {
    const summary = await job;
    return summary ? NextResponse.json({ summary }) : fail(502, "Writing this summary failed.");
  } finally {
    inFlight().delete(key);
  }
}

async function generate(id: string, template: Template, { meeting, segments }: MeetingBundle): Promise<Summary | null> {
  try {
    const r = await extract(segments, meeting.speakers, meeting.date, template);
    if (!r.ok) {
      console.error(`summary ${id}/${template}: invalid output: ${r.error}`);
      return null;
    }
    const summary: Summary = { meeting_id: id, template, points: r.summary };
    await saveSummary(summary);
    return summary;
  } catch (e) {
    console.error(`summary ${id}/${template}: generation failed`, e instanceof Error ? e.message : e);
    return null;
  }
}
