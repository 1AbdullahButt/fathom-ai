# P0 design review

Source: `qa/screens/p0-*.png`, checked against `design/screens.md`, `design/sotto.md` and `ui_kits/sotto-web`.
Chapters, talk time, the template Select and the Find/Follow toolbar are missing, but they are P1/P2 in PLAN.md, so they are not flagged here.

## Issues, most severe first

### 1. MAJOR: a seek on load does not bring the transcript to the active line (do now)
- **Screens:** `p0-meeting-seattle-t1800.png`, `-t1800-390.png`. The playhead and caption are at 30:00, but the transcript shows 25:27–27:28, and the active line is off screen.
- **Breaks:** screens.md §3 core interaction ("scroll the transcript so the active line sits about a quarter from the top"; "`?t=` seeks there on load"). This is the core moment.
- **Fix:** in `Transcript`, scroll to the active line after every seek: the initial `?t`, a scrubber drag, ±10 s, and a chip click. Scroll even while paused. Use `el.scrollIntoView({block:'start'})` with `scroll-margin-top: 25%` on `TranscriptLine`. A seek sets follow back on. In the windowed list, scroll to the line's index first, then call scrollIntoView.

### 2. MAJOR: summary points with many quotes make the panel very long (do now)
- **Screens:** `p0-meeting-seattle-desktop.png`, `-phone-summary.png`. One point stacks 4 to 15 `QuoteChip`s, so the panel shows only about 3 points per screen.
- **Decision:** show the **first 2 quotes**, then a "+N more quotes" toggle.
  - Toggle: ghost text button inside `SummaryPoint` (and `ActionItem`), `font: var(--type-caption)`, `color: var(--ink-600)`, `chevron-down` icon at 14px, `padding: var(--space-2) 0`, left-aligned with the chips. When open, the label reads "Show fewer" with `chevron-up`.
  - The hidden quotes expand inline. Do not use a popover.
  - If the playing chip is one of the hidden quotes, open the point automatically so the `active` chip stays visible.
  - The gap between chips is `var(--space-3)` (6px).
  - The rule is the same at every width. Keep the order the model returned.

### 3. MAJOR: the speaker-view caption is cut off mid-line (do now)
- **Screens:** `p0-meeting-seattle-t1800.png`, `-seek-line.png` (the third line is cut in half). `-phone-after-chip-summary.png`, `-t1800-390.png`: on phone the caption box also covers the speaker name.
- **Breaks:** sotto.md "live caption"; kit `Shell.jsx` `Stage` has no height limit.
- **Fix (caption div in `Stage`):**
  ```css
  .stage-caption{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;
    -webkit-line-clamp:2;line-clamp:2;text-overflow:ellipsis;
    font:400 15px/1.45 var(--font-sans);max-height:calc(2 * 1.45em + 16px);}
  @media (max-width:759px){.stage-caption{font-size:13px;bottom:8px;}}
  ```
  - Desktop uses 2 lines, the same as on phone. Long segments end in an ellipsis; the full text stays in the transcript.
  - On phone (200px stage): the avatar goes from 56px to 44px, the gap to `var(--space-2)`, and the speaker name to 12px, so the name, the 2-line caption and the controls all fit.

### 4. MAJOR: avatar initials are wrong for names with parentheses or no stated name (do now)
- **Screens:** `p0-list-desktop.png`. The rows show "T(", "E(", "A(" and "JN" (Jennifer Chao (Dept. of Neighborhoods)). "SM" is cut to "SV" at 24px.
- **Fix (`components/core/Avatar` `initials()`):**
  1. Remove `\(.*?\)` and punctuation, then trim.
  2. If the name matches `/not stated|unknown|^speaker\b/i`, use the parenthesised letter (`(B)` → "B"). If there is none, show the `user` icon (size × 0.5, same tint).
  3. Otherwise use the first letter of the first word plus the first letter of the last word, so "Jennifer Chao" gives "JC".
  4. Show at most 2 letters.
  - Font: `Math.round(size*0.36)`. `letter-spacing: 0` when `size < 28`.

### 5. MAJOR: the stage is an empty dark block before first play (do now)
- **Screens:** `p0-meeting-seattle-desktop.png`, `-phone.png`, `-phone-summary.png`. At 0:00 the area is about 380px (desktop) or 200px (phone) of black with only "Paused".
- **Breaks:** sotto.md (speaker view shows the initials avatar + caption); screens.md requires that no state looks broken.
- **Fix:** `activeLine` falls back to `segments[0]` when no line contains `currentTime`. The `Stage` then shows the first speaker's avatar, name and first caption from load. Add a centred 56px translucent play button over the avatar while paused at 0:00 (`rgba(255,255,255,.14)`, `play` icon, the same click as the controls).

### 6. MINOR: the upload row shows "Uploaded" and "Uploading · 100%" together (later)
- **Screen:** `p0-upload-progress-2.png`.
- **Fix:** hide the source badge on a `MeetingRow` that is not ready. At 100%, change the label straight to the next stage ("Transcribing") and make the `ProgressBar` indeterminate. Do not hold at "Uploading · 100%".

### 7. MINOR: the tab label is "Actions" on phone and "Action items" on wide and mid (later, no change)
- This follows the kit on purpose because of the phone width. Keep it.

## Now vs later
- **Now (before P1):** 1, 2, 3, 4, 5. Issues 2–5 are each one component plus CSS. Issue 1 is the core moment.
- **Later:** 6, 7.

The not-found and upload-error states, the action items meta line, and `NotStated` / `ConfidenceFlag` match the spec.
