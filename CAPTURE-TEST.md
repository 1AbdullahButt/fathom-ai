# Capture Test

Status: **PASS**. Two canaries, sent from two separate new sessions, landed automatically
with prompt and response.

## Tool and model

- Tool: Claude Code, in the Claude desktop app (Code tab), on Windows 11.
- Model: `claude-opus-5-5` (Opus 5.5) does both planning and execution. Subagents
  (`builder`, `qa`, `designer`, `tester`) inherit the same model unless a run overrides it.
  Each log entry records the model, so any mid-build switch shows up there.
- Automatic mechanism: yes. Claude Code hooks are configured in `.claude/settings.json`.
  `UserPromptSubmit` fires on every prompt and receives the prompt text. `Stop` fires at
  the end of every turn and receives the session's `transcript_path`.

## Mechanism and config changed

- Config file changed: `.claude/settings.json`. Hooks were added, nothing was removed:
  - `UserPromptSubmit`: `node "$CLAUDE_PROJECT_DIR"/scripts/agent-capture.cjs prompt`
  - `Stop` (a second entry, after the existing `gate-stop.sh`):
    `node "$CLAUDE_PROJECT_DIR"/scripts/agent-capture.cjs response`
- Script: `scripts/agent-capture.cjs` (Node, no dependencies).
  - On `prompt`, it appends a `PROMPT` entry containing the prompt verbatim from the hook
    input, plus a UTC timestamp.
  - On `response`, it reads the transcript JSONL and appends a `RESPONSE` entry containing
    only the final text of the turn (the text after the last tool call). It leaves out
    thinking, tool calls and intermediate narration.
  - It keeps one file per session: `.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md`, in
    the 8x format, and updates the header counts on every write.
  - `gate-stop.sh` can refuse a stop, which makes `Stop` fire more than once in a single
    turn. The script then keeps only the latest final response for that prompt instead of
    duplicating it.
  - It never writes to stdout and always exits 0, so it cannot inject context or break a
    session.
- `scripts/add-capture-hooks.cjs` is a one-off helper that adds the two hooks to
  `.claude/settings.json` additively. It is idempotent.

## Log files the canaries landed in

- Canary 1: `.agent-logs/2026-10-24_10-36-12_e4f27003-c69a-45b5-ba5d-6cfb9999e7af.md`
- Canary 2: `.agent-logs/2026-10-24_10-36-53_c2c83176-bba7-46e6-a8e1-fc6a5a7d3c0c.md`

## Canary entries (raw)

Canary 1, session `e4f27003`:

```
[LOG_ENTRY type=PROMPT num=1 session=e4f27003]
timestamp: 2026-10-24T10:36:12.312Z
model: unknown (first turn of session; see response)

CAPTURE TEST — 8x assignment, Abdullah Butt


[LOG_ENTRY type=RESPONSE num=1 session=e4f27003]
timestamp: 2026-10-24T10:36:16.958Z
model: claude-opus-5-5

Got it. I'm treating this as a capture/marker message for the 8x assignment, so I haven't started any work.

When you're ready, say what to run, for example `/build` for the full autonomous loop (scaffold, design, tests, build, QA, deploy), or a single task from PLAN.md.
```

Canary 2, session `c2c83176`:

```
[LOG_ENTRY type=PROMPT num=1 session=c2c83176]
timestamp: 2026-10-24T10:36:53.975Z
model: unknown (first turn of session; see response)

CAPTURE TEST — 8x assignment, Abdullah Butt


[LOG_ENTRY type=RESPONSE num=1 session=c2c83176]
timestamp: 2026-10-24T10:37:01.051Z
model: claude-opus-5-5

Got it. This session is marked as the capture test for the 8x assignment (Abdullah Butt).

Nothing has run yet. The repo is on `master` with no commits, and every file is untracked (`SPEC.md`, `CLAUDE.md`, `design/`, `seed/`, `scripts/`, `.agent-logs/` and so on).

Tell me what you want to run. For example, `/build` runs the whole autonomous loop: scaffold, design, tests, build, QA, deploy.
```

## What did not work first

- Fetching the setup page with WebFetch returned only the page title. The page renders
  its content inside a sandboxed `srcdoc` iframe. I read the steps by opening the page in
  the built-in browser and extracting the iframe's `srcdoc`.
- The repo's own `protect-tests.sh` PreToolUse hook blocks every edit under `.claude/`.
  It also blocks any shell command that mentions `.claude/` and contains a redirect such
  as `2>/dev/null`. Because of that, the agent could not edit `settings.json` itself, so
  the capture script lives in `scripts/`, outside `.claude/`.
- The first two attempts to add the hooks by hand did not reach the file:
  `settings.json` was unchanged and no canary was captured, which I checked by searching
  every settings file and session transcript. The human then explicitly authorised the
  agent to run `scripts/add-capture-hooks.cjs` for that one edit, and it worked.
- My first dry run of the script failed because my `printf` test input expanded `\n`
  into a raw newline, which made invalid JSON. That was a mistake in the test harness, not
  in the script. Building the input with `JSON.stringify` fixed it.
- Earlier turns of the setup session (`53b33c8d`) happened before the hooks existed, so
  they are not in `.agent-logs/`. Capture for that session starts at the turn that asked
  for this file. The hooks reloaded mid-session without a restart.

## Known limitation

The first `PROMPT` entry of each session records the model as
`unknown (first turn of session; see response)`. When `UserPromptSubmit` fires on a
session's first turn, the transcript holds no assistant message yet to read the model
from. The `RESPONSE` entry right after it, and every later entry, records the actual model.
