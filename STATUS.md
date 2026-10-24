# Status

**Live:** https://fathom-ai-tau.vercel.app (opens signed out, no login)

**Deployed:** main at 5567c63 (final round, scope frozen). QA PASS on 5567c63: P0, P1, P2, the
security passes (SEC-1, SEC-2) and the follow-up fixes all went through QA on their deployed commit.

**Works on the live site**
- Meetings list with 6 seeded meetings: a 56-min Seattle City Council committee meeting with 8 named
  speakers, 3 AMI meetings, and 2 transcript-only spec fixtures.
- Meeting page: real audio, transcript synced to playback, click-to-seek, `?t=` links (open paused at
  that moment); chapters, speaker filter and talk time; layouts for desktop, mid width and phone;
  buffering state ("Loading audio…") on slow networks; a pending bar while a meeting or clip opens.
- Summary in three templates (General / Sales call / 1:1 / Standup, precomputed for seeds, cached
  per meeting) and action items. Every item shows its supporting quote and seeks to it; owners and
  dates nobody said show "not stated"; low-confidence items are flagged; inline edits are marked as
  human-written.
- Upload of audio/video up to 60 min and 200 MB (AssemblyAI with speaker labels, then Groq, with
  map-reduce for long meetings), with progress, error states and retry.
- Search across meetings and Ask across meetings: every sentence cited, duplicates merged in code,
  suggestions never stated as commitments, max 3 sentences, "Not found in your meetings" when
  nothing supports an answer. Both fall back to the seeded meetings if the database is slow.
- Highlights (select text or press H) and public clip links `/c/<id>` that play only that range,
  signed out. Unknown or deleted meetings and clips return a real HTTP 404.

**Known gaps**
- The recording bot and in-browser recording are stubbed by design (Record explains why; upload works).
- Stretch items not built: themes across meetings, browser recording.
- Groq free-tier limits: live generation (uploads, Ask) can be slow or return "try again" when every
  fallback model is rate-limited; seeded content is precomputed and never calls the LLM.
- Diarization merges a few voices in the seeds (e.g. Councilmember Moore; two remote appointees);
  uploads show "Speaker A/B/…" because names aren't known.
- No accounts: anyone can add uploads, highlights, clips and edits within rate limits, and nothing
  can be deleted through the app. QA test data was removed from the database on 2026-10-24.

**Known minor issues** (found in QA, deliberately not fixed; scope frozen)
- At 320 px the "Loading audio…" caption shrinks to "L…"; the spinner and aria-busy still show the
  state and screen readers get the full text.
- The clip page player was not separately checked against the last fix (no clip exists to test
  with); it shares the meeting player's code.
- Pressing Pause while a play is still queued before the audio loads was not exercised in a browser.
- 404 pages show their `<h1>` after the page loads; the raw HTML returned with the 404 is Next.js's
  error shell without it.
- Ask wording varies run to run, and once counted "I agree with the 22nd" as a commitment (agreement,
  not a task).
- Some long-meeting summary points cite up to 6–10 quotes (collapsed behind "+N more quotes").
- The low-confidence flag gives no reason (the data has none).
- Going back to the meetings list shows the list skeleton rather than the top pending bar.
