# Decisions

Format: what the reference (Fathom) does / what we do / why.

## Loop and tooling
- **Protect hook redirect fix (human-approved, one edit).** The PreToolUse hook treated any
  `2>&1` or `> /dev/null` as a file write, so read-only commands mentioning tests/ or .claude/
  were blocked. With explicit human permission, one line in .claude/hooks/protect-tests.sh now
  strips `N>&M` and `> /dev/null|nul` before the write check. Nothing else in the hook changed.
- **Package name.** The folder is "Fathom AI" (space, capitals), which npm rejects, so
  package.json is written by hand with `"name": "fathom-ai"`.
- **e2e outside `npm run check`.** `check` stays `tsc && eslint && vitest && next build`;
  Playwright `e2e_smoke` runs as a separate CI step against a production build. Why: keeps
  the local gate fast; CI still blocks merges on e2e.

## Stack (human-approved)
- **Data:** Supabase free tier (Postgres + Storage), no paid add-ons. Uploads go straight to
  Storage through signed upload URLs, which avoids the Vercel request-body limit.
- **LLM:** Groq for summaries/actions and the map-reduce over long meetings; switch to Claude
  only if Groq rate-limits.
- **Seed:** long meeting = a public-record city council meeting (~1h, 6-8 speakers); short
  meetings = AMI Meeting Corpus (CC BY 4.0). Spec fixtures are seeded transcript-only (no audio).
- **Deploy:** new Vercel project `fathom-ai` via `npx vercel --prod`; no other project is touched.

## Architecture
- **Seeded meetings as static JSON, user data in Supabase.** Fathom stores everything in its
  backend. We ship the seeded meetings (transcripts, summaries for every template, actions,
  chapters) as JSON in the repo and keep only user-created data in Supabase. Why: free
  Supabase projects pause after a week idle; the live demo must never show an empty list.
- **Publishable key + RLS, no service-role key.** Public demo workspace with no auth, so
  writes go through narrow RLS policies. The cost guard sits on the processing route, which is
  the only step that spends money.
- **Ask across meetings moved from stretch into the last P2 task (minimal).** SPEC section 7's
  locked eval requires "What was the budget?" -> "not found in meetings", so a minimal,
  evidence-only `lib/ask.ts` is needed for the eval to pass.
- **Meeting page sizes the transcript for 1h.** The 1-hour meeting has ~1,000+ segments; the
  transcript is windowed so playback sync stays smooth.

## Product (from the design import)
- **Templates:** Fathom offers many templates. We ship the three SPEC names (General / Sales call /
  1:1 & Standup) and drop the design kit's extra ones. Why: fewer, tested templates.
- **Record is stubbed.** Fathom joins calls with a bot. Our Record button opens a no-bot dialog
  saying capture isn't available in this demo; upload is the working path. Why: brief allows a
  stubbed capture layer; a fake recording bar would mislead.
- **Upload limits shown up front** (max 60 min, 3 per hour) instead of the kit's "up to 4 hours".
  Why: public demo cost guard.
- **Long seed meeting is 56 min, not 60.** Seattle City Council LEN committee, 13 Mar 2025
  (public record). Close enough to the ~1h target; not padded.
- **e2e step advisory until P0-7.** The locked smoke test drives upload, summary and transcript
  seek, which only exist after P0-7. Until then the CI e2e step runs with continue-on-error so
  P0 PRs can merge on `npm run check`; the P0-7 PR must remove continue-on-error.

## Data layer (P0-3)
- **Seed bundled via generated static imports.** `scripts/build-seed.ts` writes
  `seed/meetings/*.json` plus `seed/index.ts` that imports them, so `next build` bundles the
  seeded meetings into the server code (no fs paths to trace on Vercel). Seed media is copied
  to `public/media/` and served as static files. The SPEC fixtures (m1, m2) are seeded as
  transcript-only meetings with their own speaker ids.
