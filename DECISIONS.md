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
