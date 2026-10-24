"use client";

// Client side of the upload pipeline (PLAN P0-7): check the file, reserve an upload
// (POST /api/uploads), PUT the bytes with progress, start processing, then poll
// GET /api/meetings/[id] every 3 s until ready or error. Rows update in place, no reload.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Toast } from "@/components/ui/Toast";
import { formatTimestamp } from "@/lib/time";
import type { Meeting } from "@/lib/types";

export const MAX_DURATION_S = 60 * 60;
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const POLL_MS = 3000;

export type UploadStage = "uploading" | "transcribing" | "writing_notes" | "ready" | "error";

export interface UploadState {
  meeting: Meeting;
  stage: UploadStage;
  /** Upload progress 0–100 (uploading stage only). */
  progress: number;
  error: string | null;
  /** Which step failed, so Retry knows whether to re-send the file. */
  failed: "upload" | "process" | null;
}

/** A rejection shown inside the upload dialog: what happened, that nothing was lost, what to do. */
export interface UploadRejection {
  title: string;
  body: string;
}

interface Ctx {
  uploads: Record<string, UploadState>;
  start(file: File): Promise<UploadRejection | null>;
  retry(id: string): void;
  /** Follow a meeting the server reports as processing or failed (e.g. after a page reload). */
  track(meeting: Meeting): void;
}

const UploadsContext = createContext<Ctx | null>(null);

export function useUploads(): Ctx {
  const c = useContext(UploadsContext);
  if (!c) throw new Error("useUploads must be used inside <UploadsProvider>");
  return c;
}

function measureDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    const url = URL.createObjectURL(file);
    let settled = false;
    const done = (v: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      resolve(v);
    };
    // Unknown duration is allowed through; the server re-checks it after transcription.
    const timer = setTimeout(() => done(null), 8000);
    el.preload = "metadata";
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null);
    el.onerror = () => done(null);
    el.src = url;
  });
}

function putFile(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("network error"));
    xhr.send(file);
  });
}

const NOTHING_LOST = "Nothing was uploaded.";

