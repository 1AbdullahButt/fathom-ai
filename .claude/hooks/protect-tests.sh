#!/usr/bin/env bash
# PreToolUse hook: blocks changes to SPEC.md, .claude/ (the loop's own rules), and tests/
# once .loop/tests-locked exists. The tester writes tests first; the orchestrator then
# creates the lock file, which agents cannot delete.
# Exit 2 = block the tool call; stderr is shown to Claude so it knows why.
# Uses node (already needed for the project) instead of jq.

input="$(cat)"

verdict="$(printf '%s' "$input" | node -e '
let s = "";
process.stdin.on("data", d => s += d).on("end", () => {
  let j; try { j = JSON.parse(s); } catch { console.log("ok"); return; }
  const tool = j.tool_name || "";
  const ti = j.tool_input || {};
  const fs = require("fs");
  const dir = process.env.CLAUDE_PROJECT_DIR || ".";
  const testsLocked = fs.existsSync(dir + "/.loop/tests-locked");
  const norm = x => String(x || "").replace(/\\/g, "/");
  const locked = q => { const p = norm(q); return (testsLocked && /(^|\/)tests\//.test(p)) || /(^|\/)SPEC\.md$/.test(p) || /(^|\/)\.loop\/tests-locked$/.test(p) || /(^|\/)\.claude\//.test(p); };

  if (["Edit", "Write", "MultiEdit"].includes(tool)) {
    console.log(locked(ti.file_path || "") ? "block" : "ok");
    return;
  }
  if (tool === "Bash") {
    const cmd = norm(ti.command).replace(/[0-9]*>&[0-9]+|[0-9]*>\s*(\/dev\/null|nul)\b/gi, "");
    const touchesLocked = (testsLocked && /tests\//.test(cmd)) || /(SPEC\.md|tests-locked|\.claude\/)/.test(cmd);
    const writes = /(sed\s+-i|>\s*\S|\brm\b|\bmv\b|\bcp\b|\btee\b|truncate|git\s+(checkout|restore|rm))/.test(cmd);
    console.log(touchesLocked && writes ? "block" : "ok");
    return;
  }
  console.log("ok");
});
')"

if [ "$verdict" = "block" ]; then
  echo "BLOCKED: tests/ and SPEC.md are locked. Fix the code, not the test. If you think a test is wrong, explain why in QA_NOTES.md and continue." >&2
  exit 2
fi
exit 0
