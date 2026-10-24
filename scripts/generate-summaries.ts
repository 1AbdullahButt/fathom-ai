// Fill the "general" summary + action items for seeded meetings (PLAN.md P0-6).
// For each seed/meetings/<id>.json without summaries.general: run lib/extract on the transcript
// and write summaries.general and action_items (ids "<meeting>-a<n>", edited_by_human false).
// Meetings longer than one call's comfortable size are chunked (~10 min), extracted per chunk,
// and merged here (concat + dedupe). P2-1 moves chunking into lib/chunk.ts.
// Usage: npx tsx scripts/generate-summaries.ts [--force] [meeting-id ...]
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { extract } from "../lib/extract";
import type { ExtractedActionItem } from "../lib/validate";
import type { SeedMeetingFile } from "../lib/seed";
import type { ActionItem, Segment, SummaryPoint } from "../lib/types";

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

async function generate(f: SeedMeetingFile) {
  const { meeting, segments } = f;
  const parts = meeting.duration_s > SINGLE_CALL_MAX_S ? chunk(segments) : [segments];
  // About 3 points per 10-minute chunk, never more than MAX_POINTS in total.
  const perChunk = Math.max(1, Math.min(3, Math.floor(MAX_POINTS / parts.length)));
  const points: SummaryPoint[] = [];
  const items: ExtractedActionItem[] = [];
  let dropped = 0;
  for (const [i, part] of parts.entries()) {
    const r = await extract(part, meeting.speakers, meeting.date, "general", parts.length > 1 ? { maxPoints: perChunk } : {});
    if (!r.ok) throw new Error(`${meeting.id} chunk ${i + 1}/${parts.length}: ${r.error}`);
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

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));
  const files = fs.readdirSync(DIR).filter((n) => n.endsWith(".json")).sort();
  for (const name of files) {
    const file = path.join(DIR, name);
    const f = JSON.parse(fs.readFileSync(file, "utf8")) as SeedMeetingFile;
    if (only.length && !only.includes(f.meeting.id)) continue;
    if (f.summaries?.general && !force) {
      console.log(`${f.meeting.id}: has a general summary, skipped`);
      continue;
    }
    const t = Date.now();
    const { summary, actionItems, dropped } = await generate(f);
    f.summaries = { ...f.summaries, general: { meeting_id: f.meeting.id, template: "general", points: summary } };
    f.action_items = actionItems;
    fs.writeFileSync(file, JSON.stringify(f, null, 2) + "\n");
    console.log(
      `${f.meeting.id}: ${summary.length} points, ${actionItems.length} action items, ${dropped} dropped (${Math.round((Date.now() - t) / 1000)}s)`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
