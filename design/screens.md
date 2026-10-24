# Screens

Source: the Sotto Design System (Claude Design project `5b0428c8-2e70-4623-a607-e4c522d5b851`),
imported verbatim into `design/`. `sotto.md` holds the full foundations; tokens are in
`tokens/*.css`; components in `components/**`; reference screens in `ui_kits/sotto-web/`.
SPEC.md wins on any conflict.

**The core moment:** read a summary point or action item, click its quote, land on the exact
transcript line with audio playing. Every screen choice below serves that path.

## Porting rules (read first)
- The `.jsx` components use inline styles + CSS variables. Port each one to a `.tsx` component
  under `components/` with the same props (the `.d.ts` beside it is the contract) and keep the
  token names. Do not hard-code hex values.
- **`ui_kits/sotto-web/data.js` is invented sample data** (the "Q3 roadmap review" meeting,
  Maya/Dana/Priya and the rest, the 9 meetings list). Do not use it as seed and do not copy its text
  into the app. Real seed comes from `seed/` and the fixtures in SPEC section 6.
- The ui_kit's `usePlayback` is a fake clock and `Stage` is a fake speaker view. In the app,
  drive everything from the real `<audio>`/`<video>` element's `currentTime`.
- The ui_kit's `DemoBar` and `?state=` query are for previewing only. Do not ship them.
- Brand: the system calls itself "Sotto" (a working name). Use the app's own product name in
  the wordmark spot (Newsreader 20–22px). No logo.
- Fonts: see `FONTS.md`.

## Content rules (all screens)
- Sentence case everywhere: buttons, tabs, titles, menu items ("Action items", "Copy link").
  Overlines are the only caps, done with CSS `text-transform`.
- Missing facts say **"not stated"**: `NotStated` with "Owner not stated" / "Date not stated".
  Never blank, never guessed (SPEC A8).
- Low confidence: `ConfidenceFlag` with a reason ("Low confidence · offered tentatively"),
  always next to its `QuoteChip`.
- **No emoji.** No exclamation marks, no "Oops", no "AI magic". Unicode only as typography:
  “ ” quotes, – for ranges, · as a separator, × for playback rate.
- **Timestamps are always IBM Plex Mono** (`Timestamp` / `formatTime`): `m:ss` under an hour,
  `h:mm:ss` above. Durations `1:02:18`.
- Errors follow: what happened, then that data is safe, then what to do.
- "We" = the app, "you" = the user. Never "I".

## Shared states kit
| State | Component | Notes |
|---|---|---|
| Loading | `feedback/Skeleton` mirroring the real layout | Never a lone page spinner. `Spinner` only inline (buttons, player). |
| Empty | `feedback/StateBlock kind="empty"` | Say why it is empty and give the next action. |
| No results | `StateBlock kind="noResults"` | Echo the query in “ ”, offer "Clear search". |
| Error | `StateBlock kind="error"` + "Try again" | `role="alert"` is built in. |
| Processing | `StateBlock kind="processing" loading` or `MeetingRow status="processing"` + `ProgressBar` | Show real progress text ("Transcribing · 64%"). |
| Not found | `StateBlock kind="notFound"` | Clip page and bad meeting ids. |
| Confirmation | `overlay/Toast` (bottom centre, 4s) | "Clip link copied", "Upload started". |

---

## 1. Meetings list `/`
Port: `ui_kits/sotto-web/MeetingsList.jsx`, `Shell.jsx` (Sidebar, PhoneBar), `components/meeting/MeetingRow`.

