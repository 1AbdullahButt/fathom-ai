// The only data entry point (PLAN.md Architecture).
// - Seeded meetings come from lib/seed (static JSON, never Supabase).
// - User-created data (uploads, their segments/summaries/actions, highlights, clips, the upload
//   rate-limit log) lives in Supabase via the publishable key + RLS, or in process memory when
//   DATA_SOURCE=memory or the Supabase env vars are missing (tests, e2e, CI).
// Summaries and action items saved for a seeded meeting (template switch cache, human edits)
// are stored as user data and layered over the seeded ones on read. Human edits of summary
// points are append-only rows (summary_edits) layered over any summary (lib/edits.ts).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applySummaryEdits, type SummaryEdit } from "./edits";
import { isSeedId, seedMeeting, seedMeetings } from "./seed";
import type { ActionItem, Chapter, Clip, Highlight, Meeting, Segment, Summary, Template } from "./types";

export interface MeetingBundle {
  meeting: Meeting;
  segments: Segment[];
  chapters: Chapter[];
  summaries: Partial<Record<Template, Summary>>;
  action_items: ActionItem[];
  /** Saved highlights, by start time (latest note per range, see listHighlights). */
  highlights: Highlight[];
  /** Seeded meetings: the highlights read failed or timed out, so `highlights` is not known to be empty. */
  highlights_unavailable?: boolean;
  /** Last processing error for uploads with status "error". */
  error: string | null;
}

export type NewMeeting = Pick<Meeting, "title" | "date"> &
  Partial<Pick<Meeting, "id" | "duration_s" | "media_url" | "speakers">>;

/** The fields the pipeline changes (and the only ones the DB grants update on, 0002_security.sql). */
export type MeetingPatch = Partial<Pick<Meeting, "status" | "duration_s" | "speakers" | "media_url">> & {
  error?: string | null;
};

export type ActionItemPatch = Partial<Pick<ActionItem, "task" | "owner" | "due" | "due_phrase" | "edited_by_human">>;

interface UserMeeting extends Meeting {
  error: string | null;
  created_at: string;
}

/** Storage backend for user-created data. Implemented in memory and on Supabase. */
interface Store {
  listMeetings(): Promise<UserMeeting[]>;
  getMeeting(id: string): Promise<UserMeeting | null>;
  insertMeeting(m: UserMeeting): Promise<void>;
  updateMeeting(id: string, patch: MeetingPatch): Promise<void>;
  getSegments(meetingId: string): Promise<Segment[]>;
  insertSegments(segments: Segment[]): Promise<void>;
  getChapters(meetingId: string): Promise<Chapter[]>;
  /** Insert-only (while the meeting is processing). */
  insertChapters(chapters: Chapter[]): Promise<void>;
  getSummaries(meetingId: string): Promise<Summary[]>;
  /** Write-once: keeps an existing (meeting, template) row. */
  insertSummary(s: Summary): Promise<void>;
  getActionItems(meetingId: string): Promise<ActionItem[]>;
  /** Insert-only: keeps rows whose id already exists. */
  insertActionItems(items: ActionItem[]): Promise<void>;
  updateActionItem(id: string, patch: ActionItemPatch): Promise<ActionItem | null>;
  getSummaryEdits(meetingId: string): Promise<SummaryEdit[]>;
  /** Append-only. */
  insertSummaryEdit(e: SummaryEdit): Promise<void>;
  listHighlights(meetingId: string): Promise<Highlight[]>;
  insertHighlight(h: Highlight): Promise<void>;
  getClip(id: string): Promise<Clip | null>;
  insertClip(c: Clip): Promise<void>;
  countUploadsSince(ipHash: string, sinceIso: string): Promise<number>;
  logUpload(ipHash: string, meetingId: string | null): Promise<void>;
}

// ---------------------------------------------------------------- memory store

