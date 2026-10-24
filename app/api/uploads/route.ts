// POST /api/uploads {filename, size, type, duration_s?} -> {meetingId, uploadUrl}
// Validates the file and the cost guard (SPEC §4), creates the meeting in "processing", and
// returns where the browser uploads the bytes (Supabase signed URL, or a local PUT endpoint).
import { NextResponse } from "next/server";
import { countUploadsSince, createMeeting, logUpload, updateMeeting } from "@/lib/data";
import {
  ALLOWED_TYPES,
  MAX_DURATION_S,
  MAX_UPLOAD_BYTES,
  UPLOADS_PER_HOUR,
  clientIp,
  createUploadTarget,
  hashIp,
  titleFromFilename,
} from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Code = "bad_request" | "bad_type" | "too_large" | "too_long" | "rate_limited" | "server_error";

function reject(status: number, code: Code, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: Request) {
  let body: { filename?: unknown; size?: unknown; type?: unknown; duration_s?: unknown };
  try {
    body = await req.json();
  } catch {
    return reject(400, "bad_request", "Send JSON with filename, size and type.");
  }
  const { filename, size, type } = body;
  const duration = typeof body.duration_s === "number" && Number.isFinite(body.duration_s) ? body.duration_s : null;
  if (typeof filename !== "string" || !filename.trim() || typeof size !== "number" || typeof type !== "string") {
    return reject(400, "bad_request", "Send JSON with filename, size and type.");
  }
  if (!/^(audio|video)\//.test(type) || !ALLOWED_TYPES.has(type)) {
    return reject(415, "bad_type", "This file type isn’t supported. Upload an audio or video file such as MP3, M4A, WAV, MP4 or WebM.");
  }
  if (size <= 0 || size > MAX_UPLOAD_BYTES) {
    return reject(413, "too_large", "This file is larger than the 200 MB the demo takes.");
  }
  if (duration !== null && duration > MAX_DURATION_S) {
    return reject(422, "too_long", "This recording is longer than the 60 minutes the demo takes.");
  }

  try {
    const ipHash = hashIp(clientIp(req.headers));
    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await countUploadsSince(ipHash, since)) >= UPLOADS_PER_HOUR) {
      return reject(429, "rate_limited", "You’ve uploaded 3 recordings in the last hour, the demo’s limit.");
    }
    const meeting = await createMeeting({
      title: titleFromFilename(filename),
      date: new Date().toISOString().slice(0, 10),
      duration_s: duration !== null && duration > 0 ? Math.round(duration * 10) / 10 : 0,
    });
    await logUpload(ipHash, meeting.id);
    const target = await createUploadTarget(meeting.id, filename, type, size);
    await updateMeeting(meeting.id, { media_url: target.mediaUrl });
    return NextResponse.json({ meetingId: meeting.id, uploadUrl: target.uploadUrl, meeting: { ...meeting, media_url: target.mediaUrl } }, { status: 201 });
  } catch (e) {
    console.error("POST /api/uploads", e instanceof Error ? e.message : e);
    return reject(500, "server_error", "We couldn’t start the upload.");
  }
}
