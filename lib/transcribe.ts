// Transcription (PLAN.md Architecture: external APIs behind lib/transcribe.ts).
// AssemblyAI by public URL with speaker labels: submit, poll, then split each speaker utterance
// into sentence-sized segments (<= 20 s) by word timings, like scripts/split-seed.ts, so
// click-to-seek and playback sync land within a few seconds.
// TRANSCRIBE_MOCK=1 returns the locked fixture meeting1's transcript re-keyed to the meeting id.
import fixture from "../tests/fixtures/meeting1.json";
import type { Segment, Speaker } from "./types";

export interface Transcript {
  segments: Omit<Segment, "meeting_id">[];
  speakers: Speaker[];
  duration_s: number;
}

/** A failure we can explain to the user in plain words (stored as the meeting's error). */
export class TranscribeError extends Error {}

interface Word {
  text: string;
  start: number;
  end: number;
}
interface Utterance {
  speaker: string;
  start: number;
  end: number;
  text: string;
  words: Word[];
}
interface AaiTranscript {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  error?: string;
  audio_duration?: number | null;
  utterances?: Utterance[] | null;
}

const API = "https://api.assemblyai.com/v2";
const POLL_MS = 3000;
const MIN_S = 4;
const MAX_S = 20;

export function isTranscribeMock(): boolean {
  return process.env.TRANSCRIBE_MOCK === "1" || process.env.TRANSCRIBE_MOCK === "true";
}

const segmentId = (meetingId: string, n: number) => `${meetingId}-s${n}`;

/** Sentence-sized word groups: cut at sentence end once >= 4 s, or hard at 20 s; fold short tails. */
export function splitWords<W extends { text: string; start: number; end: number }>(words: W[]): W[][] {
  const out: W[][] = [];
  let cur: W[] = [];
  for (const w of words) {
    cur.push(w);
    const len = (w.end - cur[0].start) / 1000;
    if ((/[.?!]$/.test(w.text) && len >= MIN_S) || len >= MAX_S) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) {
    const tail = (cur[cur.length - 1].end - cur[0].start) / 1000;
    if (out.length && tail < MIN_S / 2) out[out.length - 1].push(...cur);
    else out.push(cur);
  }
  return out;
}

/** Map AssemblyAI utterances to segments + "Speaker A" style speakers (names are not known). */
export function mapUtterances(meetingId: string, utterances: Utterance[]): Pick<Transcript, "segments" | "speakers"> {
  const segments: Transcript["segments"] = [];
  const speakerIds: string[] = [];
  for (const u of utterances) {
    if (!speakerIds.includes(u.speaker)) speakerIds.push(u.speaker);
    const groups = u.words?.length ? splitWords(u.words) : [];
    if (!groups.length && u.text.trim()) {
      segments.push({ id: segmentId(meetingId, segments.length + 1), start_s: u.start / 1000, end_s: u.end / 1000, speaker_id: u.speaker, text: u.text.trim() });
      continue;
    }
    for (const ws of groups) {
      segments.push({
        id: segmentId(meetingId, segments.length + 1),
        start_s: ws[0].start / 1000,
        end_s: ws[ws.length - 1].end / 1000,
        speaker_id: u.speaker,
        text: ws.map((w) => w.text).join(" "),
      });
    }
  }
  return { segments, speakers: speakerIds.map((id) => ({ id, name: `Speaker ${id}` })) };
}

function mockTranscript(meetingId: string): Transcript {
  return {
    segments: fixture.segments.map((s, i) => ({
      id: segmentId(meetingId, i + 1),
      start_s: s.start_s,
      end_s: s.end_s,
      speaker_id: s.speaker_id,
      text: s.text,
    })),
    speakers: fixture.meeting.speakers.map((s) => ({ ...s })),
    duration_s: fixture.meeting.duration_s,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Plain-words reason for an AssemblyAI transcript error. */
function explain(error: string | undefined): string {
  if (error && /audio|decode|media|format|codec|duration/i.test(error)) return "We couldn’t read this file’s audio track.";
  if (error && /download|url|access|fetch/i.test(error)) return "The transcription service couldn’t fetch the uploaded file.";
  return "Transcription failed on the provider’s side.";
}

async function aai(path: string, init: RequestInit = {}): Promise<AaiTranscript> {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new TranscribeError("Transcription is not configured on this server.");
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: { authorization: key, "content-type": "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    throw new TranscribeError(`We couldn’t reach the transcription service (${(e as Error).message}).`);
  }
  if (!res.ok) {
    console.error(`AssemblyAI ${init.method ?? "GET"} ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    throw new TranscribeError("The transcription service rejected the request.");
  }
  return (await res.json()) as AaiTranscript;
}

/**
 * Transcribe a publicly reachable media URL. Polls until done or `deadline` (epoch ms) passes.
 * Throws TranscribeError with a user-facing reason on failure.
 */
export async function transcribe(meetingId: string, mediaUrl: string, deadline = Date.now() + 280_000): Promise<Transcript> {
  if (isTranscribeMock()) return mockTranscript(meetingId);
  if (!/^https:\/\//.test(mediaUrl)) throw new TranscribeError("The file isn’t reachable by the transcription service from this server.");

  let t = await aai("/transcript", {
    method: "POST",
    body: JSON.stringify({ audio_url: mediaUrl, speaker_labels: true, punctuate: true, format_text: true }),
  });
  while (t.status === "queued" || t.status === "processing") {
    if (Date.now() + POLL_MS > deadline) throw new TranscribeError("Transcription took longer than this demo allows.");
    await sleep(POLL_MS);
    t = await aai(`/transcript/${t.id}`);
  }
  if (t.status === "error") {
    console.error(`AssemblyAI transcript ${t.id} failed: ${t.error ?? "unknown"}`);
    throw new TranscribeError(explain(t.error));
  }
  const { segments, speakers } = mapUtterances(meetingId, t.utterances ?? []);
  if (!segments.length) throw new TranscribeError("We couldn’t hear any speech in this recording.");
  return { segments, speakers, duration_s: t.audio_duration ?? segments[segments.length - 1].end_s };
}
