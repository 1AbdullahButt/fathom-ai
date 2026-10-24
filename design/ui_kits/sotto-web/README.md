# Sotto web app — UI kit

Interactive recreation of the three core surfaces. Open `index.html`; the **Demo state** bar at the bottom switches loading / empty / error / processing states per screen. `phone.html` shows the same app in 390px frames.

Routes (hash): `#/` meetings list · `#/m/q3` meeting page · `#/c/<clipId>` public clip (`beta-date`, `uploads-41`, `positioning`; anything else = not found). Append `?state=loading|empty|processing|error|notfound` and `&demo=0` to hide the bar.

Files
- `data.js` — seed: 8 speakers, 67-line transcript over 1:02:18, 7 chapters, 3 summary templates, 7 action items, 3 highlights, 9 meetings.
- `Shell.jsx` — `usePlayback` (simulated clock), `useViewport` (wide ≥1200 / mid / phone <760), Sidebar, PhoneBar, DemoBar, `Stage` (speaker-view media surface with captions).
- `MeetingsList.jsx` — search (titles + transcript text, `/` to focus), All/Recorded/Uploaded filter, Record + Upload dialogs, live processing rows, retry on failed upload.
- `MeetingPage.jsx` — layout per viewport, chapters, speaker filter with talk-time, transcript synced to playback (auto-follow, find-in-transcript).
- `MeetingPanel.jsx` — Summary (template switcher, inline human edits), Action items, Highlights (clip from current moment → public link).
- `ClipPage.jsx` — no-login public page: range-limited player + transcript of that range.

Caveats: playback is simulated (no media file); only “Q3 roadmap review” is fully seeded.
