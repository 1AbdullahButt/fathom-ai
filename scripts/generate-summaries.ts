// Precompute summaries for seeded meetings (PLAN.md P0-6, P1-1).
// For each seed/meetings/<id>.json missing the requested template: run lib/extract on the
// transcript and write summaries.<template>. The general run also writes action_items (ids
// "<meeting>-a<n>", edited_by_human false); other templates keep the general action items.
// Meetings longer than one call's comfortable size are chunked (~10 min), extracted per chunk,
// and merged here (concat + dedupe). P2-1 moves chunking into lib/chunk.ts.
// A failed meeting/template is reported and skipped; the rest still run (and are saved).
// Usage: npx tsx scripts/generate-summaries.ts [--force] [--template general|sales|one_on_one|all] [meeting-id ...]
//        (--template defaults to general; "one-on-one" and "1on1" also work)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { extract } from "../lib/extract";
import type { ExtractedActionItem } from "../lib/validate";
import type { SeedMeetingFile } from "../lib/seed";
import type { ActionItem, Segment, SummaryPoint, Template } from "../lib/types";
import { isTemplate, TEMPLATES } from "../lib/templates";

const DIR = path.resolve(__dirname, "..", "seed", "meetings");
const CHUNK_S = 600;
/** Above this, one call risks the Groq free-tier token-per-minute limit. */
const SINGLE_CALL_MAX_S = 15 * 60;
const MAX_POINTS = 12;

function chunk(segments: Segment[]): Segment[][] {
  const out: Segment[][] = [];
  let cur: Segment[] = [];
  let start = segments[0]?.start_s ?? 0;
  for (const s of segments) {
    if (cur.length && s.start_s - start >= CHUNK_S) {
      out.push(cur);
      cur = [];
      start = s.start_s;
    }
    cur.push(s);
  }
  if (cur.length) out.push(cur);
  return out;
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function dedupePoints(points: SummaryPoint[]): SummaryPoint[] {
  const seen = new Set<string>();
  return points.filter((p) => {
    const k = norm(p.text);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function dedupeItems(items: ExtractedActionItem[]): ExtractedActionItem[] {
  const byKey = new Map<string, ExtractedActionItem>();
  for (const a of items) {
    const k = `${norm(a.task)}|${a.owner ?? ""}`;
    const prev = byKey.get(k);
    if (!prev) byKey.set(k, a);
    else prev.evidence = [...new Set([...prev.evidence, ...a.evidence])];
  }
  return [...byKey.values()];
}

async function generate(f: SeedMeetingFile, template: Template) {
  const { meeting, segments } = f;
  const parts = meeting.duration_s > SINGLE_CALL_MAX_S ? chunk(segments) : [segments];
  // About 3 points per 10-minute chunk, never more than MAX_POINTS in total.
  const perChunk = Math.max(1, Math.min(3, Math.floor(MAX_POINTS / parts.length)));
  const points: SummaryPoint[] = [];
  const items: ExtractedActionItem[] = [];
  let dropped = 0;
  for (const [i, part] of parts.entries()) {
    const r = await extract(part, meeting.speakers, meeting.date, template, parts.length > 1 ? { maxPoints: perChunk } : {});
    if (!r.ok) throw new Error(`${meeting.id} ${template} chunk ${i + 1}/${parts.length}: ${r.error}`);
    points.push(...r.summary);
    items.push(...r.actionItems);
    dropped += r.dropped;
    if (parts.length > 1) console.log(`  chunk ${i + 1}/${parts.length}: ${r.summary.length} points, ${r.actionItems.length} items`);
  }
  const summary = dedupePoints(points).slice(0, MAX_POINTS);
  const actionItems: ActionItem[] = dedupeItems(items).map((a, i) => ({
    id: `${meeting.id}-a${i + 1}`,
    meeting_id: meeting.id,
    ...a,
    edited_by_human: false,
  }));
  return { summary, actionItems, dropped };
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
  const ti = args.indexOf("--template");
  const only = args.filter((a, i) => !a.startsWith("--") && !(ti >= 0 && i === ti + 1));
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
        out = await generate(f, template);
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
