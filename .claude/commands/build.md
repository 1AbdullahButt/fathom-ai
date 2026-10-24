---
description: Run the whole build autonomously - scaffold, design import, tests, build, QA, fix, deploy - until QA passes.
---

You are the orchestrator. Run AUTONOMOUSLY from start to finish. Do not ask the human
questions, do not wait for approval, do not stop to report progress. Make the reasonable
call, write it in DECISIONS.md, and keep going. Delegate to subagents (designer, tester,
builder, qa). Keep your own messages short.

Only stop early if something truly needs the human: a missing API key or login (Vercel,
GitHub, transcription provider). Then write exactly what is needed in BLOCKED.md, continue
with any work that does not depend on it, and only stop when nothing else can move.

## Phase 0: Setup (skip any step already done)
1. Read SPEC.md, CLAUDE.md, design/references.md.
2. If .agent-logs/ does not exist, write that in BLOCKED.md and continue anyway.
3. Scaffold: Next.js + TypeScript, Vitest, Playwright, ESLint. npm scripts:
   check = tsc --noEmit && eslint . && vitest run && next build; eval; dev. Commit.
4. Design: if the claude_design MCP is available, read the Sotto Design System project and
   copy its tokens/*.css, styles.css, the components the screens use, and
   ui_kits/sotto-web/* into design/. Use these as the UI source (port to the Next.js app).
   If the MCP is unavailable, use the designer subagent to write design/ instead. Commit.
5. Write PLAN.md: small ordered tasks following SPEC.md sections 2 and 8 (P0, P1, P2),
   with module paths the tests will import from. Stretch items last.
6. Tester subagent writes tests and fixtures. Commit, then
   `mkdir -p .loop && touch .loop/tests-locked`, commit. tests/ is now read-only.
7. Seed data: use audio/video in seed/ if present. If seed/ is empty or has no long
   multi-speaker meeting, find an openly licensed or public-record multi-speaker meeting
   recording (~1 hour), download it, and record its source and licence in README.md.

## Phase 1: Build loop
Repeat until every non-stretch task in PLAN.md is ticked:
1. Next unticked task -> builder subagent, on a branch. Push, open a PR, wait for CI.
   If CI passes, merge it yourself (`gh pr merge --squash --delete-branch`). If CI fails,
   send the failure to the builder and repeat.
2. At the end of each priority level (P0, P1, P2): qa subagent, then designer reviews
   qa/screens/. Speed is judged; do not add tests beyond SPEC.md section 7.
3. If QA_REPORT.md says FAIL: blocker/major findings -> builder, one fix each -> qa again.
   Do not start the next level while blockers exist.
4. After each level passes: deploy (`vercel --prod`), check the live URL opens signed out,
   update STATUS.md with the URL, what works, what doesn't.

## Phase 2: Finish
1. Final qa on the deployed commit. Must write RESULT: PASS with the current COMMIT.
2. DECISIONS.md complete; README has setup, live URL, seed data sources.
3. STATUS.md: live URL, what works, known gaps. Then you may stop.

## Rules
- The Stop hook will not let you finish until `npm run check` passes and QA passed the
  current commit. Do not try to work around it.
- Same failure 3 times in a row: write it in BLOCKED.md, move to the next task.
- Never spend money beyond the configured API keys, never force-push.
- Every commit includes .agent-logs/ (git add .agent-logs).
- Out-of-scope ideas go in IDEAS.md, not into the code.

$ARGUMENTS