**Layout.** Desktop: 232px sidebar (`--sidebar-w`, wordmark, nav, "No bot joins your calls"
note) + main column max 920px, gutters 32px. Phone (<760): no sidebar, 52px `PhoneBar`, 16px gutters.
Header: serif "Meetings" title (32px / 26px phone) with a one-line muted subtitle on desktop.
**Record and Upload are an equal pair of primary `Button size="lg"`** in a 2-column grid
(full width on phone). Below: search `Input icon="search" shortcut="/"` ("Search titles and
transcripts") + `SegmentedControl` All / Recorded / Uploaded. Rows grouped by date with
overline headers (Today, Yesterday, This week, ...).

**Row.** `MeetingRow`: media icon tile, title (600 15px), date · mono duration · source badge,
`AvatarStack` of speakers (phone: `compact`, shows "8 speakers" instead). Whole row is the link.

**Record.** SPEC stubs capture. Record opens the `RecordDialog` copy ("No bot joins the call ...")
with a clear note that recording is not available in this demo; do not fake a recording bar.

**States.**
- Loading: `ListSkeleton` (5 rows, 40px tile + two bars of varying width).
- Empty: `StateBlock kind="empty"` "No meetings yet" + Record and Upload buttons. (Production is
  always seeded, so this should only appear if the seed fails.)
- No results: "Nothing matches “q”" + "Search covers meeting titles and every word in their
  transcripts." + Clear search.
- Error: "Couldn’t load your meetings" / "We lost the connection. Your recordings and notes are
  safe." + Try again.

## 2. Upload + processing + error
Port: `UploadDialog` and the processing logic in `MeetingsList.jsx`; `MeetingRow` status variants;
`feedback/ProgressBar`.

**Upload dialog.** `Dialog` 520px, title "Upload a recording", description "We’ll transcribe it,
find speakers and chapters, and write a summary you can check against the quotes." Dashed drop zone
(1.5px dashed `--paper-300`, turns tide on drag-over), `cloud-upload` icon in a tide-soft circle,
"Drop a video or audio file", muted formats line. State the real cost-guard limits from PLAN
(max 60 min; 3 uploads per hour) in that line instead of the kit's "up to 4 hours".
The file input carries `data-testid="upload-input"`.

**Processing.** The new meeting appears at the top of the list immediately as a
`MeetingRow status="processing"`: muted title, `ProgressBar` + accent "Transcribing · 42%"
(or the current stage: Uploading / Transcribing / Writing notes). Not clickable until ready,
then a success `Toast` "<title> is ready".
If the user opens a processing meeting (`/m/[id]`), use the meeting-page processing state (section 3).

**Errors.**
- Failed processing: `MeetingRow status="failed"`: rust icon tile, one rust line saying what failed
  in plain words ("We couldn’t read this file’s audio track.") + ghost `Retry`.
- Rejected before upload (too long, rate limit, wrong type): inline rust text inside the dialog
  under the drop zone, dialog stays open, e.g. "This file is 1:24:10. The demo takes up to 60 minutes."
- Network failure during upload: error `Toast` + the row turns failed with Retry.

## 3. Meeting page `/m/[id]` (desktop / mid / phone)
Port: `ui_kits/sotto-web/MeetingPage.jsx` (layout, TopBar, Chapters, Speakers, Transcript) and
`MeetingPanel.jsx` (SidePanel, SummaryTab, ActionsTab, HighlightsTab, ClipDialog).
Components: `PlayerControls`, `TranscriptLine`, `ChapterItem`, `TalkTimeBar`, `SummaryPoint`,
`ActionItem`, `QuoteChip`, `HighlightCard`, `Tabs`, `SegmentedControl`, `Select`, `Switch`.

**Top bar (60px).** Ghost "Meetings" back button | serif title 20px + meta line (date · mono
duration · N speakers · source badge) | `AvatarStack` | Share.

**Wide (≥1200).** Grid `260px | minmax(0,1fr) | 420px`:
- Left (paper-100): CHAPTERS (`ChapterItem` list, active row tinted with progress bar) and
  SPEAKERS · TALK TIME (`TalkTimeBar` rows, click to filter the transcript, Clear).
- Centre: player (dark `--surface-player`, height `min(40vh, 380px)`, `PlayerControls` with chapter
  ticks), toolbar (Find in transcript `Input size="sm"`, "Follow playback" `Switch`, speaker-filter
  count + Clear), then the transcript (`TranscriptLine`, 15/1.65, max 760px, active line
  `--surface-selected`, consecutive lines from one speaker hide the name).
- Right (white card surface): `Tabs` Summary / Action items (count) / Highlights (count).

**Mid (760–1199).** Grid `minmax(0,1fr) | 380px`. Left column is dropped; a `SegmentedControl`
Transcript / Chapters / Speakers in the toolbar swaps the centre area.

**Phone (<760).** `PhoneBar` (back icon, title, share icon), sticky player (200px, compact
controls), full-width `Tabs fill` Transcript / Summary / Actions / Clips, active tab fills
the rest. Tapping a quote in Summary or Actions switches to Transcript and plays from that line.

**Core interaction (A2, A3).** `QuoteChip` click → `jump(start_s)`: seek, **play**, scroll the
transcript so the active line sits about a quarter from the top, re-enable follow. A chip is
`active` (tide outline + tint) while playback is inside its segment. Transcript timestamps seek
without changing play state. Follow pauses when the user scrolls or searches; the switch turns it back on.
`/m/[id]?t=<start_s>` (from search) seeks there on load.

**Summary tab.** `Select label="Template" icon="layout-template"`. Options come from SPEC:
**General / Sales call / 1:1 & Standup** (the kit's "Decisions & risks" and "Brief" are sample
names; do not use them). Legend line (from `MeetingPanel.jsx` `Legend`): sans "Aa" AI-written · serif "Aa" Edited by a
person · `triangle-alert` icon Check the quote.
Sections with overline headers, each point a `SummaryPoint` with its `QuoteChip`. Hover shows a
pencil; editing opens a serif textarea; Save marks it `HumanEdit` (Newsreader, pencil blue + name
chip); "Restore AI text" undoes. Switching template shows the skeleton only on first generation;
a cached template swaps instantly (A4).

**Action items tab.** Meta line "7 items · 2 to check · 3 missing an owner or date". Each
`ActionItem`: checkbox, task text, owner (avatar + name) or `NotStated`, due chip or `NotStated`,
`ConfidenceFlag` when low, `QuoteChip`. Rows separated by 1px `--line-1`.

**Highlights tab.** Secondary button "Clip from 23:41" (current time) opens `ClipDialog` ("Clip this
moment", range, title input, primary "Create and copy link"). `H` during playback creates a highlight
at the current line. List of `HighlightCard` (play range, title, quote, link icon copies `/c/[id]`).

**States.**
- Loading: player area with a centred `Spinner` on night; `TranscriptSkeleton` (5 rows);
  left column skeleton lines; `PanelSkeleton` in the side panel.
- Processing (upload not finished): player plays if media is ready (label "Video ready ·
  transcribing"); centre shows `StateBlock kind="processing" loading` "Transcribing · 64%" with
  "You can already play the recording..."; left column muted sentence; panel shows
  "Notes are on their way".
- Empty: Action items empty = "No action items were said" / "Nobody committed to a task out loud in
  this meeting, so we didn’t invent any." Highlights empty = "No highlights yet" / "Clip a moment while
  you listen...". Find-in-transcript with no hits = compact `noResults` "No lines match".
- Error: top bar minimal + centred `StateBlock kind="error"` "We couldn’t open this meeting" / "The
  recording is still stored, but its notes failed to load." + Try again (primary) + Back to meetings.
  Unknown id: same layout with `kind="notFound"` "This meeting doesn’t exist" + Back to meetings.
  Media failed but notes loaded: keep the page, replace the player with a night panel and one line
  "We couldn’t load the recording. The transcript and notes are below." + Retry.

## 4. Public clip page `/c/[id]`
Port: `ui_kits/sotto-web/ClipPage.jsx`. Opens signed out (A6). No sidebar, no app chrome.

**Layout.** 56px header: wordmark left, link to the app's home right. Main max 760px, centred,
gutters 28px / 16px phone. Badges: "Public clip" (accent, globe) + mono duration. Serif title
34px / 26px. Meta: "From <meeting title> · 23:35–24:50 of 1:02:18". Player (radius 14px,
`--shadow-2`) with `PlayerControls` scoped to the clip range (0 → clip length; never plays outside
it). TRANSCRIPT overline + ghost "Copy link", then `TranscriptLine`s for just that range, active line
follows playback. Footer line: "No bot joined this meeting."

**States.** Loading: title/meta skeletons + night block + 3 skeleton lines. Not found: `StateBlock
kind="notFound"` "This clip isn’t available" / "The link may have expired, or sharing was turned off.
Ask for a new link." Error: "We couldn’t play this clip" / "The clip still exists — try again in a
moment." + Try again.

## 5. Search results `/search?q=`
The kit has no dedicated page (it filters the list inline). Build it from the list's parts.

**Layout.** Same shell as the meetings list. Search `Input size="lg"` pre-filled with `q`
(focus with `/`). Results grouped by meeting: `MeetingRow` (title with the match marked) followed by
up to 3 hit lines, each a compact row: mono `Timestamp` + speaker dot/name + snippet with the
match in `<mark>` (`--amber-100`, as in `TranscriptLine`). Clicking a hit opens
`/m/[id]?t=<start_s>`, which seeks and plays there (A5). Title-only hits open the meeting at 0:00.
Result count line in muted caption: "12 matches in 3 meetings".
The Ask box (P2-4) sits above results when built: one input + answer card whose every sentence
carries a `QuoteChip`; if nothing supports an answer, it says "Not found in meetings."

**States.** Loading: `ListSkeleton`. Empty query: muted hint "Search every word said in every
meeting." No results: `StateBlock kind="noResults"` "Nothing matches “q”" + Clear search. Error:
`StateBlock kind="error"` "Search isn’t working right now. Your meetings are safe." + Try again.

---

## Cut from the kit
- Clips library and Settings nav items (Sidebar) — not in SPEC. Keep only "Meetings".
- Live recording bar (`RecordingBar`) — capture is stubbed (SPEC section 0).
- Full-screen player button — not needed.
