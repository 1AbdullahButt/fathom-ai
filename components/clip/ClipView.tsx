"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Clip, Meeting, Segment } from "@/lib/types";
import { formatTimestamp } from "@/lib/time";
import { usePlayback } from "@/lib/usePlayback";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { formatMeetingDate } from "@/components/meeting/MeetingRow";
import { activeAt, Stage } from "@/components/meeting/MeetingView";
import { PlayerControls } from "@/components/meeting/PlayerControls";
import { speakerColor } from "@/components/meeting/QuoteChip";
import { TranscriptLine } from "@/components/meeting/TranscriptLine";
import meetingStyles from "@/components/meeting/MeetingView.module.css";
import hl from "@/components/meeting/Highlights.module.css";
import styles from "./ClipPage.module.css";

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|$)/i;
/** Media time updates land a little past the end; treat this close as "at the end". */
const EPS = 0.05;

export interface ClipViewProps {
  clip: Clip;
  meeting: Meeting;
  /** Only the segments inside the clip range (the rest of the meeting is not sent). */
  segments: Segment[];
  /** Length of the whole meeting, for "0:12–0:38 of 1:48". */
  meetingLength: number;
}

/** Public clip: plays only [start_s, end_s] of the meeting, with that range's transcript (A6). */
export function ClipView({ clip, meeting, segments, meetingLength }: ClipViewProps) {
  const { start_s: start, end_s: end } = clip;
  const len = Math.max(0, end - start);
  const speakers = meeting.speakers;

  const [mediaFailed, setMediaFailed] = useState(false);
  const [mediaKey, setMediaKey] = useState(0);
  const mediaUrl = mediaFailed ? null : meeting.media_url;
  const isVideo = !!mediaUrl && VIDEO_EXT.test(mediaUrl);

  const { time, playing, seek, pause, play: playRaw, rate, cycleRate, attachMedia } = usePlayback(meetingLength, start);
  const [toast, setToast] = useState<{ tone: "link" | "error"; title: string } | null>(null);

  // Never play outside the range: stop at the end.
  useEffect(() => {
    if (time >= end - EPS) {
      if (playing) pause();
      if (time > end) seek(end);
    } else if (time < start - EPS) {
      seek(start);
    }
  }, [time, playing, start, end, seek, pause]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const play = useCallback(() => {
    if (time >= end - EPS) seek(start);
    playRaw();
  }, [time, end, start, seek, playRaw]);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  /** Scrubber and transcript work in clip time, clamped to the range. */
  const seekInClip = useCallback((x: number) => seek(start + Math.min(len, Math.max(0, x))), [seek, start, len]);
  const seekAbs = useCallback((s: number) => seek(Math.min(end, Math.max(start, s))), [seek, start, end]);

  const activeIndex = useMemo(() => Math.max(0, activeAt(segments, time)), [segments, time]);
  const staged = segments[activeIndex];
  const stagedSpeaker = staged ? speakers.find((s) => s.id === staged.speaker_id) : undefined;
  const current = Math.min(len, Math.max(0, time - start));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast({ tone: "link", title: "Link copied" });
    } catch {
      setToast({ tone: "error", title: "Couldn’t copy. Copy the address from the browser bar." });
    }
  };

  return (
    <div className={styles.root}>
      <ClipHeader meetingHref={`/m/${encodeURIComponent(meeting.id)}?t=${start}`} />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.badges}>
            <Badge tone="accent" icon="globe" size="sm">
              Public clip
            </Badge>
            <Badge tone="outline" icon="clock" size="sm">
              <span className={styles.mono}>{formatTimestamp(len)}</span>
            </Badge>
          </div>
          <h1 className={styles.title}>{clip.title}</h1>
          <p className={styles.meta}>
            From <strong>{meeting.title}</strong> · {formatMeetingDate(meeting.date)} ·{" "}
            <span className={styles.mono}>
              {formatTimestamp(start)}–{formatTimestamp(end)}
            </span>{" "}
            of <span className={styles.mono}>{formatTimestamp(meetingLength)}</span>
          </p>
        </div>

        <div className={styles.player}>
          {mediaUrl && isVideo ? (
            <div className={meetingStyles.stage} style={{ cursor: "default" }}>
              <video
                key={mediaKey}
                ref={attachMedia}
                className={meetingStyles.video}
                src={mediaUrl}
                preload="metadata"
                playsInline
                onClick={toggle}
                onError={() => setMediaFailed(true)}
              />
            </div>
          ) : (
            <>
              {mediaUrl ? (
                <audio key={mediaKey} ref={attachMedia} src={mediaUrl} preload="metadata" onError={() => setMediaFailed(true)} hidden />
              ) : null}
              <Stage
                speaker={stagedSpeaker}
                color={speakerColor(speakers, stagedSpeaker?.id)}
                caption={staged?.text}
                playing={playing}
                atStart={current <= EPS}
                onToggle={toggle}
                label={mediaUrl ? "Clip · audio" : "Clip · transcript only"}
                failed={mediaFailed}
                onRetry={() => {
                  setMediaFailed(false);
                  setMediaKey((k) => k + 1);
                }}
              />
            </>
          )}
          <PlayerControls
            playing={playing}
            current={current}
            duration={len}
            onToggle={toggle}
            onSeek={seekInClip}
            rate={rate}
            onRate={cycleRate}
          />
        </div>

        <section className={styles.section} aria-label="Clip transcript">
          <div className={styles.sectionHead}>
            <h2 className={styles.overline}>Transcript</h2>
            <Button size="sm" variant="ghost" icon="link" onClick={copyLink}>
              Copy link
            </Button>
          </div>
          <div className={styles.lines}>
            {segments.map((seg, i) => {
              const prev = segments[i - 1];
              return (
                <TranscriptLine
                  key={seg.id}
                  segment={seg}
                  speaker={speakers.find((s) => s.id === seg.speaker_id)}
                  color={speakerColor(speakers, seg.speaker_id)}
                  showSpeaker={!prev || prev.speaker_id !== seg.speaker_id}
                  active={i === activeIndex}
                  onSeek={seekAbs}
                />
              );
            })}
          </div>
        </section>

        <p className={styles.footer}>
          Recorded with Fathom AI. No bot joins the call.{" "}
          <Link href={`/m/${encodeURIComponent(meeting.id)}?t=${start}`}>Open the full meeting</Link>
        </p>
      </main>

      {toast ? (
        <div className={hl.toastSlot}>
          <div>
            <Toast tone={toast.tone} title={toast.title} onClose={() => setToast(null)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 56px header: wordmark left, link right (to the full meeting when known). */
export function ClipHeader({ meetingHref }: { meetingHref?: string }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.wordmark}>
        Fathom AI
      </Link>
      {meetingHref ? (
        <Link href={meetingHref} className={styles.headerLink}>
          Full meeting
          <Icon name="arrow-up-right" size={15} />
        </Link>
      ) : (
        <Link href="/" className={styles.headerLink}>
          All meetings
        </Link>
      )}
    </header>
  );
}

export default ClipView;
