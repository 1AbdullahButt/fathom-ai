// POST /api/meetings/[id]/summary?template=general|sales|one_on_one -> { summary }
// Template switch (PLAN.md P1-1, SPEC A4). Returns the saved summary for that template if one
// exists; otherwise generates it once with lib/extract, saves it via lib/data (an overlay row for
// seeded meetings) and returns it. Action items are not regenerated per template.
// Cost guard: only the 3 templates; at most one generation per (meeting, template) ever (a saved
// row is always returned instead); at most GENERATIONS_PER_HOUR generations per client.
// Errors carry a reason class the UI words differently: "limit" (our hourly limit; with
// retry_at), "busy" (the AI provider is rate-limited, or our database is unreachable: retry soon),
// "failed" (the model's answer failed validation or the call errored).
import { NextResponse } from "next/server";
import { countGenerationsSince, generationRetryAt, getMeeting, logGeneration, saveSummary, type MeetingBundle } from "@/lib/data";
import { extract } from "@/lib/extract";
import { RateLimitedError } from "@/lib/llm";
import { GENERATIONS_PER_HOUR, isTemplate } from "@/lib/templates";
import type { Summary, Template } from "@/lib/types";
import { clientIp, hashIp } from "@/lib/uploads";

export const dynamic = "force-dynamic";
// One extraction, possibly across the Groq model chain.
export const maxDuration = 120;


type Reason = "busy" | "limit" | "failed";
type GenResult = { summary: Summary } | { reason: "busy" | "failed" };

/** Generations running in this server instance, so a double click doesn't pay twice. */
function inFlight(): Map<string, Promise<GenResult>> {
  const g = globalThis as unknown as { __fathomSummaryGenV2?: Map<string, Promise<GenResult>> };
  return (g.__fathomSummaryGenV2 ??= new Map());
}

const fail = (status: number, error: string, reason?: Reason, extra: Record<string, string> = {}) =>
  NextResponse.json({ error, ...(reason ? { reason } : {}), ...extra }, { status });

const BUSY = "The AI model is busy right now. Try again in a minute.";
const FAILED = "The model’s answer didn’t pass our checks (every point needs a quote from the meeting). Try again.";

function respond(r: GenResult) {
  if ("summary" in r) return NextResponse.json({ summary: r.summary });
  return r.reason === "busy" ? fail(503, BUSY, "busy") : fail(502, FAILED, "failed");
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = new URL(req.url).searchParams.get("template");
  if (!isTemplate(template)) return fail(400, "Unknown template.");

  let bundle: MeetingBundle | null;
  try {
    bundle = await getMeeting(id);
  } catch (e) {
    console.error(`summary ${id}: load failed`, e instanceof Error ? e.message : e);
    return fail(503, "We couldn’t load this meeting right now. Try again in a minute.", "busy");
  }
  if (!bundle) return fail(404, "This meeting doesn’t exist.");

  const saved = bundle.summaries[template];
  if (saved) return NextResponse.json({ summary: saved });

  const { meeting, segments } = bundle;
  if (meeting.status !== "ready" || !segments.length) return fail(409, "This meeting has no transcript to summarise yet.");

  const key = `${id}:${template}`;
  const running = inFlight().get(key);
  if (running) return respond(await running);

  const ipHash = hashIp(clientIp(req.headers));
  try {
    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await countGenerationsSince(ipHash, since)) >= GENERATIONS_PER_HOUR) {
      const at = await generationRetryAt(ipHash, GENERATIONS_PER_HOUR);
      const minutes = Math.max(1, Math.round((at.getTime() - Date.now()) / 60_000));
      const res = fail(
        429,
        `You can write ${GENERATIONS_PER_HOUR} new template summaries an hour. Try again in ${minutes} min.`,
        "limit",
        { retry_at: at.toISOString() },
      );
      res.headers.set("Retry-After", String(minutes * 60));
      return res;
    }
    await logGeneration(ipHash, id);
  } catch (e) {
    console.error(`summary ${id}: rate limit check failed`, e instanceof Error ? e.message : e);
    return fail(503, "We couldn’t reach our database just now. Try again in a minute.", "busy");
  }

  const job = generate(id, template, bundle);
  inFlight().set(key, job);
  try {
    return respond(await job);
  } finally {
    inFlight().delete(key);
  }
}

async function generate(id: string, template: Template, { meeting, segments }: MeetingBundle): Promise<GenResult> {
  try {
    const r = await extract(segments, meeting.speakers, meeting.date, template);
    if (!r.ok) {
      console.error(`summary ${id}/${template}: invalid output: ${r.error}`);
      return { reason: "failed" };
    }
    const summary: Summary = { meeting_id: id, template, points: r.summary };
    await saveSummary(summary);
    return { summary };
  } catch (e) {
    console.error(`summary ${id}/${template}: generation failed`, e instanceof Error ? e.message : e);
    return { reason: e instanceof RateLimitedError ? "busy" : "failed" };
  }
}