interface MemoryState {
  meetings: Map<string, UserMeeting>;
  segments: Map<string, Segment[]>;
  chapters: Map<string, Chapter[]>;
  summaries: Map<string, Summary>;
  actions: Map<string, ActionItem>;
  summaryEdits: SummaryEdit[];
  highlights: Highlight[];
  clips: Map<string, Clip>;
  uploads: { ip_hash: string; meeting_id: string | null; created_at: string }[];
}

function memoryStore(): Store {
  // One instance per process, shared across route handlers and dev hot reloads.
  const g = globalThis as unknown as { __fathomMemory?: MemoryState };
  const fresh: MemoryState = {
    meetings: new Map(),
    segments: new Map(),
    chapters: new Map(),
    summaries: new Map(),
    actions: new Map(),
    summaryEdits: [],
    highlights: [],
    clips: new Map(),
    uploads: [],
  };
  const s = (g.__fathomMemory ??= fresh);
  s.chapters ??= new Map(); // state created before chapters existed (dev hot reload)
  s.summaryEdits ??= [];
  const copy = <T>(v: T): T => structuredClone(v);
  return {
    async listMeetings() {
      return copy([...s.meetings.values()]);
    },
    async getMeeting(id) {
      const m = s.meetings.get(id);
      return m ? copy(m) : null;
    },
    async insertMeeting(m) {
      if (s.meetings.has(m.id)) throw new Error(`meeting ${m.id} already exists`);
      s.meetings.set(m.id, copy(m));
    },
    async updateMeeting(id, patch) {
      const m = s.meetings.get(id);
      if (!m) throw new Error(`meeting ${id} not found`);
      s.meetings.set(id, { ...m, ...copy(patch) });
    },
    async getSegments(meetingId) {
      return copy(s.segments.get(meetingId) ?? []);
    },
    async insertSegments(segments) {
      for (const seg of segments) {
        const list = s.segments.get(seg.meeting_id) ?? [];
        list.push(copy(seg));
        s.segments.set(seg.meeting_id, list);
      }
    },
    async getChapters(meetingId) {
      return copy(s.chapters.get(meetingId) ?? []);
    },
    async insertChapters(chapters) {
      for (const c of chapters) {
        const list = s.chapters.get(c.meeting_id) ?? [];
        list.push(copy(c));
        s.chapters.set(c.meeting_id, list);
      }
    },
    async getSummaries(meetingId) {
      return copy([...s.summaries.values()].filter((x) => x.meeting_id === meetingId));
    },
    async insertSummary(sum) {
      const key = `${sum.meeting_id}:${sum.template}`;
      if (!s.summaries.has(key)) s.summaries.set(key, copy(sum));
    },
    async getActionItems(meetingId) {
      return copy([...s.actions.values()].filter((a) => a.meeting_id === meetingId));
    },
    async insertActionItems(items) {
      for (const a of items) if (!s.actions.has(a.id)) s.actions.set(a.id, copy(a));
    },
    async updateActionItem(id, patch) {
      const a = s.actions.get(id);
      if (!a) return null;
      const next = { ...a, ...copy(patch) };
      s.actions.set(id, next);
      return copy(next);
    },
    async getSummaryEdits(meetingId) {
      return copy(s.summaryEdits.filter((e) => e.meeting_id === meetingId));
    },
    async insertSummaryEdit(e) {
      s.summaryEdits.push(copy(e));
    },
    async listHighlights(meetingId) {
      return copy(s.highlights.filter((h) => h.meeting_id === meetingId));
    },
    async insertHighlight(h) {
      s.highlights.push(copy(h));
    },
    async getClip(id) {
      const c = s.clips.get(id);
      return c ? copy(c) : null;
    },
    async insertClip(c) {
      s.clips.set(c.id, copy(c));
    },
    async countUploadsSince(ipHash, sinceIso) {
      return s.uploads.filter((u) => u.ip_hash === ipHash && u.created_at >= sinceIso).length;
    },
    async logUpload(ipHash, meetingId) {
      s.uploads.push({ ip_hash: ipHash, meeting_id: meetingId, created_at: new Date().toISOString() });
    },
  };
}

