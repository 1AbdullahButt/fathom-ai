# Status

**Live:** https://fathom-ai-tau.vercel.app (opens signed out, no login)

**Deployed level:** P0, QA PASS on commit e5f707f (deployed 2026-10-24). P1-1 templates and P1-2 search
are merged on main but not deployed until P1 QA passes; P1-3 highlights and P1-4 clips are in progress.

**Works on the live site:** meetings list with 6 seeded meetings (56-min Seattle City Council
committee, 8 named speakers; 3 AMI meetings; 2 spec fixture meetings, transcript-only); meeting page
with real audio, transcript synced to playback, click-to-seek, `?t=` links; summary and action items
where every item shows its supporting quote and seeks to it; "not stated" for owners/dates nobody
said; upload of audio/video up to 60 min (AssemblyAI with speaker labels, then Groq summary).

**Known gaps:** no templates/search/highlights/clips on the live site yet (P1); no chapters, speaker
filter or talk time (P2); Ask across meetings not built (P2-4); uploads depend on Groq free-tier
daily limits (fallback across 3 models); the bot/recording capture is stubbed by design; the Groq and
AssemblyAI keys were uploaded to the first Vercel deployment's source (team-visible only) and should
be rotated (SEC-1).
