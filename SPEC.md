# Fathom rebuild: spec v4 (aligned to the 8x brief)

Reference: fathom.video. Judged on: SPEED (working product in the time), PRODUCT JUDGEMENT
(what was built first, what was left out), UX/UI (good to use). Ship working product first,
polish second, extra tests last.
Locked: SPEC.md and (after Phase 0) tests/. Edit SPEC.md by hand only, after using Fathom.
Research: design/references.md. Put your own Fathom screenshots in research/.

## 0. Hard requirements from the brief
- Live link, deployed, opens for someone NOT signed in (no auth wall; public demo workspace).
- Public repo with .agent-logs/ committed AS YOU GO (from the 8x capture setup, done first).
- Seeded with real meetings. An empty meetings list fails. Must include one long
  multi-speaker meeting (target: ~1 hour, 6-8 speakers), because "that is the case that matters".
- Capture layer may be stubbed (no bot). Say so in the walkthrough.

## 1. Goal
Fathom without the bot: upload or record a meeting, get a speaker-labelled transcript synced
to playback, summaries in switchable templates, action items, highlights, search across
meetings, and shareable clips that open without an account. Built to stay usable on a
1-hour, 8-person meeting. Differentiator: a trust layer (section 9).

## 2. Scope, in build order (each step deployed before the next)
P0 (by ~hour 6, deployed):
 1. Meetings list (seeded) -> meeting page: player + transcript with speaker names and
    timestamps; current line highlights during playback; click a line to seek.
 2. Upload audio/video -> transcription with speaker diarization -> appears in the list.
 3. AI summary (default template) + action items, each item linked to transcript evidence.
P1 (by ~hour 12):
 4. Switch summary templates (General, Sales call, 1:1 / Standup). Cached per meeting.
 5. Search across meetings (transcript text + titles); results jump to the moment.
 6. Highlights: select transcript text or press H during playback -> saved highlight with
    note; listed in a Highlights tab.
 7. Share a clip: a highlight or time range gets a public link (/c/<id>) that plays just
    that range with its transcript, no sign-in.
P2 (long-meeting UX, the case that matters):
 8. Chapters/topics with timestamps for navigation; speaker filter; talk-time per speaker;
    summary built map-reduce over chunks so a 1-hour transcript works.
Stretch: Ask across meetings with citations; themes across meetings; browser recording.
Cut: bot, calendar connect, CRM/Slack integrations, teams, scorecards, billing.

## 3. Data model
- Meeting: id, title, date, duration_s, media_url, speakers[{id,name}], status
- Segment: id, meeting_id, start_s, end_s, speaker_id, text
- Summary: meeting_id, template, points[{text, evidence[segment_id]}]
- ActionItem: id, meeting_id, task, owner (nullable), due (nullable), due_phrase,
  confidence (high|low), evidence[segment_id], edited_by_human (bool)
- Highlight: id, meeting_id, start_s, end_s, note, created_at
- Clip: id, meeting_id, start_s, end_s, title, public (true)
- Chapter: meeting_id, title, start_s

## 4. Transcription and AI
- Transcription: a provider with speaker diarization that accepts long files by URL.
  Default: AssemblyAI (speaker labels, long audio). Alternative: Deepgram. Whisper alone has
  no speaker labels, so it fails the 8-person case. Verify pricing/free credit on their site.
- LLM for summaries/actions: Groq (or Claude). Output strict JSON, validate, retry once.
- Items with no valid evidence are dropped. Owner/due null unless said aloud.
- Relative dates resolve against the meeting date; keep the original phrase.
- Long meetings: chunk transcript (~10 min), summarize chunks, then merge.
- Public demo cost guard: limit uploads (e.g. max 60 min, few per hour per IP).

## 5. Acceptance criteria
- A1: Opening the live URL in a private window shows seeded meetings, no login.
- A2: On the 1-hour meeting: playback and transcript stay in sync; click-to-seek works;
  speakers are named; the page stays responsive.
- A3: Every summary point and action item has evidence that seeks to the right moment.
- A4: Switching template changes the summary; switching back is instant (cached).
- A5: Search finds a phrase across meetings and jumps to it.
- A6: A highlight can be created and turned into a clip; the clip link opens signed out.
- A7: Upload a new file -> processed -> appears with summary, with progress and error states.
- A8: Missing owner/due stays null, never invented.

## 6. Locked fixtures (/tests/fixtures)
Store each meeting as a JSON transcript (segments with id, start_s, end_s,
speaker, text) plus an expected-output JSON. Extraction is tested on these
TEXT fixtures, so tests do not depend on Whisper. Also record both as audio,
but use the audio only for the demo and one end-to-end smoke test.

### Meeting 1: "Weekly product sync" (about 2 min)
Speakers: Sara (PM), Omar (engineer).

