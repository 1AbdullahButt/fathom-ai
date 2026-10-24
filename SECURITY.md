# Security (SEC-1)

Public demo, no accounts. Seeded meetings are static JSON; user data (uploads, their
transcripts/notes, summary overlays, action-item edits, highlights, clips, rate-limit log) is in
Supabase project `pcljaqoohcjtezjhupzp`, reached only from the server with the **publishable**
key. That key and the project URL are public by design, so anyone can call PostgREST/Storage
with exactly the rights the server has. The database rules are therefore the real boundary.

Pass done 2026-10-24 on branch `sec-1`. Highlights/clips (built in parallel) were not reviewed
here; they need a follow-up pass.

## Action needed by the human

1. **Rotate `GROQ_API_KEY` and `ASSEMBLYAI_API_KEY`.** The Vercel CLI does not read `.gitignore`,
   so the first two deployments uploaded `.env` into the deployment source (visible to Vercel
   team members, not public). Fixed by `.vercelignore`; both deployments were removed. The keys
   must still be treated as exposed:
   - Groq console: create a new key, revoke the old one.
   - AssemblyAI dashboard: rotate the API key.
   - `npx vercel env rm GROQ_API_KEY production` then `npx vercel env add GROQ_API_KEY production`
     (same for `ASSEMBLYAI_API_KEY`), update local `.env`, redeploy.
2. Optional: set `UPLOAD_SALT` (random 32+ chars) in Vercel production. Without it the IP-hash
   salt is derived from the AssemblyAI key, so rotating that key resets rate-limit windows once.
3. Merge and deploy `sec-1` promptly: migration `0002_security` is already applied to the live
   database, and the currently deployed code still uses `upsert` (needs update grants that were
   revoked) and reads `upload_log` directly. Until the new code is live, uploads, processing and
   new template summaries fail on production; seeded meetings and saved summaries still load.

## What was checked

