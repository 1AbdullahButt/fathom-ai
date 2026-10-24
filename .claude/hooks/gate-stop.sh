#!/usr/bin/env bash
# Stop hook: Claude cannot end its turn until the build is green AND QA has passed.
# Exit 2 = refuse to stop; stderr becomes Claude's next instruction, so the loop continues.
# Safety cap: after MAX_ROUNDS refusals it lets Claude stop and asks it to write BLOCKED.md,
# so a stuck loop can't burn your whole 24-hour window or your token budget.

MAX_ROUNDS=8
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
mkdir -p .loop
counter_file=".loop/stop_rounds"
rounds="$(cat "$counter_file" 2>/dev/null || echo 0)"

# Nothing to gate before the app is scaffolded.
[ -f package.json ] || exit 0

# Escape hatch: a human (you) can create .loop/pause to let Claude stop freely.
[ -f .loop/pause ] && exit 0

refuse() {
  rounds=$((rounds + 1))
  echo "$rounds" > "$counter_file"
  if [ "$rounds" -gt "$MAX_ROUNDS" ]; then
    echo "Loop cap reached ($MAX_ROUNDS rounds). Stop now. Write BLOCKED.md: what is failing, what you tried, your best guess at the cause." >&2
    echo 0 > "$counter_file"
    exit 0
  fi
  echo "Round $rounds/$MAX_ROUNDS. $1" >&2
  exit 2
}

# Gate 1: deterministic checks must pass.
if ! out="$(npm run check 2>&1)"; then
  refuse "npm run check is failing. State the cause in one sentence, then fix the code (never the tests). Last output:
$(printf '%s' "$out" | tail -n 40)"
fi

# Gate 2: the QA agent must have signed off on the current commit.
head_sha="$(git rev-parse --short HEAD 2>/dev/null || echo none)"
if ! grep -q "RESULT: PASS" QA_REPORT.md 2>/dev/null || ! grep -q "COMMIT: $head_sha" QA_REPORT.md 2>/dev/null; then
  refuse "Checks pass, but QA has not passed commit $head_sha. Commit your work, then use the qa subagent. If QA fails, hand its findings to the builder subagent and repeat."
fi

# All green: reset the counter and allow stop.
echo 0 > "$counter_file"
exit 0
