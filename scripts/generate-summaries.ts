// Precompute summaries for seeded meetings (PLAN.md P0-6, P1-1).
// For each seed/meetings/<id>.json missing the requested template: run lib/extract on the
// transcript and write summaries.<template>. The general run also writes action_items (ids
// "<meeting>-a<n>", edited_by_human false); other templates keep the general action items.
// Meetings over 15 minutes are map-reduced inside lib/extract (same path as uploads).
// Human-edited action items (edited_by_human) are kept across a --force regeneration.
// A failed meeting/template is reported and skipped; the rest still run (and are saved).
// Usage: npx tsx scripts/generate-summaries.ts [--force] [--template general|sales|one_on_one|all] [--pause <s>] [meeting-id ...]
//        (--template defaults to general; "one-on-one" and "1on1" also work; --pause waits
//        between chunk calls of a long meeting, for per-minute provider limits)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { extract } from "../lib/extract";
import type { SeedMeetingFile } from "../lib/seed";
import type { ActionItem, Template } from "../lib/types";
import { isTemplate, TEMPLATES } from "../lib/templates";

const DIR = path.resolve(__dirname, "..", "seed", "meetings");

/**
 * Human-corrected action items survive a regeneration: each replaces the new item that cites
 * any of the same segments (or is appended if none does).
 */
function keepHumanEdits(fresh: ActionItem[], previous: ActionItem[]): ActionItem[] {
  const out = [...fresh];
  for (const h of previous.filter((a) => a.edited_by_human)) {
    const ev = new Set(h.evidence);
    const i = out.findIndex((a) => !a.edited_by_human && a.evidence.some((id) => ev.has(id)));
    if (i >= 0) out[i] = h;
    else out.push(h);
  }
  return out.map((a, i) => ({ ...a, id: `${a.meeting_id}-a${i + 1}` }));
}

async function generate(f: SeedMeetingFile, template: Template, pauseS = 0) {
  const { meeting, segments } = f;
  const r = await extract(segments, meeting.speakers, meeting.date, template, {
    pauseMs: pauseS * 1000,
    onProgress: (line) => console.log(`  ${line}`),
  });
  if (!r.ok) throw new Error(r.error);
  const fresh: ActionItem[] = r.actionItems.map((a) => ({ id: "", meeting_id: meeting.id, ...a, edited_by_human: false }));
  return { summary: r.summary, actionItems: keepHumanEdits(fresh, f.action_items ?? []), dropped: r.dropped };
}

function parseTemplates(args: string[]): Template[] {
  const i = args.indexOf("--template");
  if (i < 0) return ["general"];
  const v = (args[i + 1] ?? "").toLowerCase().replace(/-/g, "_");
  if (v === "all") return [...TEMPLATES];
  const t = v === "1on1" ? "one_on_one" : v;
  if (!isTemplate(t)) throw new Error(`--template must be general, sales, one_on_one or all (got "${args[i + 1] ?? ""}")`);
  return [t];
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const templates = parseTemplates(args);
  const pi = args.indexOf("--pause");
  const pauseS = pi >= 0 ? Number(args[pi + 1]) || 0 : 0;
  const valueAt = new Set([args.indexOf("--template"), pi].filter((i) => i >= 0).map((i) => i + 1));
  const only = args.filter((a, i) => !a.startsWith("--") && !valueAt.has(i));
  const files = fs.readdirSync(DIR).filter((n) => n.endsWith(".json")).sort();
  const failed: string[] = [];
  for (const template of templates) {
    for (const name of files) {
      const file = path.join(DIR, name);
      const f = JSON.parse(fs.readFileSync(file, "utf8")) as SeedMeetingFile;
      if (only.length && !only.includes(f.meeting.id)) continue;
      if (f.summaries?.[template] && !force) {
        console.log(`${f.meeting.id}: has a ${template} summary, skipped`);
        continue;
      }
      const t = Date.now();
      let out;
      try {
        out = await generate(f, template, pauseS);
      } catch (e) {
        console.error(`${f.meeting.id} ${template}: FAILED: ${e instanceof Error ? e.message : e}`);
        failed.push(`${f.meeting.id}/${template}`);
        continue;
      }
      const { summary, actionItems, dropped } = out;
      f.summaries = { ...f.summaries, [template]: { meeting_id: f.meeting.id, template, points: summary } };
      if (template === "general") f.action_items = actionItems;
      fs.writeFileSync(file, JSON.stringify(f, null, 2) + "\n");
      const items = template === "general" ? `, ${actionItems.length} action items` : "";
      console.log(`${f.meeting.id} ${template}: ${summary.length} points${items}, ${dropped} dropped (${Math.round((Date.now() - t) / 1000)}s)`);
    }
  }
  if (failed.length) {
    console.error(`Not generated (left to on-demand generation): ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
