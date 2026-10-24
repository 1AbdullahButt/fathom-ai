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