// ---------------------------------------------------------------- supabase store

function must<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

function supabaseStore(db: SupabaseClient): Store {
  const toAction = (row: ActionItem & { position?: number }): ActionItem => {
    const r: ActionItem & { position?: number } = { ...row, evidence: row.evidence ?? [] };
    delete r.position;
    return r;
  };
  const toClip = (r: Clip): Clip => ({ ...r, public: true });
  return {
    async listMeetings() {
      const res = await db.from("meetings").select("*").order("created_at", { ascending: false });
      return must(res, "list meetings") as UserMeeting[];
    },
    async getMeeting(id) {
      const res = await db.from("meetings").select("*").eq("id", id).maybeSingle();
      return must(res, "get meeting") as UserMeeting | null;
    },
    async insertMeeting(m) {
      must(await db.from("meetings").insert(m), "insert meeting");
    },
    async updateMeeting(id, patch) {
      must(await db.from("meetings").update(patch).eq("id", id), "update meeting");
    },
    async getSegments(meetingId) {
      const res = await db.from("segments").select("*").eq("meeting_id", meetingId).order("start_s").limit(10000);
      return must(res, "get segments") as Segment[];
    },
    async insertSegments(segments) {
      for (let i = 0; i < segments.length; i += 500) {
        must(await db.from("segments").insert(segments.slice(i, i + 500)), "insert segments");
      }
    },
    async getChapters(meetingId) {
      const res = await db.from("chapters").select("meeting_id, title, start_s").eq("meeting_id", meetingId).order("position");
      return must(res, "get chapters") as Chapter[];
    },
    async insertChapters(chapters) {
      if (!chapters.length) return;
      const rows = chapters.map((c, position) => ({ meeting_id: c.meeting_id, position, title: c.title, start_s: c.start_s }));
      must(await db.from("chapters").insert(rows), "insert chapters");
    },
    async getSummaries(meetingId) {
      const res = await db.from("summaries").select("meeting_id, template, points").eq("meeting_id", meetingId);
      return must(res, "get summaries") as Summary[];
    },
    async insertSummary(sum) {
      const row = { meeting_id: sum.meeting_id, template: sum.template, points: sum.points, updated_at: new Date().toISOString() };
      // ON CONFLICT DO NOTHING: needs only the insert grant (summaries are write-once, SECURITY.md).
      must(await db.from("summaries").upsert(row, { onConflict: "meeting_id,template", ignoreDuplicates: true }), "save summary");
    },
    async getActionItems(meetingId) {
      const res = await db.from("action_items").select("*").eq("meeting_id", meetingId).order("position");
      return (must(res, "get action items") as ActionItem[]).map(toAction);
    },
    async insertActionItems(items) {
      if (!items.length) return;
      const rows = items.map((a, position) => ({ ...a, position }));
      // ON CONFLICT DO NOTHING: only the human-editable columns are updatable (SECURITY.md).
      must(await db.from("action_items").upsert(rows, { onConflict: "id", ignoreDuplicates: true }), "save action items");
    },
    async updateActionItem(id, patch) {
      const res = await db.from("action_items").update(patch).eq("id", id).select("*").maybeSingle();
      const row = must(res, "update action item") as ActionItem | null;
      return row ? toAction(row) : null;
    },
    async getSummaryEdits(meetingId) {
      const res = await db
        .from("summary_edits")
        .select("meeting_id, template, point_index, text, ai_text, created_at")
        .eq("meeting_id", meetingId)
        .order("created_at")
        .limit(5000);
      return must(res, "get summary edits") as SummaryEdit[];
    },
    async insertSummaryEdit(e) {
      must(await db.from("summary_edits").insert(e), "insert summary edit");
    },
    async listHighlights(meetingId) {
      const res = await db.from("highlights").select("*").eq("meeting_id", meetingId).order("start_s");
      return must(res, "list highlights") as Highlight[];
    },
    async insertHighlight(h) {
      must(await db.from("highlights").insert(h), "insert highlight");
    },
    async getClip(id) {
      const res = await db.from("clips").select("*").eq("id", id).maybeSingle();
      const row = must(res, "get clip") as Clip | null;
      return row ? toClip(row) : null;
    },
    async insertClip(c) {
      must(await db.from("clips").insert(c), "insert clip");
    },
    async countUploadsSince(ipHash, sinceIso) {
      // upload_log is not readable by the publishable key; a security-definer function counts.
      const res = await db.rpc("count_upload_log", { p_ip_hash: ipHash, p_since: sinceIso });
      if (res.error) throw new Error(`count uploads: ${res.error.message}`);
      return typeof res.data === "number" ? res.data : 0;
    },
    async logUpload(ipHash, meetingId) {
      must(await db.from("upload_log").insert({ ip_hash: ipHash, meeting_id: meetingId }), "log upload");
    },
  };
}

