// The only data entry point (PLAN.md Architecture).
// - Seeded meetings come from lib/seed (static JSON, never Supabase).
// - User-created data (uploads, their segments/summaries/actions, highlights, clips, the upload
//   rate-limit log) lives in Supabase via the publishable key + RLS, or in process memory when
//   DATA_SOURCE=memory or the Supabase env vars are missing (tests, e2e, CI).
// Summaries and action items saved for a seeded meeting (template switch cache, human edits)
// are stored as user data and layered over the seeded ones on read.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSeedId, seedMeeting, seedMeetings } from "./seed";
import type { ActionItem, Chapter, Clip, Highlight, Meeting, Segment, Summary, Template } from "./types";

export interface MeetingBundle {
  meeting: Meeting;
  segments: Segment[];
  chapters: Chapter[];
  summaries: Partial<Record<Template, Summary>>;
  action_items: ActionItem[];
  /** Last processing error for uploads with status "error". */
  error: string | null;
}

export type NewMeeting = Pick<Meeting, "title" | "date"> &
  Partial<Pick<Meeting, "id" | "duration_s" | "media_url" | "speakers">>;

export type MeetingPatch = Partial<Pick<Meeting, "title" | "status" | "duration_s" | "speakers" | "media_url">> & {
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
  getSummaries(meetingId: string): Promise<Summary[]>;
  upsertSummary(s: Summary): Promise<void>;
  getActionItems(meetingId: string): Promise<ActionItem[]>;
  upsertActionItems(items: ActionItem[]): Promise<void>;
  updateActionItem(id: string, patch: ActionItemPatch): Promise<ActionItem | null>;
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
  summaries: Map<string, Summary>;
  actions: Map<string, ActionItem>;
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
    summaries: new Map(),
    actions: new Map(),
    highlights: [],
    clips: new Map(),
    uploads: [],
  };
  const s = (g.__fathomMemory ??= fresh);
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
    async getSummaries(meetingId) {
      return copy([...s.summaries.values()].filter((x) => x.meeting_id === meetingId));
    },
    async upsertSummary(sum) {
      s.summaries.set(`${sum.meeting_id}:${sum.template}`, copy(sum));
    },
    async getActionItems(meetingId) {
      return copy([...s.actions.values()].filter((a) => a.meeting_id === meetingId));
    },
    async upsertActionItems(items) {
      for (const a of items) s.actions.set(a.id, copy(a));
    },
    async updateActionItem(id, patch) {
      const a = s.actions.get(id);
      if (!a) return null;
      const next = { ...a, ...copy(patch) };
      s.actions.set(id, next);
      return copy(next);
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
    async getSummaries(meetingId) {
      const res = await db.from("summaries").select("meeting_id, template, points").eq("meeting_id", meetingId);
      return must(res, "get summaries") as Summary[];
    },
    async upsertSummary(sum) {
      const row = { meeting_id: sum.meeting_id, template: sum.template, points: sum.points, updated_at: new Date().toISOString() };
      must(await db.from("summaries").upsert(row, { onConflict: "meeting_id,template" }), "save summary");
    },
    async getActionItems(meetingId) {
      const res = await db.from("action_items").select("*").eq("meeting_id", meetingId).order("position");
      return (must(res, "get action items") as ActionItem[]).map(toAction);
    },
    async upsertActionItems(items) {
      if (!items.length) return;
      const rows = items.map((a, position) => ({ ...a, position }));
      must(await db.from("action_items").upsert(rows, { onConflict: "id" }), "save action items");
    },
    async updateActionItem(id, patch) {
      const res = await db.from("action_items").update(patch).eq("id", id).select("*").maybeSingle();
      const row = must(res, "update action item") as ActionItem | null;
      return row ? toAction(row) : null;
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
      const res = await db
        .from("upload_log")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", sinceIso);
      if (res.error) throw new Error(`count uploads: ${res.error.message}`);
      return res.count ?? 0;
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
  const seed = seedMeeting(id);
  if (seed) {
    let summaries = { ...seed.summaries };
    let actionItems = seed.action_items;
    try {
      const fast = store({ fast: true });
      const [userSummaries, userActions] = await Promise.all([fast.getSummaries(id), fast.getActionItems(id)]);
      for (const s of userSummaries) summaries = { ...summaries, [s.template]: s };
      if (userActions.length) {
        const override = new Map(userActions.map((a) => [a.id, a]));
        actionItems = [
          ...seed.action_items.map((a) => override.get(a.id) ?? a),
          ...userActions.filter((a) => !seed.action_items.some((s) => s.id === a.id)),
        ];
      }
    } catch (err) {
      console.error(`getMeeting(${id}): user overrides unavailable`, err);
    }
    return { meeting: seed.meeting, segments: seed.segments, chapters: seed.chapters, summaries, action_items: actionItems, error: null };
  }

  const s = store();
  const m = await s.getMeeting(id);
  if (!m) return null;
  const [segments, summaryRows, actionItems] = await Promise.all([s.getSegments(id), s.getSummaries(id), s.getActionItems(id)]);
  const summaries: Partial<Record<Template, Summary>> = {};
  for (const row of summaryRows) summaries[row.template] = row;
  segments.sort((a, b) => a.start_s - b.start_s);
  return { meeting: stripUser(m), segments, chapters: [], summaries, action_items: actionItems, error: m.error ?? null };
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

// ---------------------------------------------------------------- summaries + action items

/** Create or replace the summary for one template (works for seeded meetings too, as an override). */
export async function saveSummary(summary: Summary): Promise<void> {
  await store().upsertSummary(summary);
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
  await store().upsertActionItems(rows);
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
  await s.upsertActionItems([next]);
  return next;
}

// ---------------------------------------------------------------- highlights + clips

export async function listHighlights(meetingId: string): Promise<Highlight[]> {
  return store().listHighlights(meetingId);
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