| Check | Command / method | Result |
|---|---|---|
| Secrets in working tree (tracked, untracked, ignored; incl. `.agent-logs/`, `.loop/`, `.codex/`) | `grep -rnIE 'gsk_…\|sk-ant-…\|sk-…\|ghp_…\|github_pat_…\|AIza…\|eyJhbGci…\|sb_secret_…\|service_role' --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git .`, plus 32-hex next to "assembly", `authorization:`, `password=` | Only `.env:1` (`gsk_jF…`, Groq), `.env:2` (`2ff65c…`, AssemblyAI) and `.env.local:2` (`eyJhbG…`, Vercel OIDC dev token, short-lived). All gitignored and vercelignored. `authorization:` hits are header code reading env vars, no literals. |
| Secrets in git history | `git log -p --all \| grep -nIE '<same pattern>'`; also each literal value from `.env`/`.env.local` searched with `grep -F` in history and tree | No hits. No history rewrite needed. |
| `.agent-logs/` | same scans (4 tracked files) | Clean, nothing to redact. |
| Service-role / secret key | `grep -rniE 'service_role\|sb_secret\|SUPABASE_SECRET'` in code; `process.env.*` usage; `npx vercel env ls` | None. Vercel has `GROQ_API_KEY`, `ASSEMBLYAI_API_KEY` (Secret, Production) and `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only. |
| Client bundle | `npm run build`, then `grep -rlE` in `.next/static` for `gsk_`, `sk-`, `sk-ant-`, `eyJhbGci`, `sb_secret_`, `sb_publishable_`, `ASSEMBLYAI`, `GROQ`, `service_role`, `supabase.co` | 0 files for all. Supabase is used server-side only, so even the publishable key is not shipped. |
| Supabase advisors | MCP `get_advisors` security + performance | Before: none. After: one intended WARN (lints 0028/0029) for `count_upload_log`, see below. Performance: none. |
| RLS / grants | `pg_policies`, `information_schema.role_table_grants` / `column_privileges`; then a rolled-back `set local role anon` probe block | RLS on all 7 tables; findings below. |
| Upload limits | read `app/api/uploads`, `lib/uploads.ts`, bucket row; live run against Supabase (`next start` with `TRANSCRIBE_MOCK=1 LLM_MOCK=1`) | MIME allowlist + 200 MB + 60 min + 3/h/IP server-side; bucket enforces MIME + size (a `text/html` PUT to a signed URL got `415 invalid_mime_type`). |
| Raw HTML | `grep -rnE 'dangerouslySetInnerHTML\|innerHTML\|outerHTML\|insertAdjacentHTML\|eval\(\|new Function\|marked\|remark\|rehype\|markdown-it\|react-markdown\|document\.write'` in app/components/lib; package.json | One use: `components/ui/Icon.tsx` renders static built-in SVG paths plus an escaped `<title>`; no user/model text. Transcript, summaries and action items render as React text. No markdown renderer installed. |
| Ids / traversal | read routes, `lib/seed.ts`, `lib/data.ts` | Seeds are a `Map` lookup over bundled JSON (no filesystem paths); Supabase ids go through parameterised PostgREST filters; the memory file route is a `Map` key. `GET /api/meetings/..%2F..%2Fpackage.json` returns 404. |
| Error leaks | read every route | Routes return fixed user-facing messages; details go to `console.error` server-side only. No stack traces or env in responses. |

## What was found and fixed

All DB changes are in `supabase/migrations/0002_security.sql` (applied as migration
`0002_security`). Verified with an anon-role probe (rolled back): every "denied" below was denied
and every pipeline write still worked; then a full upload -> process -> ready -> template switch
run against the live project passed, and `npm run check` + `npm run test:e2e` pass.

1. **Anyone could overwrite any summary**, including the overlay on seeded meetings
   (`update summaries using (true)`). Now write-once: no update grant/policy; the app inserts
   with `ON CONFLICT DO NOTHING` (`ignoreDuplicates`), which needs only insert.
2. **Any uploaded meeting could be updated at any time, including `title` and `media_url`.** Now
   only `processing`/`error` meetings are updatable (ready ones are frozen), `title` is no longer
   grantable, and `media_url` must match this project's `uploads/<meeting id>/<safe name>`
   (function `is_own_media_url`, used by insert and update policies). Insert also requires a
   UUID id, `status = processing`, `error is null`.
3. **Process route could be pointed at any URL and had no rate limit.** A row written directly
   through PostgREST could carry any `media_url`, which the server HEAD-fetched and sent to
   AssemblyAI, and `POST /api/meetings/[id]/process` could be repeated (Retry) without limit.
   Now: the DB rejects foreign URLs, `lib/process.ts` also refuses a `media_url` that is not the
   upload's own (`isOwnMediaUrl`), and every paid start (first run or Retry) counts against
   `PROCESS_STARTS_PER_HOUR = 6` per IP (`proc:` rows in `upload_log`), returning 429 beyond it.
4. **No server-side duration bound when the client omits/lies about duration.** Transcription
   requests now send `audio_end_at = 60 min + 5 s`, so AssemblyAI stops there; the existing
   post-transcription check still rejects over-long files.
5. **Action items: every column updatable** (incl. `id`, `meeting_id`, `evidence`,
   `confidence`). Now only the human-editable fields (`task, owner, due, due_phrase,
   edited_by_human`); extraction inserts with `ON CONFLICT DO NOTHING`.
6. **`upload_log` (salted IP hashes) was publicly readable, and rows could be back/forward-dated**
   to poison someone's limit. Now no select for anon; the server counts via
   `count_upload_log(hash, since)` (security definer, `search_path = ''`, returns only a count,
   window capped at 1 day). Inserts must look like a server hash (`^([a-z]+:)?[0-9a-f]{64}$`)
   with `created_at` within 1 minute of `now()`. The advisor warns that anon can execute a
   security-definer function: intended, it exposes only a count for a hash you already know.
7. **Storage insert allowed any path in the bucket.** Now only
   `<uuid>/<[A-Za-z0-9_-]+>.<ext>` for a meeting that is still `processing`. No select, update or
   delete policies: no listing, no overwrite, no delete. Bucket re-asserted: public read,
   `file_size_limit` 200 MB, the 18 audio/video MIME types (same list as `ALLOWED_TYPES`).
8. Segments: insert additionally requires the pipeline's id scheme (`<meeting id>-s<n>`); still
   only while the meeting is processing. Summary `points` and action `evidence` arrays are capped
   (100 / 50 entries).

No delete is possible for anon/authenticated on any table or on storage.

## Known limits (accepted for the demo)

- **No auth.** Anyone can create uploads, highlights, clips and action-item edits, within the
  rate limits and the shapes above, and anyone can read all user data (it is a public demo
  workspace). Anyone with the publishable key can also write rows directly through PostgREST,
  bypassing the app's per-IP limits for *free* writes (rows, not paid work). Paid work (AssemblyAI,
  Groq) only happens inside our server routes, which apply the limits.
- **Rate limits are IP-based and approximate**: first `x-forwarded-for` hop (Vercel sets it),
  shared NATs share a limit, rotating IPs get more. Limits: 3 uploads/h, 6 processing starts/h,
  10 template generations/h per IP; one generation per (meeting, template) ever.
- **Cost exposure** is bounded by those limits, 200 MB / 60 min per file, and `audio_end_at`;
  not by a global budget. Set spend caps in the Groq and AssemblyAI dashboards if available.
- **In-flight de-duplication and the memory store are per server instance** (memory mode is for
  tests/CI only; production uses Supabase).
- **Storage checks the declared Content-Type, not the bytes.** A non-media file labelled
  `audio/mpeg` can be stored; it is served from `supabase.co` with that audio type (not as HTML),
  and transcription fails on it, so it is not an XSS vector.
- **Highlights/clips** inserts are still `with check (true)` / `(public)` from 0001; review with
  the highlights/clips work.
- **P2-3 inline edits** will need a points-only summary update grant + policy.
- Test rows created during verification (meeting "sec-1-check" and earlier QA uploads) remain in
  the public list, since nothing can delete them through the app's role.
