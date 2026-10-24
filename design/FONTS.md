# Fonts

The Sotto design system ships self-hosted woff2 files in `assets/fonts/` and declares them with
`@font-face` blocks in `tokens/fonts.css`. Those binaries were not imported into this repo.

The app loads the same three families from Google Fonts through `next/font/google` instead:

| Family          | Role                                   | Weights / styles        | CSS variable it must feed |
|-----------------|----------------------------------------|-------------------------|---------------------------|
| Instrument Sans | UI text and all AI-written text        | 400–700, normal + italic | `--font-sans`            |
| Newsreader      | Page titles and human-edited text      | 400–600, normal + italic | `--font-serif`           |
| IBM Plex Mono   | Every timestamp, duration, rate        | 400, 500                 | `--font-mono`            |

Rules for the port:
- `next/font/google` replaces the `@font-face` blocks in `tokens/fonts.css`. Do not import
  `tokens/fonts.css` in the app. Import the other seven token files (colors, typography,
  spacing, radius, shadows, motion, base).
- Expose each font through `next/font`'s `variable` option and point the tokens at it, for example
  `--font-sans: var(--font-instrument-sans), ui-sans-serif, system-ui, sans-serif;`, keeping the
  fallback stacks from `tokens/typography.css`.
- Subset: `latin`. `display: "swap"`.
- `tokens/fonts.css` is kept in `design/` only as a verbatim record of the source system.
