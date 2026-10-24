// Layer 2 live-model evals (SPEC §7). Run with `npm run eval`. Costs tokens; run by QA, not on every edit.
// Each check runs 3 times against the real LLM (lib/extract.ts, lib/ask.ts); it passes only if 3/3 pass.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

import type { extract as ExtractFn } from "@/lib/extract";
import type { ask as AskFn } from "@/lib/ask";
import { corpus, expected1, expected2, meeting1, meeting2, type Fixture } from "../helpers/fixtures";
import { findMatch, forbiddenItems, TASK_THRESHOLD, type ItemLike } from "./match";

const RUNS = 3;

// Loaded in main() after dotenv, so lib modules see the env vars at import time.
let extract: typeof ExtractFn;
let ask: typeof AskFn;

if (process.env.LLM_MOCK) {
  console.warn("LLM_MOCK was set; unsetting it so the evals hit the real model.");
  delete process.env.LLM_MOCK;
}

interface Row {
  check: string;
  run: number;
  pass: boolean;
  detail: string;
}

const rows: Row[] = [];

type ExtractOk = Extract<Awaited<ReturnType<typeof ExtractFn>>, { ok: true }>;

async function runExtract(f: Fixture): Promise<ExtractOk | string> {
  try {
    const r = await extract(f.segments, f.meeting.speakers, f.meeting.date, "general");
    return r.ok ? r : `extract ok:false: ${r.error}`;
  } catch (e) {
    return `extract threw: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function fmt(i: { task: string; owner: string | null; due: string | null; evidence: string[] }) {
  return `"${i.task}" owner=${i.owner} due=${i.due} ev=[${i.evidence.join(",")}]`;
}

async function meeting1Runs() {
  for (let run = 1; run <= RUNS; run++) {
    const r = await runExtract(meeting1);
    if (typeof r === "string") {
      rows.push({ check: "M1 expected action items", run, pass: false, detail: r });
      rows.push({ check: "M1 no dark-mode item", run, pass: false, detail: r });
      continue;
    }
    const missing = expected1.action_items.filter((e) => !findMatch(e, r.actionItems));
    rows.push({
      check: "M1 expected action items",
      run,
      pass: missing.length === 0,
      detail:
        missing.length === 0
          ? `matched ${expected1.action_items.length}/${expected1.action_items.length}`
          : `missing: ${missing.map((m) => m.task).join("; ")} | got: ${r.actionItems.map(fmt).join(" || ")}`,
    });
    const bad: ItemLike[] = forbiddenItems<ItemLike>(r.actionItems, expected1.mustNotInclude);
    rows.push({
      check: "M1 no dark-mode item",
      run,
      pass: bad.length === 0,
      detail: bad.length === 0 ? "none" : bad.map(fmt).join(" || "),
    });
  }
}

async function meeting2Runs() {
  const pricing = expected2.action_items[1];
  for (let run = 1; run <= RUNS; run++) {
    const r = await runExtract(meeting2);
    if (typeof r === "string") {
      rows.push({ check: "M2 item 2 owner+due null", run, pass: false, detail: r });
      continue;
    }
    // findMatch requires owner === null and due === null exactly, plus task + evidence overlap.
    const hit = findMatch(pricing, r.actionItems);
    rows.push({
      check: "M2 item 2 owner+due null",
      run,
      pass: Boolean(hit),
      detail: hit ? fmt(hit) : `no null-owner/null-due pricing item | got: ${r.actionItems.map(fmt).join(" || ")}`,
    });
  }
}

async function askRuns() {
  for (let run = 1; run <= RUNS; run++) {
    try {
      const r = await ask("What was the budget?", corpus);
      const pass = r.answer === "not found in meetings";
      rows.push({
        check: 'Ask "budget" -> not found',
        run,
        pass,
        detail: `answer=${JSON.stringify(r.answer)} citations=${r.citations.length}`,
      });
    } catch (e) {
      rows.push({
        check: 'Ask "budget" -> not found',
        run,
        pass: false,
        detail: `ask threw: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
}

function printTable() {
  const checks = [...new Set(rows.map((r) => r.check))];
  console.log(`\nLayer 2 evals (${RUNS} runs each, task match threshold ${TASK_THRESHOLD})\n`);
  for (const r of rows) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.check.padEnd(28)} run ${r.run}  ${r.detail}`);
  }
  console.log("\nSummary");
  let allPass = true;
  for (const c of checks) {
    const rs = rows.filter((r) => r.check === c);
    const n = rs.filter((r) => r.pass).length;
    const ok = n === RUNS && rs.length === RUNS;
    allPass &&= ok;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.padEnd(28)} ${n}/${RUNS}`);
  }
  console.log(allPass ? "\nALL EVALS PASSED" : "\nEVALS FAILED");
  return allPass;
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set (.env). Evals need the real model.");
    process.exit(1);
  }
  ({ extract } = await import("@/lib/extract"));
  ({ ask } = await import("@/lib/ask"));
  await meeting1Runs();
  await meeting2Runs();
  await askRuns();
  process.exit(printTable() ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
