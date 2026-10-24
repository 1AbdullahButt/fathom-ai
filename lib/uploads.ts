// Upload helpers: cost-guard limits, client hashing, and where the uploaded file lives.
// Supabase mode: Storage bucket "uploads" (public read, signed upload URLs).
// Memory mode (tests/e2e/CI): bytes kept in process memory behind /api/uploads/[id]/file.
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dataSource } from "./data";

/** SPEC §4 cost guard. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
export const MAX_DURATION_S = 60 * 60;
export const UPLOADS_PER_HOUR = 3;
/** Paid pipeline starts (first run + Retry) per client per hour (SECURITY.md). */
export const PROCESS_STARTS_PER_HOUR = 6;
export const BUCKET = "uploads";

/** Must match the bucket's allowed_mime_types (supabase/migrations/0001_init.sql). */
export const ALLOWED_TYPES = new Set([
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/wav",
  "audio/x-wav", "audio/wave", "audio/webm", "audio/ogg", "audio/flac", "audio/x-flac",
  "video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/ogg",
]);

/** "Team sync (final).m4a" -> "Team sync (final)". */
export function titleFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const title = base.replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/\s+/g, " ").trim().slice(0, 300);
  return title || "Untitled recording";
}

/** Storage-safe object name that keeps the extension (the player picks <video> by extension). */
export function safeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const ext = /\.([A-Za-z0-9]{1,5})$/.exec(base)?.[1]?.toLowerCase() ?? "bin";
  const stem = base.replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${stem || "recording"}.${ext}`;
}

/** First hop of x-forwarded-for (set by Vercel), else x-real-ip, else "local". */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip")?.trim() || "local";
}

function salt(): string {
  if (process.env.UPLOAD_SALT) return process.env.UPLOAD_SALT;
  // Server-only secret already present in production, so the hash can't be brute-forced
  // over the IPv4 space by someone who only has the repo. DECISIONS.md: UPLOAD_SALT.
  if (process.env.ASSEMBLYAI_API_KEY) return createHash("sha256").update(`upload-salt:${process.env.ASSEMBLYAI_API_KEY}`).digest("hex");
  return "fathom-ai-memory-mode-salt";
}

/** Salted SHA-256 of the client IP. The raw IP is never stored. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${salt()}:${ip}`).digest("hex");
}

// ---------------------------------------------------------------- storage

let storageClient: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  storageClient ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return storageClient;
}

interface MemoryFile {
  bytes: Buffer | null;
  type: string;
  maxBytes: number;
}
function memoryFiles(): Map<string, MemoryFile> {
  const g = globalThis as unknown as { __fathomUploads?: Map<string, MemoryFile> };
  return (g.__fathomUploads ??= new Map());
}

export interface UploadTarget {
  uploadUrl: string;
  /** Public URL the player (and AssemblyAI) read the file from. */
  mediaUrl: string;
}

/** Reserve a place for the file and return where the browser PUTs it. */
export async function createUploadTarget(meetingId: string, filename: string, type: string, size: number): Promise<UploadTarget> {
  const name = safeFilename(filename);
  if (dataSource() === "memory") {
    memoryFiles().set(meetingId, { bytes: null, type, maxBytes: size });
    const url = `/api/uploads/${meetingId}/file`;
    return { uploadUrl: url, mediaUrl: `${url}?f=${encodeURIComponent(name)}` };
  }
  const path = `${meetingId}/${name}`;
  const bucket = supabase().storage.from(BUCKET);
  const { data, error } = await bucket.createSignedUploadUrl(path);
  if (error || !data) throw new Error(`signed upload url: ${error?.message ?? "no data"}`);
  return { uploadUrl: data.signedUrl, mediaUrl: bucket.getPublicUrl(path).data.publicUrl };
}

/** Memory mode: accept the PUT body for a reserved upload. */
export function putMemoryFile(meetingId: string, bytes: Buffer): "ok" | "unknown" | "too_large" {
  const f = memoryFiles().get(meetingId);
  if (!f) return "unknown";
  if (bytes.length > Math.min(f.maxBytes, MAX_UPLOAD_BYTES)) return "too_large";
  f.bytes = bytes;
  return "ok";
}

export function getMemoryFile(meetingId: string): { bytes: Buffer; type: string } | null {
  const f = memoryFiles().get(meetingId);
  return f?.bytes ? { bytes: f.bytes, type: f.type } : null;
}

/**
 * Whether `url` is this upload's own file: our bucket folder in Supabase mode, the local file
 * route in memory mode. The pipeline only fetches/transcribes such URLs, so a meeting row
 * written directly through the public API can't point the server or AssemblyAI elsewhere.
 */
export function isOwnMediaUrl(meetingId: string, url: string): boolean {
  if (dataSource() === "memory") return url.startsWith(`/api/uploads/${meetingId}/file`);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!base) return false;
  const prefix = `${base}/storage/v1/object/public/${BUCKET}/${meetingId}/`;
  return url.startsWith(prefix) && /^[A-Za-z0-9_-]+\.[a-z0-9]{1,5}$/.test(url.slice(prefix.length));
}

/** Whether the uploaded file has arrived (checked before paying for transcription). */
export async function uploadExists(meetingId: string, mediaUrl: string): Promise<boolean> {
  if (dataSource() === "memory") return getMemoryFile(meetingId) !== null;
  try {
    const res = await fetch(mediaUrl, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
    return res.ok;
  } catch {
    return false;
  }
}
