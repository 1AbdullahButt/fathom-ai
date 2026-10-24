// PATCH /api/meetings/[id]/edits -> { summary } | { action_item }
// PLAN.md P2-3: inline human edits, marked as human-written.
//   { kind: "summary_point", template, index, text }      -> appends a summary_edits row
//   { kind: "action_item", id, task, owner, due }          -> updates the human-editable columns
// Text is plain (control characters stripped, trimmed), 1..1000 characters; owner/due "" or
// null stay null ("not stated"). Evidence, confidence and ids are never editable.
// Limit: EDITS_PER_HOUR per client (upload_log, "edit:" prefix).
import { NextResponse } from "next/server";
import { countRateEventsSince, getMeeting, logRateEvent, saveSummaryPointEdit, updateActionItem, type MeetingBundle } from "@/lib/data";
import { cleanDue, cleanOwner, cleanText, editInput, EDITS_PER_HOUR, MAX_EDIT_CHARS } from "@/lib/edits";
import { clientIp, hashIp } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
const UNAVAILABLE = "We couldn’t save this edit right now. Try again.";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(400, "Send JSON.");
  }
  const parsed = editInput.safeParse(raw);
  if (!parsed.success) return fail(400, "That edit isn’t in a shape we accept.");
  const input = parsed.data;

  // Validate the text before touching the database or the limit.
  const text = cleanText(input.kind === "summary_point" ? input.text : input.task, MAX_EDIT_CHARS, input.kind === "summary_point" ? "The point" : "The task");
  if (!text.ok) return fail(400, text.error);
  let owner: string | null = null;
  let due: string | null = null;
  if (input.kind === "action_item") {
    const o = cleanOwner(input.owner);
    if (!o.ok) return fail(400, o.error);
    const d = cleanDue(input.due);
    if (!d.ok) return fail(400, d.error);
    owner = o.owner;
    due = d.due;
  }

  let bundle: MeetingBundle | null;
  try {
    bundle = await getMeeting(id);
  } catch (e) {
    console.error(`edits ${id}: load failed`, e instanceof Error ? e.message : e);
    return fail(503, UNAVAILABLE);
  }
  if (!bundle) return fail(404, "This meeting doesn’t exist.");
  if (bundle.meeting.status !== "ready") return fail(409, "This meeting is still processing.");

  const current = input.kind === "action_item" ? bundle.action_items.find((a) => a.id === input.id) : undefined;
  if (input.kind === "action_item" && !current) return fail(404, "This action item doesn’t exist.");
  if (input.kind === "summary_point" && !bundle.summaries[input.template]?.points[input.index]) {
    return fail(404, "This summary point doesn’t exist.");
  }

  const ipHash = hashIp(clientIp(req.headers));
  try {
    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await countRateEventsSince("edit", ipHash, since)) >= EDITS_PER_HOUR) {
      return fail(429, "You’ve made a lot of edits in the last hour. Try again later.");
    }
    await logRateEvent("edit", ipHash, id);

    if (input.kind === "summary_point") {
      const r = await saveSummaryPointEdit(id, input.template, input.index, text.text);
      if (!r.ok) return fail(r.reason === "not_ready" ? 409 : 404, "This summary point doesn’t exist.");
      return NextResponse.json({ summary: r.summary });
    }

    // A changed date drops the spoken phrase ("next Friday"), which would no longer match it.
    const item = current!;
    const action_item = await updateActionItem(id, item.id, {
      task: text.text,
      owner,
      due,
      due_phrase: due === item.due ? item.due_phrase : null,
      edited_by_human: true,
    });
    if (!action_item) return fail(404, "This action item doesn’t exist.");
    return NextResponse.json({ action_item });
  } catch (e) {
    console.error(`edits ${id}: save failed`, e instanceof Error ? e.message : e);
    return fail(503, UNAVAILABLE);
  }
}
