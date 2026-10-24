#!/usr/bin/env node
// One-off helper: ADDS the agent-capture hooks to .claude/settings.json without removing
// anything. Safe to re-run (skips hooks that are already present). Run it by hand.

const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", ".claude", "settings.json");
const settings = JSON.parse(fs.readFileSync(file, "utf8"));
settings.hooks = settings.hooks || {};

const add = (event, mode) => {
  const command = `node "$CLAUDE_PROJECT_DIR"/scripts/agent-capture.cjs ${mode}`;
  const list = (settings.hooks[event] = settings.hooks[event] || []);
  const present = list.some(g => (g.hooks || []).some(h => h.command === command));
  if (!present) list.push({ hooks: [{ type: "command", command }] });
  console.log(`${event}: ${present ? "already present" : "added"}`);
};

add("UserPromptSubmit", "prompt");
add("Stop", "response");
fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
