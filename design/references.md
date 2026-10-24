# UI references and user complaints (researched 2026-10-24, from public sources)

Use this to design screens and to justify decisions in DECISIONS.md and the walkthrough.
Paraphrased from public pages; verify in the live product before quoting any of it.

## Fathom (the reference)
- Meeting page: video on top, transcript below in a chat-style layout, speakers separated.
  Scrolling the transcript jumps the video to that point.
- Summary: pick a template (e.g. chronological, sales call); organized into topics, key
  takeaways, next steps. Clicking a summary item jumps to that moment.
- Action items: copyable list; drafts a follow-up email with a recording link.
- Highlights: flag moments during the call, with tags; share clips to Slack.
- Source: zapier.com/blog/fathom-features

## User complaints about Fathom (Capterra reviews, page 15)
- Can't upload outside recordings.
- Summaries hard to edit; can't tailor what the AI focuses on per meeting type.
- Summary length doesn't scale with meeting length.
- Meetings sorted by date only, no folders.
- Speakers sometimes misattributed; technical names misspelled.
- Praise: summaries and action items save real time; accurate transcripts; easy setup.

## Granola
- A notepad: you type fragments during the meeting, the AI expands them afterwards.
- Your words in black, AI's in gray, so authorship is always visible.
- "Zoom In" shows the transcript quotes behind a note.
- No visible bot. Source: granola.ai/blog/announcement

## Otter
- Transcript with speaker labels and timestamps; summary panel with templates on the right.
- Complaints: speakers shown as Speaker 1/2, wrong speaker attribution, summaries can't be
  edited or exported, slow refresh. Source: kripeshadwani.com/otter-ai-review

## What this means for our screens
- Meeting view: summary + action items on the left, transcript on the right (or below on
  mobile). Each item shows its quote inline; click plays audio from that line.
- Edited text styled differently from AI text.
- Low-confidence items visibly flagged, with owner/due shown as "not stated" rather than blank.
- Upload is as prominent as Record on the home screen.
