# Fathom AI

A rebuild of [Fathom](https://fathom.video)'s meeting notes, without the meeting bot. Upload a recording
(or open a seeded one) and get a speaker-labelled transcript synced to playback, summaries in three
templates, action items, highlights, shareable clips, search and Ask across meetings.

**Live:** https://fathom-ai-tau.vercel.app (no sign-in; public demo workspace)

The headline decision is a **trust layer**: every summary point and action item shows the transcript
quote it came from, and clicking it plays that moment. Items without evidence are dropped, owners
and dates are never invented ("not stated"), low-confidence items are flagged, and human edits
are styled differently from AI text. It is built for the hard case: a 56-minute, 8-speaker council
meeting with chapters, a speaker filter, talk time and map-reduce summaries.

The recording bot is **stubbed on purpose**: Record explains that no bot joins the call, and upload is
the working capture path. See [DECISIONS.md](DECISIONS.md) for every difference from Fathom and why.

**Fathom hands-on research:** before building, I used Fathom on a real call. What it did well, where
it fell short (bot friction, missing owners, summary vs action list mismatch, unsourced Ask answers)
and how this rebuild responds: [research/FATHOM-FINDINGS.md](research/FATHOM-FINDINGS.md), with
screenshots in [research/](research/).

## What works
- Meetings list (seeded, no login), upload of audio/video up to 60 min with progress and error states
- Meeting page: player, transcript following playback, click-to-seek, `?t=` deep links
- Summary (General / Sales call / 1:1 / Standup) and action items with inline quotes that seek
- Search across meetings, Ask across meetings with citations ("not found in meetings" when unsupported)
- Highlights (select text or press H), public clip links `/c/<id>` that play only that range
- Chapters, speaker filter, talk time; inline edits marked as human-written

Known gaps are listed in [STATUS.md](STATUS.md).

## Stack
Next.js 16 (App Router) + TypeScript, Supabase (Postgres + Storage, publishable key + RLS, no auth),
AssemblyAI (transcription with speaker labels), Groq (summaries, action items, chapters, Ask; with a
fallback across three models), Vercel. Design system: Sotto (imported from Claude Design into
[design/](design/)). Security review: [SECURITY.md](SECURITY.md).

## Run it locally
Requires Node 22+.

```bash
npm ci
```

Create `.env` (never committed; also excluded from Vercel uploads by `.vercelignore`):

```
GROQ_API_KEY=...
ASSEMBLYAI_API_KEY=...
```

and `.env.local` with the Supabase project values (or omit them to run with an in-memory store):

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

```bash
npm run dev
```

The app runs at http://localhost:3000. Database schema and policies: `supabase/migrations/`.

Other commands:
- `npm run check`: typecheck, lint, unit/component tests, production build (CI gate)
- `npm run test:e2e`: Playwright smoke test with mocked transcription and LLM
- `npm run eval`: live model evals on the spec fixtures (costs Groq tokens)

Seed pipeline (run once; outputs are committed so deploys never call the APIs):
`scripts/transcribe-seed.ts` (AssemblyAI) → `scripts/split-seed.ts` (sentence segments) →
`scripts/build-seed.ts` → `scripts/generate-summaries.ts` and `scripts/generate-chapters.ts` (Groq).

## Seed data sources
Full details, URLs and caveats: [seed/SOURCES.md](seed/SOURCES.md).

- **Seattle City Council, Libraries, Education & Neighborhoods Committee, 13 March 2025** (55:54,
  8 diarized speakers). Recorded by Seattle Channel. Public record; the Seattle Municipal Archives
  state that City-created moving images do not require permission for use.
  *Courtesy of the Seattle Municipal Archives, #16839, Series 3902-01.*
  Source: https://archives.seattle.gov/digital-collections/index.php/Detail/objects/278254
- **AMI Meeting Corpus** meetings ES2002a, ES2004a, IS1009a (14–21 min, 4 speakers each).
  AMI Meeting Corpus, AMI Consortium, licensed CC BY 4.0
  (https://groups.inf.ed.ac.uk/ami/corpus/). Modified: converted to mono 48 kbps MP3.
- **Two short spec fixture meetings** ("Weekly product sync", "Customer call: Ayesha"),
  transcript-only, written for the locked tests in SPEC.md.

Speaker names come from roll call and self-introductions; where a recording never names a
speaker, the app says "name not stated" rather than inventing one.

## How it was built
An agent loop in Claude Code: an orchestrator delegating to tester (locked tests first), designer,
builder (one PLAN.md task per PR, CI-gated) and QA (runs the app, screenshots, evals). Prompts and
responses are captured in [.agent-logs/](.agent-logs/). How the loop works: [docs/AGENT_LOOP.md](docs/AGENT_LOOP.md).
Plan: [PLAN.md](PLAN.md). Spec: [SPEC.md](SPEC.md).