export function UploadsProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; title: string; body?: string } | null>(null);
  const files = useRef(new Map<string, { file: File; uploadUrl: string }>());
  const uploadsRef = useRef(uploads);
  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === "error" ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = useCallback((id: string, p: Partial<UploadState>) => {
    setUploads((u) => (u[id] ? { ...u, [id]: { ...u[id], ...p } } : u));
  }, []);

  const startProcessing = useCallback(
    async (id: string, retry: boolean) => {
      patch(id, { stage: "transcribing", progress: 0, error: null, failed: null });
      try {
        const res = await fetch(`/api/meetings/${id}/process`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ retry }),
        });
        if (!res.ok && res.status !== 202) throw new Error(`process ${res.status}`);
      } catch {
        patch(id, {
          stage: "error",
          failed: "process",
          error: "We couldn’t start processing. Your file is uploaded and safe; try again.",
        });
      }
    },
    [patch],
  );

  const send = useCallback(
    async (id: string) => {
      const f = files.current.get(id);
      if (!f) return;
      patch(id, { stage: "uploading", progress: 0, error: null, failed: null });
      try {
        await putFile(f.uploadUrl, f.file, (pct) => patch(id, { progress: pct }));
      } catch {
        patch(id, {
          stage: "error",
          failed: "upload",
          error: "The upload was interrupted. The file on your device is untouched; check your connection and retry.",
        });
        setToast({ tone: "error", title: "Upload interrupted", body: "Check your connection, then press Retry on the row." });
        return;
      }
      await startProcessing(id, false);
    },
    [patch, startProcessing],
  );

  const start = useCallback(
    async (file: File): Promise<UploadRejection | null> => {
      if (!/^(audio|video)\//.test(file.type)) {
        return { title: "This isn’t an audio or video file.", body: `${NOTHING_LOST} Choose a recording such as MP3, M4A, WAV, MP4 or WebM.` };
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return { title: "This file is larger than 200 MB.", body: `${NOTHING_LOST} Compress it or upload a shorter part of the meeting.` };
      }
      const duration = await measureDuration(file);
      if (duration !== null && duration > MAX_DURATION_S) {
        return {
          title: `This file is ${formatTimestamp(duration)}. The demo takes up to 60 minutes.`,
          body: `${NOTHING_LOST} Trim the recording to an hour or less and upload it again.`,
        };
      }
      let json: { meetingId?: string; uploadUrl?: string; meeting?: Meeting; error?: { code: string; message: string } };
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filename: file.name, size: file.size, type: file.type, duration_s: duration ?? undefined }),
        });
        json = await res.json();
      } catch {
        return { title: "We couldn’t reach the server.", body: `${NOTHING_LOST} Check your connection and try again.` };
      }
      if (!json.meetingId || !json.uploadUrl || !json.meeting) {
        const code = json.error?.code;
        const what = json.error?.message ?? "We couldn’t start the upload.";
        const todo =
          code === "rate_limited"
            ? "Try again in an hour, or open one of the sample meetings meanwhile."
            : code === "bad_type"
              ? "Choose a recording such as MP3, M4A, WAV, MP4 or WebM."
              : code === "too_long"
                ? "Trim the recording to an hour or less and upload it again."
                : "Try again in a moment.";
        return { title: what, body: `${NOTHING_LOST} ${todo}` };
      }
      const id = json.meetingId;
      files.current.set(id, { file, uploadUrl: json.uploadUrl });
      setUploads((u) => ({
        ...u,
        [id]: { meeting: json.meeting!, stage: "uploading", progress: 0, error: null, failed: null },
      }));
      setToast({ tone: "info", title: "Upload started", body: "It appears at the top of your meetings." });
      void send(id);
      return null;
    },
    [send],
  );

  const retry = useCallback(
    (id: string) => {
      const u = uploadsRef.current[id];
      if (!u) return;
      if (u.failed === "upload" && files.current.has(id)) void send(id);
      else void startProcessing(id, true);
    },
    [send, startProcessing],
  );

  const track = useCallback((meeting: Meeting) => {
    if (meeting.status === "error" && !uploadsRef.current[meeting.id]) {
      // The list only carries the status; fetch the stored reason for the row.
      fetch(`/api/meetings/${meeting.id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((b: { error: string | null } | null) => {
          if (b?.error) setUploads((u) => (u[meeting.id]?.stage === "error" ? { ...u, [meeting.id]: { ...u[meeting.id], error: b.error } } : u));
        })
        .catch(() => {});
    }
    setUploads((u) =>
      u[meeting.id]
        ? u
        : {
            ...u,
            [meeting.id]: meeting.status === "error"
              ? { meeting, stage: "error", progress: 0, error: null, failed: "process" }
              : { meeting, stage: "transcribing", progress: 0, error: null, failed: null },
          },
    );
  }, []);

  // Poll every meeting that is processing on the server.
  const polling = Object.values(uploads)
    .filter((u) => u.stage === "transcribing" || u.stage === "writing_notes")
    .map((u) => u.meeting.id)
    .sort()
    .join(",");
  useEffect(() => {
    if (!polling) return;
    const ids = polling.split(",");
    let stopped = false;
    const tick = async () => {
      for (const id of ids) {
        try {
          const res = await fetch(`/api/meetings/${id}`, { cache: "no-store" });
          if (!res.ok || stopped) continue;
          const b = (await res.json()) as { meeting: Meeting; error: string | null; stage: UploadStage | null };
          if (stopped) return;
          const { status } = b.meeting;
          if (status === "ready") {
            patch(id, { meeting: b.meeting, stage: "ready", error: null });
            setToast({ tone: "success", title: `${b.meeting.title} is ready` });
          } else if (status === "error") {
            patch(id, {
              meeting: b.meeting,
              stage: "error",
              failed: "process",
              error: b.error ?? "We couldn’t process this recording.",
            });
          } else if (b.stage === "writing_notes" || b.stage === "transcribing") {
            patch(id, { meeting: b.meeting, stage: b.stage });
          }
        } catch {
          // Transient network error: keep polling.
        }
      }
    };
    const t = setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [polling, patch]);

  const value = useMemo(() => ({ uploads, start, retry, track }), [uploads, start, retry, track]);

  return (
    <UploadsContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 24,
            display: "flex",
            justifyContent: "center",
            zIndex: 60,
            pointerEvents: "none",
          }}
        >
          <div style={{ pointerEvents: "auto", width: "100%", maxWidth: 380 }}>
            <Toast tone={toast.tone} title={toast.title} body={toast.body} onClose={() => setToast(null)} />
          </div>
        </div>
      ) : null}
    </UploadsContext.Provider>
  );
}

export default UploadsProvider;
