# Sotto Design System

**Sotto** (working name — from *sotto voce*) is a web app for AI meeting notes **without a meeting bot**. Users either record on their own device (mic / tab audio / screen) or upload a recording they already have; Sotto transcribes it, labels speakers, chapters it, and writes a summary and action items where **every AI claim links to the transcript quote it came from**.

## Sources
No codebase, Figma, logo, fonts or brand guidelines were supplied. The only input was a written brief (“rebuild an AI meeting-notes product without a meeting bot”: meetings list, meeting page for a 1-hour 8-speaker call, public clip page; calm, readable, desktop + phone). Everything here is an original, from-scratch system — it does not reproduce any existing product’s branding or UI.

- **No logo exists.** The name is set in Newsreader wherever a mark would go. Replace when a real mark exists.
- **Fonts are chosen substitutes** (Google Fonts, OFL, self-hosted in `assets/fonts/`).
- **Icons** are Lucide (ISC), copied from `lucide-static@0.460.0`.

## Products / surfaces
One product: the **Sotto web app** (desktop + phone, responsive) — see `ui_kits/sotto-web/`.
1. Meetings list — searchable, Record and Upload as an equal primary pair.
2. Meeting page — player, transcript synced to playback, side panel (Summary / Action items / Highlights), chapters, speaker filter with talk-time.
3. Public clip page — opens without login, plays one time range with its transcript.

---

## CONTENT FUNDAMENTALS
**Voice: a careful colleague taking notes.** Plain, specific, unhurried. Never hypes the AI, never claims more certainty than the transcript supports.

- **Person:** “you” for the user, “we” for Sotto (“We’ll transcribe it…”, “We couldn’t read this file’s audio track.”). Never “I”.
- **Casing:** Sentence case everywhere — buttons, tabs, titles, menu items (“Action items”, “Copy link”, “Clip this moment”). Overlines are the only all-caps (CSS `text-transform`), e.g. CHAPTERS.
- **Buttons:** verb first, 1–3 words: *Record*, *Upload*, *Copy link*, *Try again*, *Create and copy link*.
- **Honesty rules:** missing facts say **“not stated”** (“Owner not stated”, “Date not stated”) — never guessed. Uncertain items say why: “Low confidence · Rosa offered tentatively”. Empty results say we didn’t invent any: “Nobody committed to a task out loud in this meeting, so we didn’t invent any.”
- **Errors:** what happened → that data is safe → what to do. “We lost the connection to Sotto. Your recordings and notes are safe.” No exclamation marks, no “Oops”.
- **No-bot reassurance** appears where it matters (record dialog, empty state, clip footer): “No bot joins the call. Sotto captures audio here — let everyone know you’re recording.”
- **Numbers:** timestamps `m:ss` under an hour, `h:mm:ss` above, in mono. Durations as `1:02:18`, talk time as `14m 23%`.
- **Emoji:** never. Unicode: only typographic quotes “ ”, en dash for ranges (`23:35–24:22`), middle dot `·` as a meta separator, `×` for playback rate.
- **AI vocabulary:** we don’t say “AI magic”, “✨”, “smart”. Summaries are just “Summary”; the template switcher is “Template”.

