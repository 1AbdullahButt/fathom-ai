# PLAN

Source of truth: SPEC.md. Design: design/ (Sotto). One task = one PR. Tick `[x]` when merged.
Every task: `npm run check` passes, behaviour checked in the running app, .agent-logs/ committed.

## Architecture (fixed; tests import these paths)

- **Seeded meetings are static JSON** in `seed/meetings/*.json` (one file per meeting: meeting,
  segments, chapters, summaries for all 3 templates, action items). Read at request time from
  disk/bundle. They never depend on Supabase, so the live link works even if the free Supabase
  project pauses.
- **User-created data** (uploaded meetings, their segments/summaries/actions, highlights, clips)
  lives in Supabase (project `fathom-ai`, ref `pcljaqoohcjtezjhupzp`). Access via the
  publishable key + RLS policies (public demo workspace, no auth).
- `lib/data.ts` is the only data entry point. `DATA_SOURCE=memory` (default when Supabase env
  vars are missing, and in tests/e2e/CI) keeps user-created data in process memory.
- External APIs are behind `lib/transcribe.ts` (AssemblyAI) and `lib/llm.ts` (Groq).
  `TRANSCRIBE_MOCK=1` / `LLM_MOCK=1` return fixture data (used by e2e and CI, no network).
- Env (never committed): `ASSEMBLYAI_API_KEY`, `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, optional `ANTHROPIC_API_KEY`.

### Module contracts
```ts
// lib/types.ts
export type Template = "general" | "sales" | "one_on_one";
export interface Speaker { id: string; name: string }
export interface Segment { id: string; meeting_id: string; start_s: number; end_s: number; speaker_id: string; text: string }
export interface Meeting { id: string; title: string; date: string /* ISO date */; duration_s: number;
  media_url: string | null; speakers: Speaker[]; status: "processing" | "ready" | "error"; source: "seed" | "upload" }
export interface SummaryPoint { text: string; evidence: string[] /* segment ids, non-empty */ ; edited_by_human?: boolean }
export interface Summary { meeting_id: string; template: Template; points: SummaryPoint[] }
export interface ActionItem { id: string; meeting_id: string; task: string; owner: string | null; due: string | null /* ISO date */;
  due_phrase: string | null; confidence: "high" | "low"; evidence: string[]; edited_by_human: boolean }
export interface Highlight { id: string; meeting_id: string; start_s: number; end_s: number; note: string; created_at: string }
export interface Clip { id: string; meeting_id: string; start_s: number; end_s: number; title: string; public: true }
export interface Chapter { meeting_id: string; title: string; start_s: number }

// lib/validate.ts — validates raw LLM JSON. Pure, no I/O.
// Raw shape: { summary: [{text, evidence: string[]}],
//              action_items: [{task, owner: string|null, due: string|null, due_phrase: string|null,
//                              confidence: "high"|"low", evidence: string[]}] }
export type ValidationResult =
  | { ok: true; summary: SummaryPoint[]; actionItems: Omit<ActionItem, "id" | "meeting_id" | "edited_by_human">[]; dropped: number }
  | { ok: false; error: string };
export function validateExtraction(raw: unknown, segmentIds: readonly string[]): ValidationResult;
// - malformed shape (wrong types, missing keys, bad confidence) -> ok:false
// - items whose evidence is empty, or cites any id not in segmentIds -> dropped (counted)
// - owner/due/due_phrase null stay null; "" and "unknown"/"not stated" are NOT invented values, normalise to null

// lib/extract.ts
export function extract(segments: Segment[], speakers: Speaker[], meetingDate: string, template: Template): Promise<ValidationResult>;
// one LLM call (strict JSON), validate, retry once on ok:false. Relative dates resolve against meetingDate.

// lib/chunk.ts (P2)
export function chunkSegments(segments: Segment[], maxSeconds?: number /* default 600 */): Segment[][];

// lib/search.ts — pure
export interface SearchHit { meeting_id: string; meeting_title: string; segment_id: string | null; start_s: number; snippet: string }
export function searchMeetings(query: string, corpus: { meeting: Meeting; segments: Segment[] }[]): SearchHit[];
// case-insensitive; matches titles (segment_id null, start_s 0) and segment text

// lib/time.ts — pure
export function formatTimestamp(s: number): string; // "m:ss" under an hour, "h:mm:ss" above

// lib/talktime.ts (P2) — pure
export function talkTime(segments: Segment[]): { speaker_id: string; seconds: number; share: number }[];

// lib/ask.ts (P2-last, needed by the "budget" eval)
export function ask(question: string, corpus: { meeting: Meeting; segments: Segment[] }[]):
  Promise<{ answer: string; citations: { meeting_id: string; segment_id: string }[] }>;
