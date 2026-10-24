# Status

**Live:** https://fathom-ai-tau.vercel.app (opens signed out, no login)

**Deployed:** main with P0, P1, P2 and the security passes (SEC-1, SEC-2). Each level went through
QA; the final QA runs on the deployed commit (QA_REPORT.md, not committed).

**Works on the live site**
- Meetings list with 6 seeded meetings: a 56-min Seattle City Council committee meeting with 8 named
  speakers, 3 AMI meetings, and 2 transcript-only spec fixtures.
- Meeting page: real audio, transcript synced to playback, click-to-seek, `?t=` links; chapters,
  speaker filter and talk time; layouts for desktop, mid width and phone.
- Summary in three templates (General / Sales call / 1:1 / Standup, precomputed for seeds, cached
  per meeting) and action items. Every item shows its supporting quote and seeks to it; owners and
  dates nobody said show "not stated"; low-confidence items are flagged; inline edits are marked as
  human-written.
- Upload of audio/video up to 60 min and 200 MB (AssemblyAI with speaker labels, then Groq, with
  map-reduce for long meetings), with progress, error states and retry.
- Search across meetings and Ask across meetings with citations ("Not found in your meetings" when
  nothing supports an answer). Both fall back to the seeded meetings if the database is slow.
- Highlights (select text or press H) and public clip links `/c/<id>` that play only that range,
  signed out.

**Known gaps**
- The recording bot and in-browser recording are stubbed by design (Record explains why; upload works).
- Stretch items not built: themes across meetings, browser recording.
- Groq free-tier limits: live generation (uploads, Ask) can be slow or fail when every fallback model
  is rate-limited; seeded content is precomputed and never calls the LLM.
- Diarization merges a few voices in the seeds (e.g. Councilmember Moore; two remote appointees);
  uploads show "Speaker A/B/…" because names aren't known.
- No accounts: anyone can add uploads, highlights, clips and edits within rate limits, and nothing
  can be deleted through the app. Test rows from QA ("sec-1-check", "real-upload-check", "clip60",
  "key-rotation-check", "qa-p2-upload", plus QA highlights/clips/edits) are visible in the demo
  until removed by the owner.
- Some long-meeting summary points still cite up to 6–10 quotes (collapsed behind "+N more quotes").