## VISUAL FOUNDATIONS
- **Mood:** calm, paper-like, reading-first. Warm off-white surfaces, ink text, one teal accent. The media player is the only dark surface.
- **Color:** Paper (`--paper-*`) neutrals with a warm cast; Ink (`--ink-*`) text greys; **Tide** teal (`--tide-500 #2E7A70`) as the single accent (primary buttons, playhead, selection, active chapter). Three meaning colours, each used for one job only: **Pencil** blue = human-written text; **Amber** = low confidence; **Rust** = errors / recording. 8 speaker hues (`--spk-1…8`) assigned by order of first speech. **Night** greys for the player only.
- **Type:** Instrument Sans for UI and AI text; **Newsreader** serif for page titles *and* human-edited text; IBM Plex Mono for all times. Transcript reads at 15/1.65, measure ≤ 760px.
- **AI vs human text:** AI text = sans, ink. Human-edited = Newsreader 16px in `--human-text` + a small pencil chip with the editor’s name. This is the only place serif appears at body size, so it reads as “a person wrote this” at a glance.
- **Supporting quotes:** every summary point and action item carries a `QuoteChip` — sunken paper block (no left-border accent), curly-quoted text, speaker dot + name, ▶ mono timestamp. Hover darkens; the chip currently playing gets a tide outline + tint.
- **Backgrounds:** flat colour only. No gradients, textures, illustrations or imagery. Skeleton shimmer is the only gradient.
- **Spacing:** 2/4/6/8/12/16/20/24/32/40/56/72. Dense lists use 6–12px; page gutters 32px desktop, 16px phone.
- **Corners:** small: 4px chips, 6px controls, 10px rows/cards, 14px dialogs & player frame, pill only for counts/switch.
- **Borders & cards:** 1px `--line-1` (#E7E3DA) hairlines do most of the separation. Cards = white, 1px border, `--shadow-1`; hover lifts to `--shadow-2`. No coloured left borders.
- **Shadows:** faint, warm (rgba of ink 900): `--shadow-1` controls, `--shadow-2` hover/popovers, `--shadow-3` dialogs/toasts.
- **Hover:** background shifts to `--surface-hover` (paper-150) or accent-hover; no opacity fades on text. **Press:** one step darker (paper-200 / tide-700); no shrink.
- **Focus:** 2px tide outline, 2px offset (`--ring-focus` on inputs).
- **Motion:** 120ms hover, 180ms toggles, 260ms panels/toasts; `cubic-bezier(.2,.7,.2,1)`; fade-up 6px for toasts/dialogs. No bounces. Transcript auto-scroll is smooth. `prefers-reduced-motion` zeroes durations.
- **Transparency / blur:** only on the player (captions on 62% black, controls on 8–14% white). No backdrop blur. Dialog scrim is 32% ink.
- **Layout:** desktop meeting page = 60px top bar; grid `260px chapters+speakers | player+transcript | 420px panel`. Mid (760–1199) drops the left column into a Transcript/Chapters/Speakers switch. Phone = sticky player, full-width tabs (Transcript / Summary / Actions / Clips). Meetings list max 920px wide with a 232px sidebar.
- **Imagery:** none. The player shows a speaker-view (initials avatar tinted with speaker colour + live caption) when no video frame is available.

## ICONOGRAPHY
- **Set:** Lucide line icons, 24px grid, rendered at 16–20px with **1.75 stroke** (2–2.25 for ≤12px glyphs). Copied verbatim from `lucide-static@0.460.0` into `assets/icons/*.svg` (65 icons) and embedded in the `Icon` component (`ICONS` map) so no CDN is needed.
- **Usage:** always `currentColor`; icons sit left of labels with 6–8px gap. Icon-only buttons always have an `aria-label`/tooltip.
- **Key glyphs:** `mic` (record), `upload`, `search`, `play`/`pause`, `rotate-ccw`/`rotate-cw` (±10s), `scissors` (clip), `link` (public link), `triangle-alert` (low confidence), `pencil` (human edit), `user`/`calendar` (owner/date, also in “not stated”), `audio-lines` (audio / processing), `layout-template` (summary template).
- **No emoji, no icon font, no PNG icons.** Unicode used only as typography (· – × “ ”).

---

## Index
- `styles.css` — entry point (imports only) → `tokens/fonts.css, colors.css, typography.css, spacing.css, radius.css, shadows.css, motion.css, base.css`
- `assets/fonts/` — Instrument Sans, Newsreader, IBM Plex Mono (woff2) · `assets/icons/` — Lucide SVGs
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/` — React primitives (below), each with `.d.ts` + `.prompt.md` and a directory card
- `ui_kits/sotto-web/` — interactive web app (`index.html`), `phone.html`
- `SKILL.md` — Agent Skill entry point · `thumbnail.html` — project tile

## Components
- **core/** — Icon, Button, IconButton, Badge, Avatar, AvatarStack
- **forms/** — Input, Select, Checkbox, Switch
- **navigation/** — Tabs, SegmentedControl
- **feedback/** — Spinner, Skeleton, ProgressBar, StateBlock
- **overlay/** — Dialog, Toast, Tooltip
- **meeting/** — Timestamp, SpeakerLabel, QuoteChip, ConfidenceFlag, NotStated, HumanEdit, SummaryPoint, ActionItem, ChapterItem, TalkTimeBar, TranscriptLine, PlayerControls, MeetingRow, HighlightCard

No source inventory existed, so this is an authored standard set plus the domain (`meeting/`) components the brief requires.