// ---------------------------------------------------------------- selection

/**
 * Reads of user overrides for seeded pages give up after this long, so a slow or unreachable
 * Supabase never holds up the seeded meetings (they fall back to seed-only).
 */
export const SEED_OVERRIDE_TIMEOUT_MS = 1500;

let cached: { key: string; store: Store; fast: Store; kind: "memory" | "supabase" } | null = null;

/** fetch for supabase-js that aborts after `ms` (on top of any caller signal). */
function fetchWithTimeout(ms: number): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal });
  };
}

/** "memory" when DATA_SOURCE=memory or Supabase env is missing; otherwise "supabase". */
export function dataSource(): "memory" | "supabase" {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (process.env.DATA_SOURCE === "memory" || !url || !key) return "memory";
  return "supabase";
}

/** The store. `fast`: reads abort after SEED_OVERRIDE_TIMEOUT_MS (used where seeds must not wait). */
function store(opts: { fast?: boolean } = {}): Store {
  const kind = dataSource();
  const key = `${kind}|${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}`;
  if (cached?.key !== key) {
    let s: Store;
    let fast: Store;
    if (kind === "memory") {
      s = fast = memoryStore();
    } else {
      const client = (f?: typeof fetch) =>
        createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
          // postgrest-js retries failed GETs with 1+2+4 s backoff (and counts our timeout as a
          // network error), so the fast client turns retries off to keep the bound real.
          ...(f ? { global: { fetch: f }, db: { retry: false } } : {}),
        });
      s = supabaseStore(client());
      fast = supabaseStore(client(fetchWithTimeout(SEED_OVERRIDE_TIMEOUT_MS)));
    }
    cached = { key, store: s, fast, kind };
  }
  return opts.fast ? cached.fast : cached.store;
}

function stripUser(m: UserMeeting): Meeting {
  return {
    id: m.id,
    title: m.title,
    date: m.date,
    duration_s: m.duration_s,
    media_url: m.media_url,
    speakers: m.speakers ?? [],
    status: m.status,
    source: m.source,
  };
}

function newId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------- meetings

/** Uploaded meetings (newest upload first), then seeded meetings (newest date first). */
export async function listMeetings(): Promise<Meeting[]> {
  const seeded = seedMeetings().map((f) => f.meeting);
  let uploaded: Meeting[] = [];
  try {
    uploaded = (await store({ fast: true }).listMeetings()).map(stripUser);
  } catch (err) {
    // Seeded meetings must still list if Supabase is paused or unreachable.
    console.error("listMeetings: user data unavailable", err);
  }
  return [...uploaded, ...seeded];
}

export async function getMeeting(id: string): Promise<MeetingBundle | null> {
  return loadMeeting(id, true);
}