Transcript:
- 00:00 Sara: Okay, let's start. Two things today: the onboarding drop-off and the release date.
- 00:12 Omar: Drop-off is mostly at the phone verification step. About 40 percent leave there.
- 00:25 Sara: That's a lot. Omar, can you look at whether the SMS code is arriving late? Please have a finding by Thursday.
- 00:38 Omar: Sure, I'll check the provider logs by Thursday.
- 00:50 Sara: On the release, marketing wants the 15th, but I think the 22nd is safer.
- 01:05 Omar: I agree with the 22nd, QA needs the extra week.
- 01:18 Sara: Fine, we go with the 22nd. I'll tell marketing today.
- 01:30 Omar: One more thing, we should probably think about dark mode at some point.

Expected output:
- Summary points (each with evidence):
  1. Onboarding drop-off is concentrated at phone verification (~40%). [00:12]
  2. Release date moved to the 22nd to give QA an extra week. [00:50-01:18]
- Action items:
  1. Task: Check SMS provider logs for delayed codes. Owner: Omar. Due: Thursday. Confidence: high. [00:25-00:38]
  2. Task: Tell marketing the release is the 22nd. Owner: Sara. Due: today. Confidence: high. [01:18]
- Must NOT be an action item: dark mode (no commitment, no owner).

### Meeting 2: "Customer call: Ayesha" (about 2 min)
Speakers: Sara (PM), Ayesha (customer).

Transcript:
- 00:00 Sara: Thanks for joining, Ayesha. How has onboarding been for your team?
- 00:10 Ayesha: Honestly, confusing. The verification step took three tries for two of my people.
- 00:28 Ayesha: Also, we really need a way to export reports to Excel.
- 00:40 Sara: Understood. I'll send you the roadmap for exports.
- 00:55 Ayesha: And someone should look at the pricing page, it's unclear what's included.
- 01:10 Sara: Good point.

Expected output:
- Summary points: verification step was hard (needed repeated tries); customer wants Excel export; pricing page unclear.
- Action items:
  1. Task: Send Ayesha the export roadmap. Owner: Sara. Due: null. Confidence: high. [00:40]
  2. Task: Review pricing page clarity. Owner: null. Due: null. Confidence: low. [00:55-01:10]

### Cross-meeting (stretch, A7)
- Theme "Phone verification friction": meetings 1 and 2, with quotes from
  00:12 (M1) and 00:10 (M2).

## 7. Tests to write first (and lock)
Two layers, because LLM output varies run to run.

Layer 1: deterministic, runs in `npm run check` on every change (no API calls).
- schema_valid: the validator accepts good output and rejects malformed output.
- evidence_valid: validator drops items whose segment ids don't exist.
- evidence_present: validator drops items with empty evidence.
- null_not_invented: validator keeps null owner/due as null.
- seek: clicking an item seeks the player to that segment's start_s (component test).
- e2e_smoke (Playwright, mocked API): upload → summary → click item → transcript scrolls.

Layer 2: live model evals, `npm run eval` (costs tokens, run by the QA agent, not every edit).
Run each fixture 3 times; pass if 3/3 meet:
- Meeting 1 has the two expected action items (fuzzy match on task, exact on owner and resolved due).
- Meeting 1 has no dark-mode action item.
- Meeting 2 item 2 has null owner and null due.
- "What was the budget?" returns "not found in meetings".

## 8. Build order
1. 8x capture setup until its test passes. Commit .agent-logs/. (Do this BEFORE anything.)
2. Scaffold (Next.js + TS, Vitest, Playwright), deploy the empty app to Vercel immediately.
3. Seed pipeline: transcribe the real seed recordings once, store results, load on deploy.
4. P0, deploy. P1, deploy. P2, deploy. Commit .agent-logs/ with every commit.
5. Final QA in a signed-out private window, then the walkthrough.

## 9. Product decisions (DECISIONS.md: reference / mine / why)
1. HEADLINE: trust layer. Fathom: summary items jump to the recording. Mine: each item shows
   its supporting quote inline; no evidence = not shown; owners/dates never invented;
   low-confidence items flagged. Why: AI is confident when wrong.
2. Built for the 1-hour, 8-person meeting: chapters, speaker filter, talk time, map-reduce
   summary. Why: the brief calls it the case that matters; short demos hide the real problems.
3. Edits stay yours: inline edits marked as human-written. Why: reviews say Fathom summaries
   are hard to edit.
4. Upload any recording, no bot. Why: reviews ask for uploads; bot is stubbed per the brief.
Cut on purpose (one line each in DECISIONS.md): bot, calendar, integrations, teams, billing.

## 10. Walkthrough (5 min max, camera on)
- 0:00 What it is and the one decision that matters most
- 0:30 Signed-out live link: meetings list, open the 1-hour 8-person meeting
- 1:30 Evidence on summary/actions, template switch, search, highlight -> clip shared
- 3:00 What I cut and why (bot stubbed, calendar, integrations), what Fathom does that I didn't
- 4:00 How I built it: agents, locked tests, one place the AI got it wrong
- 4:40 What I'd build next
