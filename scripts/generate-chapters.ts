// Precompute chapters for seeded meetings (PLAN.md P2-2). Touches only the `chapters` key of
// seed/meetings/<id>.json (summaries and action items are left exactly as they are).
// Meetings shorter than MIN_CHAPTER_MEETING_S get [] without a model call.
// Usage: npx tsx scripts/generate-chapters.ts [--force] [--pause <s>] [meeting-id ...]
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { generateChapters, MIN_CHAPTER_MEETING_S } from "../lib/chapters";
import { formatTimestamp } from "../lib/time";
import type { SeedMeetingFile } from "../lib/seed";

const DIR = path.resolve(__dirname, "..", "seed", "meetings");

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const pi = args.indexOf("--pause");
  const pauseS = pi >= 0 ? Number(args[pi + 1]) || 0 : 20;
  const ids = args.filter((a, i) => !a.startsWith("--") && !(pi >= 0 && i === pi + 1));
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => !ids.length || ids.includes(f.replace(/\.json$/, "")));

  let called = false;
  let failed = 0;
  for (const name of files) {
    const file = path.join(DIR, name);
    const f = JSON.parse(fs.readFileSync(file, "utf8")) as SeedMeetingFile;
    const { meeting, segments } = f;
    if (f.chapters?.length && !force) {
      console.log(`${meeting.id}: has ${f.chapters.length} chapters, skipped (--force to redo)`);
      continue;
    }
    if (meeting.duration_s < MIN_CHAPTER_MEETING_S) {
      console.log(`${meeting.id}: ${formatTimestamp(meeting.duration_s)} is too short for chapters`);
      continue;
    }
    if (called && pauseS > 0) await new Promise((r) => setTimeout(r, pauseS * 1000));
    called = true;
    try {
      const chapters = await generateChapters(meeting.id, segments, meeting.speakers, meeting.duration_s);
      if (!chapters.length) throw new Error("no usable chapters in the model output");
      // Re-read and change only `chapters`, so a concurrent summaries run isn't overwritten.
      const fresh = JSON.parse(fs.readFileSync(file, "utf8")) as SeedMeetingFile;
      fresh.chapters = chapters;
      fs.writeFileSync(file, JSON.stringify(fresh, null, 2) + "\n");
      console.log(`${meeting.id}: ${chapters.length} chapters`);
      for (const c of chapters) console.log(`  ${formatTimestamp(c.start_s).padStart(7)}  ${c.title}`);
    } catch (e) {
      failed++;
      console.error(`${meeting.id}: FAILED ${(e as Error).message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

void main();
