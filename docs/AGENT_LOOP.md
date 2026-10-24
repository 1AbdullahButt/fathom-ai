# Agent loop kit

Drop these files into an empty repo. Claude Code then plans, designs, writes locked tests,
builds, runs QA, and fixes failures in a loop until QA passes.

## How the loop works
```
/build (orchestrator, you start it)
  -> tester    writes locked tests + fixtures from SPEC.md (once)
  -> designer  writes design/ (uses a design MCP if connected)
  -> builder   does one PLAN.md task, runs `npm run check`, commits
  -> qa        uses the running app, screenshots, evals -> QA_REPORT.md PASS/FAIL
       FAIL -> findings go back to builder (and designer for visual issues) -> qa again
  Stop hook: Claude cannot finish until checks pass AND QA passed the current commit.
             Caps at 8 rounds, then writes BLOCKED.md instead of looping forever.
  PreToolUse hook: blocks any edit to tests/ or SPEC.md, so it can't cheat.
```

## Files
- CLAUDE.md: rules every agent follows
- SPEC.md: what to build (edit this after using the live reference, BEFORE starting)
- .claude/settings.json: permissions + hook wiring
- .claude/hooks/protect-tests.sh: locks tests/ and SPEC.md
- .claude/hooks/gate-stop.sh: the "don't stop until green" gate
- .claude/agents/: designer, tester, builder, qa
- .claude/commands/build.md: the orchestrator (`/build`)
- .github/workflows/ci.yml: CI gate on every PR (check = types, lint, tests, build)
- SUBMISSION.md: the five things to hand in, plus timing

## Setup (before pressing Start on the assignment)
1. Create the repo and copy these files in. `chmod +x .claude/hooks/*.sh`
2. Scaffold the app so `npm run check`, `npm run eval`, `npm run dev` exist. Suggested:
   Next.js + TypeScript, Vitest, Playwright. `check` = `tsc --noEmit && eslint . && vitest run && next build`.
3. `.env` with GROQ_API_KEY (and whichever LLM key you use). Add `.env` to .gitignore.
4. Connect tools in Claude Code and confirm with `/mcp`:
   - Browser for QA: `claude mcp add playwright npx @playwright/mcp@latest`
   - Design: add the claude_design MCP, then authenticate:
       claude mcp add --transport http claude_design https://api.anthropic.com/v1/design/mcp
       then run /design-login inside Claude Code
     (Check the exact add command in the hand-off prompt Claude Design gives you.)
     Flow: design the screens in Claude Design -> copy its hand-off prompt (it includes the
     project link) -> paste into Claude Code -> the designer agent imports it into design/.
     Not the same as DesignSync, which only syncs design-system files.
5. Edit SPEC.md to match the live reference. Run `/agents` to confirm the four agents load.
6. Record the two fixture meetings as audio into tests/audio/ (for demo and QA).

## Running it
- Start: `/build`
- Pause and take over: `mkdir -p .loop && touch .loop/pause` (remove it to resume gating)
- Watch: STATUS.md and QA_REPORT.md
- Session logs: handled by the 8x agent capture setup into .agent-logs/ (do it first).
  If that setup also writes .claude/settings.json, MERGE its hooks with ours, don't replace either.
  Before each push, scan for keys: grep -rEn 'gsk_|sk-|sk-ant-|ghp_|AIza' .agent-logs/ ; if anything
  shows up, rotate that key and redact it before committing.

## Things to check yourself (these are not guaranteed)
- Hook and settings syntax changes between Claude Code versions. If a hook doesn't fire,
  run `/hooks` to see what loaded, and check the hooks page in the Claude Code docs.
- Agents may deploy to your Vercel project after each priority level passes QA. They must ask before spending money or force-pushing.
- Read what the agents write. You have to explain every decision in the 5-minute walkthrough.
