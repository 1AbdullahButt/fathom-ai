import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
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

/** One meeting in the list. The whole row links to the meeting page. */
export function MeetingRow({ meeting }: { meeting: Meeting }) {
  const { id, title, date, duration_s, speakers, status, source } = meeting;
  const ready = status === "ready";
  const shown = speakers.slice(0, MAX_AVATARS);
  const extra = speakers.length - shown.length;
  return (
    <Link href={`/m/${id}`} className={styles.row}>
      <span className={`${styles.tile} ${status === "error" ? styles.tileError : ""}`} aria-hidden="true">
        <Icon name={tileIcon(meeting)} size={18} />
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
          {source === "upload" ? (
            <Badge size="sm" tone="outline" icon="upload">
              Uploaded
            </Badge>
          ) : (
            <Badge size="sm" tone="outline">
              Sample
            </Badge>
          )}
          {status === "processing" ? (
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
      </span>
      {speakers.length ? (
        <span className={styles.stack} role="img" aria-label={`${speakers.length} ${speakers.length === 1 ? "speaker" : "speakers"}: ${speakers.map((s) => s.name).join(", ")}`}>
          {shown.map((s, i) => (
            <Avatar key={s.id} name={s.name} color={`var(--spk-${(i % 8) + 1})`} size={28} ring="var(--surface-app)" />
          ))}
          {extra > 0 ? <span className={styles.more}>+{extra}</span> : null}
        </span>
      ) : null}
    </Link>
  );
}

export default MeetingRow;
