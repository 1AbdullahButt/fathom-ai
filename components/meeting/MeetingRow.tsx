import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatTimestamp } from "@/lib/time";
import type { Meeting } from "@/lib/types";
import styles from "./MeetingRow.module.css";

const MAX_AVATARS = 4;
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|$)/i;

/** "13 Mar 2025". Dates are ISO calendar dates, so format in UTC to avoid day shifts. */
export function formatMeetingDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function tileIcon(m: Meeting): string {
  if (m.status === "error") return "circle-alert";
  if (!m.media_url) return "file-text";
  return VIDEO_EXT.test(m.media_url) ? "video" : "audio-lines";
}

export interface RowProgress {
  stage: "uploading" | "transcribing" | "writing_notes" | "ready" | "error";
  /** Upload progress 0–100 (uploading only). */
  progress: number;
  error: string | null;
  onRetry?: () => void;
}

const STAGE_LABEL = { uploading: "Uploading", transcribing: "Transcribing", writing_notes: "Writing notes" } as const;

/**
 * One meeting in the list. A ready row is a link to the meeting page; processing and failed
 * uploads are not clickable (design/screens.md §2) and show progress or the reason + Retry.
 */
export function MeetingRow({ meeting, upload }: { meeting: Meeting; upload?: RowProgress }) {
  const { id, title, date, duration_s, speakers, source } = meeting;
  const status = upload?.stage === "error" ? "error" : upload && upload.stage !== "ready" ? "processing" : meeting.status;
  const ready = status === "ready";
  const stage = upload && upload.stage in STAGE_LABEL ? (upload.stage as keyof typeof STAGE_LABEL) : "transcribing";
  const shown = speakers.slice(0, MAX_AVATARS);
  const extra = speakers.length - shown.length;
  const content = (
    <>
      <span className={`${styles.tile} ${status === "error" ? styles.tileError : ""}`} aria-hidden="true">
        <Icon name={tileIcon({ ...meeting, status })} size={18} />
      </span>
      <span className={styles.body}>
        <span className={`${styles.title} ${ready ? "" : styles.titleMuted}`}>{title}</span>
        <span className={styles.meta}>
          <span>{formatMeetingDate(date)}</span>
          {duration_s > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className={styles.duration}>{formatTimestamp(duration_s)}</span>
            </>
          ) : null}
          {/* Source badge only once ready, so "Uploaded" never sits next to "Uploading" (review-p0 §6). */}
          {!ready ? null : source === "upload" ? (
            <Badge size="sm" tone="outline" icon="upload">
              Uploaded
            </Badge>
          ) : (
            <Badge size="sm" tone="outline">
              Sample
            </Badge>
          )}
          {status === "processing" && !upload ? (
            <Badge size="sm" tone="accent">
              Processing
            </Badge>
          ) : null}
          {status === "error" ? (
            <Badge size="sm" tone="danger">
              Couldn’t process
            </Badge>
          ) : null}
          {speakers.length ? (
            <span className={styles.speakerCount}>
              {speakers.length} {speakers.length === 1 ? "speaker" : "speakers"}
            </span>
          ) : null}
        </span>
        {status === "processing" && upload ? (
          <span className={styles.progress}>
            <span className={styles.stage}>
              {STAGE_LABEL[stage]}
              {stage === "uploading" ? ` · ${Math.round(upload.progress)}%` : "…"}
            </span>
            <ProgressBar
              value={upload.progress}
              indeterminate={stage !== "uploading"}
              label={`${STAGE_LABEL[stage]} ${title}`}
            />
          </span>
        ) : null}
        {status === "error" ? (
          <span className={styles.failed}>
            <span className={styles.reason}>{upload?.error ?? "We couldn’t process this recording."}</span>
            {upload?.onRetry ? (
              <Button variant="ghost" size="sm" icon="rotate-ccw" onClick={upload.onRetry}>
                Retry
              </Button>
            ) : null}
          </span>
        ) : null}
      </span>
      {speakers.length ? (
        <span className={styles.stack} role="img" aria-label={`${speakers.length} ${speakers.length === 1 ? "speaker" : "speakers"}: ${speakers.map((s) => s.name).join(", ")}`}>
          {shown.map((s, i) => (
            <Avatar key={s.id} name={s.name} color={`var(--spk-${(i % 8) + 1})`} size={28} ring="var(--surface-app)" />
          ))}
          {extra > 0 ? <span className={styles.more}>+{extra}</span> : null}
        </span>
      ) : null}
    </>
  );
  return ready ? (
    <Link href={`/m/${id}`} className={styles.row}>
      {content}
    </Link>
  ) : (
    <div className={styles.row} aria-busy={status === "processing" || undefined}>
      {content}
    </div>
  );
}

export default MeetingRow;