// no supporting segments -> answer exactly "not found in meetings", citations []
```

### Components (props the tests rely on)
- `components/meeting/SummaryPoint.tsx`: `{ point: SummaryPoint; segments: Segment[]; speakers: Speaker[]; onSeek(s: number): void }`
- `components/meeting/ActionItem.tsx`: `{ item: ActionItem; segments: Segment[]; speakers: Speaker[]; onSeek(s: number): void }`
  Each evidence segment renders a `QuoteChip` = `<button>` whose accessible name contains the
  timestamp (`formatTimestamp(start_s)`); clicking calls `onSeek(segment.start_s)`.
  Null owner/due render "Owner not stated" / "Date not stated"; low confidence renders a flag.
- `components/meeting/TranscriptLine.tsx`: `{ segment; speaker; active: boolean; onSeek }`;
  root has `data-segment-id`, `aria-current="true"` when active.

### Routes
- `/` meetings list · `/m/[id]` meeting page · `/c/[id]` public clip · `/search?q=`
- `POST /api/uploads` -> `{ meetingId, uploadUrl }` (signed URL, or a local PUT endpoint in memory mode)
- `POST /api/meetings/[id]/process` · `GET /api/meetings/[id]` (status + data)
- `POST /api/meetings/[id]/summary?template=` · `POST /api/highlights` · `POST /api/clips`
- e2e test ids: upload input `data-testid="upload-input"`, processing row shows status text;
  meeting page tabs "Summary", "Action items", "Highlights".

## Tasks

### P0 (deploy after)
- [ ] P0-1 Types + validator + time format: `lib/types.ts`, `lib/validate.ts`, `lib/time.ts`. Makes locked unit tests pass.
- [ ] P0-2 Design foundation: port design/ tokens + styles to `app/globals.css`, fonts via next/font, `components/ui/*` primitives used by screens (Button, IconButton, Icon, Badge, Tabs, SegmentedControl, Spinner, Skeleton, StateBlock, ProgressBar, Dialog, Toast).
- [ ] P0-3 Data layer + seed loader: `lib/data.ts` (memory + Supabase), `lib/seed.ts` reading `seed/meetings/*.json`; Supabase schema migration `supabase/migrations/0001_init.sql` with RLS.
- [ ] P0-4 Meetings list `/`: seeded rows (title, date, duration, speakers), Upload + Record equal primary buttons (Record opens a "coming soon / no bot" dialog — stub).
- [ ] P0-5 Meeting page `/m/[id]`: media player, transcript with speaker names + timestamps, active line follows playback (auto-scroll, pausable), click line to seek. Virtualise or window the transcript so 1h stays responsive.
- [ ] P0-6 Summary + action items panel: `components/meeting/{SummaryPoint,ActionItem,QuoteChip,NotStated,ConfidenceFlag}.tsx`, quote inline, click seeks. `lib/llm.ts`, `lib/extract.ts` (with LLM_MOCK).
- [ ] P0-7 Upload pipeline: `/api/uploads` signed URL -> Storage, `/api/meetings/[id]/process` -> AssemblyAI (speaker labels) -> segments -> extract -> ready. Progress + error states, retry. Cost guard: max 60 min, 3 uploads/hour/IP. TRANSCRIBE_MOCK for e2e.

### P1 (deploy after)
- [ ] P1-1 Template switch (General / Sales call / 1:1 & Standup): `lib/templates.ts`; seeded meetings precomputed, uploads generated on demand and cached; switching back is instant.
- [ ] P1-2 Search across meetings: `lib/search.ts`, `/search` page + list search box; result opens `/m/[id]?t=<start_s>` and seeks.
- [ ] P1-3 Highlights: select transcript text -> "Highlight" or press H during playback (last 15 s); note; Highlights tab; `POST /api/highlights`.
- [ ] P1-4 Clips: highlight or range -> `POST /api/clips` -> `/c/[id]` plays only that range with its transcript, signed out; copy link.

### P2 (deploy after)
- [ ] P2-1 Map-reduce summary: `lib/chunk.ts` (~10 min chunks), summarise chunks then merge, evidence ids preserved; used for meetings > 15 min.
- [ ] P2-2 Chapters + speaker filter + talk time: `lib/talktime.ts`, `components/meeting/{ChapterItem,TalkTimeBar}.tsx`, left column per design.
- [ ] P2-3 Inline edits marked human-written (summary points + action items), `components/meeting/HumanEdit.tsx`, persisted.
- [ ] P2-4 Ask across meetings (minimal, needed by the locked "budget" eval): `lib/ask.ts`, answer only from cited segments, else "not found in meetings". Box on `/search`.

### Stretch (only if everything above is green)
- [ ] S-1 Themes across meetings (fixture: "Phone verification friction").
- [ ] S-2 Browser recording (mic/tab) -> same upload pipeline.
