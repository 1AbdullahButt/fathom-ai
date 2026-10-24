// Transcribe seed media once with AssemblyAI (speaker labels) and store raw utterances.
// Usage: npx tsx scripts/transcribe-seed.ts seed/media/<slug>.mp3 [speakersExpected]
// Output: seed/transcripts/<slug>.json  (committed; deploys never call the API)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const API = "https://api.assemblyai.com/v2";

async function main() {
  const [file, speakersArg] = process.argv.slice(2);
  if (!file) throw new Error("usage: transcribe-seed.ts <media file> [speakersExpected]");
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY is not set (.env)");
  const headers = { authorization: key };
  const slug = path.basename(file).replace(/\.[^.]+$/, "");

  const upload = await fetch(`${API}/upload`, { method: "POST", headers, body: fs.readFileSync(file) });
  if (!upload.ok) throw new Error(`upload failed: ${upload.status} ${await upload.text()}`);
  const { upload_url } = (await upload.json()) as { upload_url: string };

  const body: Record<string, unknown> = { audio_url: upload_url, speaker_labels: true, punctuate: true, format_text: true };
  if (speakersArg) body.speakers_expected = Number(speakersArg);
  const created = await fetch(`${API}/transcript`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!created.ok) throw new Error(`transcript request failed: ${created.status} ${await created.text()}`);
  const { id } = (await created.json()) as { id: string };
  console.log(`${slug}: transcript ${id} queued`);

  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`${API}/transcript/${id}`, { headers });
    const t = (await res.json()) as {
      status: string;
      error?: string;
      audio_duration?: number;
      utterances?: { speaker: string; start: number; end: number; text: string }[];
    };
    if (t.status === "error") throw new Error(`transcription error: ${t.error}`);
    if (t.status !== "completed") continue;
    const out = {
      slug,
      provider: "assemblyai",
      transcript_id: id,
      duration_s: t.audio_duration ?? 0,
      utterances: (t.utterances ?? []).map((u) => ({
        speaker: u.speaker,
        start_s: u.start / 1000,
        end_s: u.end / 1000,
        text: u.text,
      })),
    };
    fs.mkdirSync("seed/transcripts", { recursive: true });
    fs.writeFileSync(`seed/transcripts/${slug}.json`, JSON.stringify(out, null, 2));
    console.log(`${slug}: ${out.utterances.length} utterances, ${Math.round(out.duration_s / 60)} min`);
    return;
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