- **Overrides of seeded data live in Supabase.** Fathom edits its own records. Seeded JSON is
  read-only, so summaries/action items saved for a seed meeting id (template cache, human
  edits) are stored as user rows and layered over the seed on read. Highlights and clips use
  a plain-text meeting_id (no FK) so they work on seeded meetings too.
- **Anon RLS, no deletes.** No auth, so the publishable key can read everything, insert, and
  update only status/result columns (column grants). Nothing can be deleted through the API;
  uploads can only be inserted as `processing`, segments only while their meeting is processing.
- **Upload rate limit stored as a hashed client key** (`upload_log.ip_hash`), never a raw IP,
  because the table is publicly readable.

- **Action items have no done checkbox (yet).** The design kit's ActionItem has a checkbox; our
  ActionItem data has no done state and PLAN.md does not ask for one, so the P0-2 restyle keeps
  the locked props and leaves the checkbox out. Human-edited text gets the serif/pencil styling
  but no editor-name chip, because SummaryPoint/ActionItem carry no editor name.

## Where the AI got it wrong (kept for the walkthrough)
- Seattle seed, action item "Confirm REACH partnership staff involvement": the model set owner
  "Sokha Danh", high confidence, but the cited quote is Councilmember Solomon asking a question;
  no one committed. Corrected by hand to owner null / low confidence and marked edited_by_human,
  which is exactly the case the trust layer (quote shown inline) is meant to expose.

## Meetings list (P0-4)
- **Upload sits before Record in the button pair.** The kit puts Record first; Record is a stub
  here and Upload is the working path, so it leads. Both stay equal-weight primary buttons.
- **Seeded meetings carry a "Sample" badge** where the kit shows a Recorded/Uploaded source badge.
  We have no recorded meetings; seeded ones are public sample recordings, so we say so.
- **No date-group headers, search box or filter yet.** The kit groups rows under Today /
  Yesterday / This week with search + All/Recorded/Uploaded. Seed dates are years apart, so
  groups would be one row each; search is P1-2; there is nothing "Recorded" to filter.
- **Sidebar has only "Meetings" and no user block.** The kit shows Clips, Settings and a signed-in
  user. There is no auth and no clips library, so those would be dead links.
- **Processing and error rows are still links** for now (the kit makes processing rows
  unclickable). P0-7 owns the live processing states and can change this.

## Meeting page (P0-5)
- **No sidebar on the meeting page.** Like the kit's MeetingPage, the page is full width with a
  60px top bar ("Meetings" back link, title, meta); the app sidebar would squeeze the 3-column grid.
- **Top bar has no avatar stack or Share button yet.** Sharing is clips (P1-4); a Share button now
  would copy a link nobody else can sign in to. Speakers are listed in the wide left column.
- **Left column is a plain speaker list (with the speaking speaker marked), chapters only if the
  meeting has any.** Talk-time bars, speaker filter and chapter progress are P2-2. The mid-width
  Transcript / Chapters / Speakers segmented control is left out for the same reason.
- **No "Find in transcript" box or "Follow playback" switch in a toolbar.** Follow pauses on any
  user scroll (wheel, touch, scroll keys, scrollbar drag) and a floating "Resume follow" button
  turns it back on; clicking a line, the scrubber or a quote also re-enables it. Find is not in PLAN.
- **Clicking anywhere on a transcript line seeks** (the kit only makes the timestamp clickable),
  unless the click ends a text selection, so P1-3 highlights from selected text still work.
  Consecutive lines from one speaker hide the name visually but keep it for screen readers.
- **Audio-only and transcript-only meetings show the kit's simulated "speaker view" stage**
  (active speaker + caption) over a hidden `<audio>`; transcript-only meetings (m1, m2) run a
  simulated clock so play/seek/follow still work. Video files render a real `<video>`.
- **Phone tabs are Transcript / Summary / Actions** (the kit adds Clips; clips are P1-4).
- **Quote chips are not marked "active" while their segment plays.** That needs the clock in the
  side panel (a re-render per tick); the transcript line highlight shows the same thing.
