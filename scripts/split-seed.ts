// Re-fetch finished AssemblyAI transcripts (no new transcription cost) and split each
// speaker utterance into sentence-sized segments using word timings, so playback sync and
// click-to-seek land within a few seconds even when a council member speaks for minutes.
// Usage: npx tsx scripts/split-seed.ts seed/transcripts/<slug>.json [...]
import "dotenv/config";
import fs from "node:fs";

interface Word { text: string; start: number; end: number; speaker: string }
interface Utterance { speaker: string; start: number; end: number; text: string; words: Word[] }

const MIN_S = 4;
const MAX_S = 20;

function split(words: Word[]): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    const len = (w.end - cur[0].start) / 1000;
    const sentenceEnd = /[.?!]$/.test(w.text);
    if ((sentenceEnd && len >= MIN_S) || len >= MAX_S) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) {
    // fold a short tail into the previous segment
    if (out.length && (cur[cur.length - 1].end - cur[0].start) / 1000 < MIN_S / 2) out[out.length - 1].push(...cur);
    else out.push(cur);
  }
  return out;
}

async function main() {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY is not set (.env)");
  for (const file of process.argv.slice(2)) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const res = await fetch(`https://api.assemblyai.com/v2/transcript/${raw.transcript_id}`, { headers: { authorization: key } });
    if (!res.ok) throw new Error(`${file}: fetch failed ${res.status}`);
    const t = (await res.json()) as { utterances: Utterance[] };
    const segments = t.utterances.flatMap((u) =>
      split(u.words).map((ws) => ({
        speaker: u.speaker,
        start_s: ws[0].start / 1000,
        end_s: ws[ws.length - 1].end / 1000,
        text: ws.map((w) => w.text).join(" "),
      })),
    );
    raw.segments = segments;
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));
    const speakers = new Set(segments.map((s) => s.speaker));
    console.log(`${raw.slug}: ${t.utterances.length} utterances, ${segments.length} segments, ${speakers.size} speakers`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
