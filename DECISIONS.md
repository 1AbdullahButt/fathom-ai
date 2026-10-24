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