- **Template select and the AI/human legend are not in the Summary tab yet** (P1-1 / P2-3).
- **Tab counts are hidden from the tab's accessible name** (`aria-hidden` on the count) so the tab
  is named exactly "Action items", as the locked e2e test expects.
- **Groq model chain instead of one model.** Reference: one hosted model, no visible quota.
  We: `lib/llm.ts` tries `GROQ_MODELS` in order (default `openai/gpt-oss-120b`,
  `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`). A 429 with retry-after > 20 s or a daily-cap message
  moves to the next model at once; a short 429 waits and retries the same model once. A model that
  rejects JSON mode gets a plain "JSON only" prompt and its reply is parsed. Why: Groq free-tier
  limits are per model, and seed generation used up gpt-oss-120b's 200k tokens/day, so uploads and
  evals failed for hours. Output quality on the fallbacks may be a bit lower; M1/M2 evals pass on them.


## Upload pipeline (P0-7)
- **Uploaded speakers are named "Speaker A", "Speaker B", ...** AssemblyAI diarizes but does not
  know names; the reference product names speakers from the calendar invite. We have no calendar,
  and guessing names from the transcript would invent owners for action items.
- **Transcripts are split into sentence segments of at most 20 s** by word timings (same rule as
  scripts/split-seed.ts), so seeking and the following transcript land within a few seconds.
- **Processing runs inside the process route via `after()` with `maxDuration = 300`**, polling
  AssemblyAI in the function. A file whose transcription plus notes take longer than ~285 s fails
  with "Transcription took longer than this demo allows" and Retry. Short demo uploads finish in
  well under that (a 60 s clip transcribes in ~12 s). A webhook/queue design is in IDEAS.md.
- **Cost guard is checked twice**: the browser reads the duration from an `<audio>`/`<video>`
  element and rejects > 60 min before anything is uploaded; the server rejects a reported
  duration > 60 min, size > 200 MB, non audio/video types, and > 3 uploads per hour per client,
  and re-checks the real duration after transcription. Files whose duration the browser can't
  read are let through to that server check.
