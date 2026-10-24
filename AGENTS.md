# Project rules (read every session)

## What we are building
See SPEC.md. It is the source of truth. You may not edit SPEC.md or anything in tests/.

## Commands
- `npm run check`: typecheck + lint + unit/component tests + production build. Must pass before any commit.
- `npm run eval`: live model evals on fixtures (costs tokens). Run by QA, not on every edit.
- `npm run dev`: local app at http://localhost:3000

## Definition of done for a task
1. `npm run check` passes.
2. The change does what PLAN.md says, checked by actually running it.
3. Committed with a message that says what and why, including .agent-logs/ (git add .agent-logs).

## Hard rules
- Work autonomously. Do not ask the human questions; decide, log it in DECISIONS.md, continue.
- Never weaken, skip, or delete a test or check to make it pass. Fix the code.
- If you believe a locked test is wrong, write why in QA_NOTES.md and move on. A human decides.
- No secrets in code, logs, or commits. Keys live in .env (gitignored).
- Before fixing a bug, state the cause in one sentence. No fix without a cause.
- Do not overbuild. Only what PLAN.md asks for. Out-of-scope ideas go to IDEAS.md.
- Whenever you choose to cut, change, or add something compared to the reference product,
  append one entry to DECISIONS.md: what the reference does / what we do / why.

## Files the loop uses
- PLAN.md: task checklist. Builder ticks tasks off.
- design/: design tokens and screen specs from the designer.
- QA_REPORT.md: latest QA result, written by QA only.
- STATUS.md: one-paragraph current state + live URL, updated after each QA round.
- BLOCKED.md: written only if the loop gives up. Says what is stuck and why.
