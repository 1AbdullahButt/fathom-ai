#!/usr/bin/env node
// Claude Code hook: appends each user prompt and the final response of each turn to
// .agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md in the 8x capture format.
//
//   node scripts/agent-capture.cjs prompt   <- UserPromptSubmit hook
//   node scripts/agent-capture.cjs response <- Stop hook
//
// Must never break the session: all errors are swallowed and written to stderr only,
// and nothing is printed to stdout (UserPromptSubmit stdout is injected into context).
//
// Append-only (8x rule: never edit or delete an entry). The header is written once when the
// log file is created; every later PROMPT/RESPONSE entry is appended. Existing lines are never
// rewritten or removed. If the Stop hook fires again for the same prompt (the stop gate made
// the turn continue), a new RESPONSE entry is appended and marked "stop-gate re-run".

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const mode = process.argv[2];
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const logDir = path.join(projectDir, ".agent-logs");

const sleep = ms => new Promise(r => setTimeout(r, ms));

function readStdin() {
  return new Promise(resolve => {
    let s = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", d => (s += d));
    process.stdin.on("end", () => resolve(s));
  });
}

function readTranscript(p) {
  if (!p || !fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

// A real user prompt: a non-meta user entry whose content is text, not tool results.
function isUserPrompt(e) {
  if (e.type !== "user" || e.isMeta || e.isSidechain || !e.message) return false;
  const c = e.message.content;
  if (typeof c === "string") return true;
  return Array.isArray(c) && c.length > 0 && !c.some(b => b.type === "tool_result");
}

function lastModel(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type === "assistant" && !e.isSidechain && e.message && e.message.model && e.message.model !== "<synthetic>") {
      return e.message.model;
    }
  }
  return null;
}

// Final response of the current turn: text written after the last tool call since the
// last user prompt. Falls back to all text of the turn if it ended on a tool call.
function finalResponse(entries) {
  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) if (isUserPrompt(entries[i])) { start = i + 1; break; }
  const turn = entries.slice(start).filter(e => e.type === "assistant" && !e.isSidechain && e.message);
  const blocks = [];
  for (const e of turn) for (const b of e.message.content || []) blocks.push({ b, e });
  let lastTool = -1;
  blocks.forEach((x, i) => { if (x.b.type === "tool_use") lastTool = i; });
  let texts = blocks.slice(lastTool + 1).filter(x => x.b.type === "text" && x.b.text.trim());
  if (!texts.length) texts = blocks.filter(x => x.b.type === "text" && x.b.text.trim());
  if (!texts.length) return null;
  const last = texts[texts.length - 1].e;
  return {
    text: texts.map(x => x.b.text).join("\n\n"),
    timestamp: last.timestamp || new Date().toISOString(),
    model: last.message.model,
  };
}

function author() {
  if (process.env.AGENT_LOG_AUTHOR) return process.env.AGENT_LOG_AUTHOR;
  for (const cmd of ["git config github.user", "git config user.name"]) {
    try {
      const v = execSync(cmd, { cwd: projectDir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      if (v) return v;
    } catch {}
  }
  return "unknown";
}

function findLogFile(sessionId) {
  if (!fs.existsSync(logDir)) return null;
  const f = fs.readdirSync(logDir).find(n => n.endsWith(`_${sessionId}.md`));
  return f ? path.join(logDir, f) : null;
}

function newLogFile(sessionId, iso) {
  const stamp = iso.replace("T", "_").replace(/:/g, "-").slice(0, 19);
  return path.join(logDir, `${stamp}_${sessionId}.md`);
}

function header(meta) {
  const keys = ["session_id", "date", "author", "model", "tool", "project", "total_exchanges", "first_prompt_time", "last_prompt_time"];
  return "---\n" + keys.map(k => `${k}: ${meta[k] ?? ""}`).join("\n") + "\n---\n";
}

// Entries already in the log, read without changing the file.
function countEntries(text, type, num) {
  const re = num === undefined
    ? new RegExp(`^\\[LOG_ENTRY type=${type} num=\\d+ `, "gm")
    : new RegExp(`^\\[LOG_ENTRY type=${type} num=${num} `, "gm");
  return (text.match(re) || []).length;
}

function entry(type, num, sessionId, timestamp, model, text, note) {
  return `\n[LOG_ENTRY type=${type} num=${num} session=${sessionId.slice(0, 8)}]\n` +
    `timestamp: ${timestamp}\nmodel: ${model}\n` + (note ? `note: ${note}\n` : "") +
    `\n${text.replace(/\s+$/, "")}\n\n`;
}

async function main() {
  const input = JSON.parse((await readStdin()) || "{}");
  const sessionId = input.session_id || "unknown-session";
  fs.mkdirSync(logDir, { recursive: true });

  if (mode === "prompt") {
    const now = new Date().toISOString();
    const model = lastModel(readTranscript(input.transcript_path)) || "unknown (first turn of session; see response)";
    let file = findLogFile(sessionId);
    if (!file) {
      // New session: write the header once. It is never rewritten afterwards, so its
      // total_exchanges / last_prompt_time / model describe the session's start; per-entry
      // timestamps and models are in the entries themselves.
      file = newLogFile(sessionId, now);
      const project = path.basename(projectDir).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const who = author();
      const meta = { session_id: sessionId, date: now.slice(0, 10), author: who, model, tool: "claude-code", project,
        total_exchanges: 1, first_prompt_time: now, last_prompt_time: now };
      fs.writeFileSync(file, header(meta) +
        `\n# Session Log - ${now.slice(0, 10)}\n\nSession: \`${sessionId.slice(0, 8)}\` | Project: \`${project}\` | Author: \`${who}\`\n\n---\n`,
        { flag: "wx" });
    }
    const num = countEntries(fs.readFileSync(file, "utf8"), "PROMPT") + 1;
    fs.appendFileSync(file, entry("PROMPT", num, sessionId, now, model, String(input.prompt ?? "")));
    return;
  }

  if (mode === "response") {
    // The transcript can lag the Stop event slightly; retry briefly until the turn's text shows up.
    let resp = null;
    for (let i = 0; i < 10 && !resp; i++) {
      resp = finalResponse(readTranscript(input.transcript_path));
      if (!resp) await sleep(300);
    }
    const file = findLogFile(sessionId);
    if (!file) return; // no prompt captured for this session (e.g. hook installed mid-session)
    const text = fs.readFileSync(file, "utf8");
    const num = countEntries(text, "PROMPT");
    // A Stop hook that refuses to stop (gate-stop.sh) makes the turn continue and Stop fire
    // again. Earlier responses for this prompt stay as they are; the new one is appended.
    const rerun = countEntries(text, "RESPONSE", num) > 0;
    const model = (resp && resp.model) || lastModel(readTranscript(input.transcript_path)) || "unknown";
    fs.appendFileSync(file, entry("RESPONSE", num, sessionId, resp ? resp.timestamp : new Date().toISOString(), model,
      resp ? resp.text : "(no text response captured for this turn)", rerun ? "stop-gate re-run" : undefined));
  }
}

main().catch(err => {
  process.stderr.write(`agent-capture: ${err && err.stack || err}\n`);
}).finally(() => process.exit(0));