- **Rate limit key is a salted SHA-256 of the client IP** (first `x-forwarded-for` hop); the raw IP
  is never stored. Salt: `UPLOAD_SALT` if set, else a hash derived from the server-only
  `ASSEMBLYAI_API_KEY`, else a constant (memory mode only). To set a dedicated salt on Vercel:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | vercel env add UPLOAD_SALT production`
  (changing it resets the hourly counters, nothing else).
- **Processing and failed rows are not links** (design/screens.md §2); this replaces the P0-4 note.
  A failed row shows the reason in plain words and Retry: a failed upload re-sends the file kept in
  the tab; a failed processing step re-runs the pipeline (reusing a saved transcript, so a notes
  failure doesn't pay for transcription twice). Progress is real for the upload (XHR progress);
  after that the row shows the stage ("Transcribing", "Writing notes") with an indeterminate bar,
  because AssemblyAI reports no percentage.
- **Memory mode stores uploaded bytes in process memory** behind `PUT/GET /api/uploads/[id]/file`
  (with Range support so the player can seek). Enough for e2e/CI; real files go to Supabase Storage.

## Template switch (P1-1)
- **Action items stay from the general extraction.** Reference: Fathom templates reshape the whole
  note. We: switching template changes only the summary; the Action items tab always shows the
  general run's items (a template call's own action items are discarded). Why: one stable task
  list (and its human edits) per meeting, and no duplicate or contradictory items between templates.
- **Template label is "1:1 / Standup"** (SPEC §2 item 4), not design/screens.md's "1:1 & Standup":
  SPEC is the source of truth.
- **Templates are flat point lists with an inline category prefix** ("Pain point: ...",
  "Maria: ..."). Reference/design kit: section headers per category. We: keep the `Summary` shape
  (points with evidence) unchanged and let the prompt prefix each point. Why: no schema change; the
  evidence rules and tests stay identical across templates.
- **Generation happens once per (meeting, template), ever.** `POST /api/meetings/[id]/summary`
  returns a saved row if one exists (seeded JSON, precomputed, or generated earlier); there is no
  "regenerate". Seeded meetings have Sales and 1:1 precomputed by `scripts/generate-summaries.ts
  --template all`, so the demo switch costs nothing live; anything missing is generated on demand
  and saved as an overlay row.
- **Per-client limit of 10 generations/hour reuses `upload_log`** under the key `gen:<ip hash>`.
  Why: durable across serverless instances without a new table/migration; upload counts use the bare
  hash, so the two limits never mix. A double click is de-duplicated in-process.
- **The client caches every summary it has seen for the page's lifetime**, and the Summary tab stays
  mounted (hidden) while another tab is open, so switching back is instant (A4).

- **`?t=` link autoplay.** Reference / design §5: the search jump "seeks and plays". We seek, place
  the line a quarter from the top, and call play() on load. Browsers block autoplay with sound
  without a prior gesture (fresh tab, shared link), so then the page stays paused at that moment
  with the line in view and one tap on Play starts it. No muted-autoplay workaround: a silent
  playing clip is more confusing than a paused one.
- **Avatar initials are letters only.** A one- or two-letter parenthetical is the speaker label
  ("Team member, name not stated (B)" -> "B", keeping B/C/D distinct); other parentheticals and
  text after a comma are descriptions and are dropped ("Eileen (marketing)" -> "E").
- **Transcript lines no longer use `content-visibility: auto`.** Its estimated sizes made jumps
  land thousands of px off (QA findings 1-2). With all 379 Seattle lines laid out, 60 s of
  playback had 0 long tasks; the one 69 ms long task is page load.
- **Seeded pages bound their Supabase reads to 1.5 s** (override reads and the uploads in the list),
  with postgrest retries off for those reads; on timeout they show seed-only data.
- **Search (P1-2) is its own `/search` page; the list header box submits to it.** Reference kit
  filters the list inline; we follow design/screens.md section 5 so hits can show the matched
  transcript line and jump to it. Hits are listed in full per meeting (not the kit's 3 per meeting),
  capped at 50 overall with "Showing first 50", so no match is hidden without saying so.
  The sidebar gets a "Search" nav item (with the `/` hint) and the phone bar a search icon, instead of
  a second input box beside the list header's. No-results title is "No meeting mentions “q”".

- **Long quote lists collapse only above 3 quotes** (design/review-p0.md §2 says "first 2, then
  +N more"). A point or action item with 4+ quotes shows the first 2 and a "+N more quotes" /
  "Show fewer" toggle; 1-3 quotes all show, because a "+1 more" toggle saves less than it costs
  and the short fixtures' quote buttons stay visible. When playback reaches a hidden quote the
  list opens by itself (and stays open until closed); the playing quote's chip is highlighted.
- **Stage play button is a dark scrim, not 14% white** (review §5 says `rgba(255,255,255,.14)`).
  Over the light avatar tint, 14% white and a white icon were invisible; we use a 55% dark scrim
  with a 14% white ring. It is decorative (aria-hidden): the Play control in the bar is the
  accessible one, and a click on the stage does the same thing.
- **Caption clamp on an inner span.** The review's clamp on the padded caption box let the top of
  a third line show in the bottom padding in Chrome; the box keeps padding and the inner span
  clamps to exactly 2 lines with an ellipsis. Phone avatar on the stage is 44px (desktop stays 72).
- **Security model for the no-auth demo (SEC-1, SECURITY.md).** Fathom has accounts, per-user
  workspaces and auth-gated sharing. We have no auth and no service-role key: the server uses the
  public publishable key, so RLS is written as "what may any anonymous caller do" and limited to
  the writes current code paths make. Summaries are write-once (insert ON CONFLICT DO NOTHING) so a
  saved summary can't be overwritten; action items allow updates only of the human-editable
  fields; ready meetings are frozen; media_url must point at the upload's own bucket folder;
  upload_log is unreadable (counted through a security-definer function, an accepted advisor
  warning); paid pipeline starts are rate-limited per IP (6/h). Why: a demo with a public key
  can't stop anonymous writes, only bound them and their cost. P2-3 (inline edits) must add a
  points-only summary update path when it lands.

## P1-3 Highlights
- **Highlights are append-only; a note edit re-posts the same range.** Reference: a highlight's
  note is edited in place. Ours: the schema grants no UPDATE on `highlights` (public demo, no
  auth), so "Add note" / "Edit note" posts the same `start_s`/`end_s` again and reads keep the
  newest row per range (`latestPerRange` in lib/data.ts). Why: no migration or wider grant for a
  one-field edit; the visible behaviour is the same.
- **Selection -> "Highlight" -> small note form, then save.** The range runs from the first
  selected line's `start_s` to the last one's `end_s` (whole lines, not the exact words), because
  playback and clips work on segment times.
- **H only while playing, last 15 s (clamped at 0).** Design says "at the current line"; the PLAN
  says last 15 s, which we follow. Its toast stays 8 s (not 4) because it carries "Add note".
- **HighlightCard shows the note as its title and has no author line.** The kit card has a title
  and "Clipped by <name>"; there are no accounts, so no author. The quote is the words said in the
  range (first speaker's name, up to 4 lines).
- **Highlights tab copy.** The kit's empty text talks about clips; until clips exist the empty
  state and a hint line say "Select transcript text, or press H while it plays". Phone gets a
  fourth tab "Highlights" (design calls it "Clips").
- **Limits.** 30 highlights per client per hour, counted in `upload_log` under an `hl:` prefix
  (same pattern as summary generations). Notes are plain text, up to 500 characters, control
  characters stripped, always rendered as React text.

## P1-4 Clips
- **Clip page header links to the full meeting, not a sign-up.** Kit ClipPage has "Try Sotto
  free"; there are no accounts, so the right-hand link is "Full meeting" (`/m/<id>?t=<start>`), and
  the footer says "Recorded with Fathom AI. No bot joins the call." plus the same link.
- **No author line** ("shared by …"): no accounts. Meta is "From <meeting> · <date> · 0:12–0:38 of 1:40".
- **The clip page only receives the clip's segments**, not the whole transcript, so a public link
  exposes just that range's words. The full meeting is still public via its own link (demo workspace).
- **Range enforcement is client-side** on the meeting's media file: playback starts at `start_s`,
  pauses at `end_s` (media time updates arrive ~4 times a second, so it can run up to ~0.25 s
  past the end before stopping), and the scrubber, ±10 s and transcript clicks are clamped to the
  range. We do not cut a separate media file per clip (no server-side media processing).
- **"Clip this moment" is now ±15 s** (PLAN), not the kit's −10 s/+35 s. The dialog keeps the
  kit's optional title; a highlight's Clip button uses its note as the title (else "Clip at m:ss").
  Ranges shorter than 1 s are widened to 1 s.
- **Clipboard fallback.** If the browser refuses clipboard access, the toast says "Clip created"
  and shows the URL instead of "Link copied". Both toasts have "Open".
- **Not-found status.** `/c/<unknown>` renders the not-found state; with the route's
  `loading.tsx` streaming, Next.js sends it with HTTP 200 + `noindex` (same as `/m/<unknown>`).
- **Limits.** 30 clips per client per hour (`upload_log`, `clip:` prefix); titles plain text,
  up to 120 characters.
## Process
- **Deployed main before P1 QA, once.** SEC-1's database migration went live before its code,
  which broke production uploads (old code needed the revoked grants). Deploying main restored
  them but also shipped P1-1..P1-3 ahead of their QA round (all had passed CI + e2e). Chosen
  because broken uploads on the live link were worse than additive, CI-tested features. P1 QA
  runs next on the deployed commit.