/** `withEdits`: layer human summary edits over the summaries (false: the AI text as saved). */
async function loadMeeting(id: string, withEdits: boolean): Promise<MeetingBundle | null> {
  const seed = seedMeeting(id);
  if (seed) {
    let summaries = { ...seed.summaries };
    let actionItems = seed.action_items;
    let highlights: Highlight[] = [];
    let highlightsUnavailable = false;
    // Each read is bounded and independent: a slow one falls back to seed data on its own, and a
    // failed highlights read is reported (not shown as "No highlights yet").
    const fast = store({ fast: true });
    const [userSummaries, userActions, userHighlights, edits] = await Promise.allSettled([
      fast.getSummaries(id),
      fast.getActionItems(id),
      fast.listHighlights(id),
      withEdits ? fast.getSummaryEdits(id) : Promise.resolve([]),
    ]);
    const unavailable = (what: string, r: PromiseSettledResult<unknown>) => {
      if (r.status === "rejected") console.error(`getMeeting(${id}): ${what} unavailable`, r.reason);
    };
    unavailable("summaries", userSummaries);
    unavailable("action items", userActions);
    unavailable("highlights", userHighlights);
    unavailable("summary edits", edits);
    if (userHighlights.status === "fulfilled") highlights = latestPerRange(userHighlights.value);
    else highlightsUnavailable = true;
    if (userSummaries.status === "fulfilled") for (const s of userSummaries.value) summaries = { ...summaries, [s.template]: s };
    if (edits.status === "fulfilled") summaries = applySummaryEdits(summaries, edits.value);
    if (userActions.status === "fulfilled" && userActions.value.length) {
      const override = new Map(userActions.value.map((a) => [a.id, a]));
      actionItems = [
        ...seed.action_items.map((a) => override.get(a.id) ?? a),
        ...userActions.value.filter((a) => !seed.action_items.some((s) => s.id === a.id)),
      ];
    }
    return {
      meeting: seed.meeting,
      segments: seed.segments,
      chapters: seed.chapters,
      summaries,
      action_items: actionItems,
      highlights,
      ...(highlightsUnavailable ? { highlights_unavailable: true } : {}),
      error: null,
    };
  }

  const s = store();
  const m = await s.getMeeting(id);
  if (!m) return null;
  const [segments, chapters, summaryRows, actionItems, highlightRows, edits] = await Promise.all([
    s.getSegments(id),
    s.getChapters(id),
    s.getSummaries(id),
    s.getActionItems(id),
    s.listHighlights(id),
    withEdits ? s.getSummaryEdits(id) : Promise.resolve([]),
  ]);
  let summaries: Partial<Record<Template, Summary>> = {};
  for (const row of summaryRows) summaries[row.template] = row;
  summaries = applySummaryEdits(summaries, edits);
  segments.sort((a, b) => a.start_s - b.start_s);
  return {
    meeting: stripUser(m),
    segments,
    chapters: chapters.sort((a, b) => a.start_s - b.start_s),
    summaries,
    action_items: actionItems,
    highlights: latestPerRange(highlightRows),
    error: m.error ?? null,
  };
}

/** All ready meetings with their segments (search / ask corpus). */
export async function listCorpus(): Promise<{ meeting: Meeting; segments: Segment[] }[]> {
  const meetings = (await listMeetings()).filter((m) => m.status === "ready");
  const bundles = await Promise.all(meetings.map((m) => getMeeting(m.id)));
  return bundles.filter((b): b is MeetingBundle => b !== null).map((b) => ({ meeting: b.meeting, segments: b.segments }));
}

/** Create an uploaded meeting in "processing" state. */
export async function createMeeting(input: NewMeeting): Promise<Meeting> {
  const m: UserMeeting = {
    id: input.id ?? newId(),
    title: input.title,
    date: input.date,
    duration_s: input.duration_s ?? 0,
    media_url: input.media_url ?? null,
    speakers: input.speakers ?? [],
    status: "processing",
    source: "upload",
    error: null,
    created_at: new Date().toISOString(),
  };
  if (isSeedId(m.id)) throw new Error(`id ${m.id} is reserved by a seeded meeting`);
  await store().insertMeeting(m);
  return stripUser(m);
}

