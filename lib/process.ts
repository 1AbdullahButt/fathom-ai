// Upload processing pipeline: file -> transcript segments -> summary + action items -> ready.
// Any failure marks the meeting "error" with a plain-words reason (shown in the list with Retry).
import { getMeeting, saveActionItems, saveSegments, saveSummary, updateMeeting } from "./data";
import { extract } from "./extract";
import { transcribe, TranscribeError } from "./transcribe";
import { MAX_DURATION_S, uploadExists } from "./uploads";
import type { Segment } from "./types";

/** Meetings being processed by this server instance (stops a double click starting two runs). */
function inFlight(): Set<string> {
  const g = globalThis as unknown as { __fathomProcessing?: Set<string> };
  return (g.__fathomProcessing ??= new Set());
}

export function isProcessing(id: string): boolean {
  return inFlight().has(id);
}

class StepError extends Error {}

async function fail(id: string, reason: string, err?: unknown) {
  if (err) console.error(`process ${id}: ${reason}`, err instanceof Error ? err.message : err);
  try {
    await updateMeeting(id, { status: "error", error: reason });
  } catch (e) {
    console.error(`process ${id}: could not mark error`, e);
  }
}

/** Run the whole pipeline for an uploaded meeting in status "processing". Never throws. */
export async function processMeeting(id: string, deadline = Date.now() + 285_000): Promise<void> {
  if (inFlight().has(id)) return;
  inFlight().add(id);
  try {
    const bundle = await getMeeting(id);
    if (!bundle || bundle.meeting.source !== "upload" || bundle.meeting.status !== "processing") return;
    const { meeting } = bundle;

    // Idempotent: a retry after a failed notes step reuses the saved transcript.
    let segments: Segment[] = bundle.segments;
    let speakers = meeting.speakers;
    if (!segments.length) {
      if (!meeting.media_url || !(await uploadExists(id, meeting.media_url))) {
        throw new StepError("The file didn’t finish uploading, so there was nothing to transcribe.");
      }
      let t;
      try {
        t = await transcribe(id, meeting.media_url, deadline);
      } catch (e) {
        if (e instanceof TranscribeError) throw new StepError(e.message);
        throw e;
      }
      if (t.duration_s > MAX_DURATION_S + 5) throw new StepError("This recording is longer than the 60 minutes the demo takes.");
      // Segments must exist before the status becomes "ready" (and RLS only allows inserting
      // them while the meeting is processing).
      segments = await saveSegments(id, t.segments);
      speakers = t.speakers;
      await updateMeeting(id, { speakers, duration_s: Math.round(t.duration_s * 10) / 10 || meeting.duration_s });
    }

    let result;
    try {
      result = await extract(segments, speakers, meeting.date, "general");
    } catch (e) {
      throw new StepError("We transcribed the recording, but writing the notes failed.", { cause: e });
    }
    if (!result.ok) throw new StepError("We transcribed the recording, but the notes came back unusable.", { cause: result.error });

    await saveSummary({ meeting_id: id, template: "general", points: result.summary });
    await saveActionItems(id, result.actionItems);
    await updateMeeting(id, { status: "ready", error: null });
  } catch (e) {
    if (e instanceof StepError) await fail(id, e.message, e.cause ?? e);
    else await fail(id, "Something went wrong on our side while processing this recording.", e);
  } finally {
    inFlight().delete(id);
  }
}