export async function updateMeeting(id: string, patch: MeetingPatch): Promise<void> {
  if (isSeedId(id)) throw new Error("seeded meetings are read-only");
  await store().updateMeeting(id, patch);
}

/** Save transcript segments for an uploaded meeting. */
export async function saveSegments(meetingId: string, segments: Omit<Segment, "meeting_id">[]): Promise<Segment[]> {
  if (isSeedId(meetingId)) throw new Error("seeded meetings are read-only");
  const rows = segments.map((seg) => ({ ...seg, meeting_id: meetingId }));
  await store().insertSegments(rows);
  return rows;
}

/** Save chapters for an uploaded meeting (while it is processing; RLS allows inserts only then). */
export async function saveChapters(meetingId: string, chapters: Omit<Chapter, "meeting_id">[]): Promise<void> {
  if (isSeedId(meetingId)) throw new Error("seeded meetings are read-only");
  await store().insertChapters(chapters.map((c) => ({ meeting_id: meetingId, title: c.title, start_s: c.start_s })));
}

// ---------------------------------------------------------------- summaries + action items

/** Save the summary for one template, once (works for seeded meetings too, as an override). An existing row is kept. */
export async function saveSummary(summary: Summary): Promise<void> {
  await store().insertSummary(summary);
}

/** Save extracted action items; ids are generated when missing. */
export async function saveActionItems(
  meetingId: string,
  items: (Omit<ActionItem, "id" | "meeting_id" | "edited_by_human"> & Partial<Pick<ActionItem, "id" | "edited_by_human">>)[],
): Promise<ActionItem[]> {
  const rows: ActionItem[] = items.map((a) => ({
    ...a,
    id: a.id ?? newId(),
    meeting_id: meetingId,
    edited_by_human: a.edited_by_human ?? false,
  }));
  await store().insertActionItems(rows);
  return rows;
}

/** Edit one action item. For a seeded item the first edit stores a full override copy. */
export async function updateActionItem(meetingId: string, id: string, patch: ActionItemPatch): Promise<ActionItem | null> {
  const s = store();
  const updated = await s.updateActionItem(id, patch);
  if (updated) return updated;
  const seeded = seedMeeting(meetingId)?.action_items.find((a) => a.id === id);
  if (!seeded) return null;
  const next = { ...seeded, ...patch };
  await s.insertActionItems([next]);
  return next;
}

export type SummaryEditResult =
  | { ok: true; summary: Summary }
  | { ok: false; reason: "not_found" | "not_ready" | "no_point" };

/**
 * Human edit of one summary point: appends a summary_edits row (the AI summary itself is
 * write-once) and returns that template's summary with all edits applied. Evidence is untouched.
 */
export async function saveSummaryPointEdit(meetingId: string, template: Template, index: number, text: string): Promise<SummaryEditResult> {
  const raw = await loadMeeting(meetingId, false);
  if (!raw) return { ok: false, reason: "not_found" };
  if (raw.meeting.status !== "ready") return { ok: false, reason: "not_ready" };
  const base = raw.summaries[template];
  const point = base?.points[index];
  if (!base || !point) return { ok: false, reason: "no_point" };
  const s = store();
  await s.insertSummaryEdit({
    meeting_id: meetingId,
    template,
    point_index: index,
    text,
    ai_text: point.text,
    created_at: new Date().toISOString(),
  });
  const edited = applySummaryEdits({ [template]: base }, await s.getSummaryEdits(meetingId));
  return { ok: true, summary: edited[template]! };
}

// ---------------------------------------------------------------- highlights + clips

/**
 * Highlights are append-only (no update grant), so adding a note to a saved highlight inserts a
 * new row with the same range. On read the newest row per (start_s, end_s) wins. DECISIONS.md.
 */
export function latestPerRange(rows: Highlight[]): Highlight[] {
  const byRange = new Map<string, Highlight>();
  for (const h of rows) {
    const key = `${h.start_s}:${h.end_s}`;
    const prev = byRange.get(key);
    if (!prev || h.created_at >= prev.created_at) byRange.set(key, h);
  }
  return [...byRange.values()].sort((a, b) => a.start_s - b.start_s || a.created_at.localeCompare(b.created_at));
}

export async function listHighlights(meetingId: string): Promise<Highlight[]> {
  return latestPerRange(await store().listHighlights(meetingId));
}

export async function createHighlight(input: Omit<Highlight, "id" | "created_at">): Promise<Highlight> {
  const h: Highlight = { ...input, id: newId(), created_at: new Date().toISOString() };
  await store().insertHighlight(h);
  return h;
}

export async function createClip(input: Omit<Clip, "id" | "public">): Promise<Clip> {
  const c: Clip = { ...input, id: newId(), public: true };
  await store().insertClip(c);
  return c;
}

export async function getClip(id: string): Promise<Clip | null> {
  return store().getClip(id);
}

// ---------------------------------------------------------------- upload rate limit

/** Number of uploads logged for this (hashed) client since `sinceIso`. */
export async function countUploadsSince(ipHash: string, sinceIso: string): Promise<number> {
  return store().countUploadsSince(ipHash, sinceIso);
}

export async function logUpload(ipHash: string, meetingId: string | null): Promise<void> {
  await store().logUpload(ipHash, meetingId);
}

// ---------------------------------------------------------------- summary generation rate limit
// Shares the upload_log table under a prefixed key, so generations and uploads are counted
// separately without a new table (DECISIONS.md: template switch cost guard).

const genKey = (ipHash: string) => `gen:${ipHash}`;
const procKey = (ipHash: string) => `proc:${ipHash}`;

/** Per-client limits for highlight, clip, edit and ask requests, in the same shared log under their own prefix. */
export type RateKind = "hl" | "clip" | "edit" | "ask";

export async function countRateEventsSince(kind: RateKind, ipHash: string, sinceIso: string): Promise<number> {
  return store().countUploadsSince(`${kind}:${ipHash}`, sinceIso);
}

export async function logRateEvent(kind: RateKind, ipHash: string, meetingId: string | null): Promise<void> {
  await store().logUpload(`${kind}:${ipHash}`, meetingId);
}

/** Number of on-demand summary generations logged for this (hashed) client since `sinceIso`. */
export async function countGenerationsSince(ipHash: string, sinceIso: string): Promise<number> {
  return store().countUploadsSince(genKey(ipHash), sinceIso);
}

/**
 * When a client that has used `limit` generations in the last hour gets one back: the minute
 * the oldest of them leaves the window. Binary search over counts (upload_log is not readable,
 * only countable), so at most 6 count calls; only used on the 429 path.
 */
export async function generationRetryAt(ipHash: string, limit: number, now = Date.now()): Promise<Date> {
  const countFrom = (minutes: number) => countGenerationsSince(ipHash, new Date(now - 3600_000 + minutes * 60_000).toISOString());
  let lo = 1;
  let hi = 60;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await countFrom(mid)) < limit) hi = mid;
    else lo = mid + 1;
  }
  return new Date(now + lo * 60_000);
}

export async function logGeneration(ipHash: string, meetingId: string): Promise<void> {
  await store().logUpload(genKey(ipHash), meetingId);
}

// ---------------------------------------------------------------- processing start rate limit
// Same table and scheme, prefixed "proc:": each paid pipeline start (first run or Retry).

export async function countProcessStartsSince(ipHash: string, sinceIso: string): Promise<number> {
  return store().countUploadsSince(procKey(ipHash), sinceIso);
}

export async function logProcessStart(ipHash: string, meetingId: string): Promise<void> {
  await store().logUpload(procKey(ipHash), meetingId);
}
