"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { MeetingBundle } from "@/lib/data";
import type { Speaker } from "@/lib/types";
import { formatTimestamp } from "@/lib/time";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { usePlayback } from "@/lib/usePlayback";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StateBlock } from "@/components/ui/StateBlock";
import { Tabs } from "@/components/ui/Tabs";
import { ActionItem } from "./ActionItem";
import { formatMeetingDate } from "./MeetingRow";
import { PlayerControls } from "./PlayerControls";
import { speakerColor } from "./QuoteChip";
import { SummaryTab } from "./SummaryTab";
import { Transcript } from "./Transcript";
import styles from "./MeetingView.module.css";

type PanelTab = "summary" | "actions" | "highlights";
type PhoneTab = "transcript" | "summary" | "actions";

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|$)/i;
/** Seeking to a segment start may land a few ms early (media frame granularity). */
const EPS = 0.05;

export interface MeetingViewProps {
  bundle: MeetingBundle;
  /** `?t=<seconds>` from search: seek there on load. */
  initialTime?: number;
}

export function MeetingView({ bundle, initialTime = 0 }: MeetingViewProps) {
  const { meeting } = bundle;
  const segments = useMemo(() => [...bundle.segments].sort((a, b) => a.start_s - b.start_s), [bundle.segments]);
  const speakers = meeting.speakers;
  const duration = Math.max(meeting.duration_s, segments.at(-1)?.end_s ?? 0);

  const [mediaFailed, setMediaFailed] = useState(false);
  const [mediaKey, setMediaKey] = useState(0);
  const mediaUrl = mediaFailed ? null : meeting.media_url;
  const isVideo = !!mediaUrl && VIDEO_EXT.test(mediaUrl);

  const { time, playing, rate, duration: total, seek, play, toggle, cycleRate, attachMedia } = usePlayback(duration, initialTime);

  const [follow, setFollow] = useState(true);
  const [jumpKey, setJumpKey] = useState(0);
  const [tab, setTab] = useState<PanelTab>("summary");
  const [phoneTab, setPhoneTab] = useState<PhoneTab>("transcript");

  // `?t=` (search jump): the clock already starts at t and the transcript places that line on
  // mount; also start playing. If the browser blocks autoplay, play() fails quietly and the
  // page stays paused with the line in view.
  useEffect(() => {
    if (initialTime > 0) play();
    // Once, on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeIndex = useMemo(() => activeAt(segments, time), [segments, time]);
  const active = activeIndex >= 0 ? segments[activeIndex] : undefined;
  // Before the first line starts, the stage shows the first speaker and line (no dark empty block).
  const staged = active ?? segments[0];
  const stagedSpeaker = staged ? speakers.find((s) => s.id === staged.speaker_id) : undefined;

  /** Transcript line / scrubber: seek without changing play state, follow again. */
  const seekOnly = useCallback(
    (s: number) => {
      seek(s);
      setFollow(true);
    },
    [seek],
  );

  /** Quote chip: seek, play, re-centre the transcript, follow again (core moment, A2/A3). */
  const jump = useCallback(
    (s: number) => {
      seek(s);
      play();
      setFollow(true);
      setJumpKey((k) => k + 1);
      setPhoneTab("transcript");
    },
    [seek, play],
  );

  const onPhoneTab = (id: string) => {
    const next = id as PhoneTab;
    setPhoneTab(next);
    if (next !== "transcript") setTab(next);
  };

  return (
    <div className={styles.root} data-phone-tab={phoneTab}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.back} aria-label="Back to meetings">
          <Icon name="arrow-left" size={17} />
          <span className={styles.backLabel}>Meetings</span>
        </Link>
        <span className={styles.divider} />
        <div className={styles.heading}>
          <h1 className={styles.title}>{meeting.title}</h1>
          <span className={styles.meta}>
            {formatMeetingDate(meeting.date)}
            <span aria-hidden="true">·</span>
            <span className={styles.mono}>{formatTimestamp(duration)}</span>
            <span aria-hidden="true">·</span>
            {speakers.length} {speakers.length === 1 ? "speaker" : "speakers"}
            {meeting.source === "upload" ? (
              <Badge size="sm" tone="outline" icon="upload">
                Uploaded
              </Badge>
            ) : (
              <Badge size="sm" tone="outline">
                Sample
              </Badge>
            )}
          </span>
        </div>
      </header>

      <div className={styles.grid}>
        <LeftColumn speakers={speakers} chapters={bundle.chapters} activeSpeakerId={active?.speaker_id} onSeek={seekOnly} />

        <section className={styles.centre} aria-label="Recording and transcript">
          <div className={styles.player}>
            {mediaUrl && isVideo ? (
              <div className={styles.stage} style={{ cursor: "default" }}>
                <video
                  key={mediaKey}
                  ref={attachMedia}
                  className={styles.video}
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
                  atStart={time <= EPS}
                  onToggle={toggle}
                  label={mediaUrl ? "Audio · speaker view" : "Transcript only · speaker view"}
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
              current={time}
              duration={total}
              onToggle={toggle}
              onSeek={seekOnly}
              rate={rate}
              onRate={cycleRate}
            />
          </div>

          <div className={styles.phoneTabs}>
            <Tabs
              fill
              size="sm"
              label="Meeting views"
              value={phoneTab}
              onChange={onPhoneTab}
              tabs={[
                { id: "transcript", label: "Transcript" },
                { id: "summary", label: "Summary" },
                { id: "actions", label: "Actions" },
              ]}
            />
          </div>

          <div className={styles.transcriptPane}>
            <Transcript
              segments={segments}
              speakers={speakers}
              activeIndex={activeIndex}
              onSeek={seekOnly}
              follow={follow}
              onFollowChange={setFollow}
              jumpKey={jumpKey}
            />
          </div>
        </section>

        <SidePanel bundle={bundle} segments={segments} tab={tab} onTab={setTab} onSeek={jump} activeId={active?.id} />
      </div>
    </div>
  );
}

/** Index of the segment playing at `t`: the last one that has started. -1 before the first line. */
export function activeAt(segments: { start_s: number }[], t: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start_s <= t + EPS) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

// ---------------------------------------------------------------- stage

function Stage({
  speaker,
  color,
  caption,
  playing,
  atStart,
  onToggle,
  label,
  failed,
  onRetry,
}: {
  speaker: Speaker | undefined;
  color: string;
  caption: string | undefined;
  playing: boolean;
  atStart: boolean;
  onToggle(): void;
  label: string;
  failed: boolean;
  onRetry(): void;
}) {
  const phone = useMediaQuery("(max-width: 759px)");
  if (failed) {
    return (
      <div className={styles.stage} style={{ cursor: "default" }}>
        <div className={styles.mediaError} role="alert">
          We couldn’t load the recording. The transcript and notes are below.
          <Button size="sm" variant="player" icon="refresh-cw" onClick={onRetry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.stage} onClick={onToggle}>
      <span className={styles.stageBadge}>
        <Badge tone="dark" size="sm" icon="audio-lines">
          {label}
        </Badge>
      </span>
      {!playing ? (
        <span className={styles.paused}>
          <Icon name="pause" size={12} />
          Paused
        </span>
      ) : null}
      {speaker ? (
        <div className={styles.stageSpeaker}>
          <Avatar
            name={speaker.name}
            color={color}
            size={phone ? 44 : 72}
            speaking={playing}
            style={{ boxShadow: playing ? `0 0 0 3px var(--night-950), 0 0 0 5px ${color}` : "none" }}
          />
          <span>{speaker.name}</span>
          {!playing && atStart ? (
            // Same action as the stage click and the Play control; that control is the accessible one.
            <span className={styles.stagePlay} aria-hidden="true">
              <Icon name="play" size={22} />
            </span>
          ) : null}
        </div>
      ) : null}
      {caption ? (
        <div className={styles.caption} title={caption}>
          <span className={styles.captionText}>{caption}</span>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- left column (wide only)

const LeftColumn = memo(function LeftColumn({
  speakers,
  chapters,
  activeSpeakerId,
  onSeek,
}: {
  speakers: Speaker[];
  chapters: MeetingBundle["chapters"];
  activeSpeakerId: string | undefined;
  onSeek(s: number): void;
}) {
  return (
    <aside className={styles.left} aria-label="Chapters and speakers">
      {chapters.length ? (
        <div>
          <h2 className={styles.overline}>Chapters</h2>
          {chapters.map((c) => (
            <button key={`${c.start_s}-${c.title}`} type="button" className={styles.chapterBtn} onClick={() => onSeek(c.start_s)}>
              <span className={styles.mono} style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {formatTimestamp(c.start_s)}
              </span>
              <span>{c.title}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div>
        <h2 className={styles.overline}>Speakers</h2>
        <ul className={styles.speakerList}>
          {speakers.map((s) => {
            const speaking = s.id === activeSpeakerId;
            return (
              <li key={s.id} className={styles.speakerRow} data-speaking={speaking}>
                <span className={styles.speakerDot} style={{ background: speakerColor(speakers, s.id) }} />
                {s.name}
                {speaking ? <span className={styles.speakingTag}>Speaking</span> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
});

// ---------------------------------------------------------------- side panel

const SidePanel = memo(function SidePanel({
  bundle,
  segments,
  tab,
  onTab,
  onSeek,
  activeId,
}: {
  bundle: MeetingBundle;
  segments: MeetingBundle["segments"];
  tab: PanelTab;
  onTab(t: PanelTab): void;
  onSeek(s: number): void;
  activeId: string | undefined;
}) {
  const speakers = bundle.meeting.speakers;
  const summary = bundle.summaries.general;
  const items = bundle.action_items;
  const generated = !!summary || items.length > 0;
  const labels: Record<PanelTab, string> = { summary: "Summary", actions: "Action items", highlights: "Highlights" };

  let content;
  if (tab === "summary") {
    // Rendered below and kept mounted, so its per-meeting template cache survives tab switches.
    content = null;
  } else if (tab === "actions") {
    const toCheck = items.filter((a) => a.confidence === "low").length;
    const missing = items.filter((a) => !a.owner || !a.due).length;
    content = items.length ? (
      <>
        <p className={styles.panelMeta}>
          {items.length} {items.length === 1 ? "item" : "items"} · {toCheck} to check · {missing} missing an owner or date
        </p>
        {items.map((a) => (
          <div key={a.id} className={styles.actionRow}>
            <ActionItem item={a} segments={segments} speakers={speakers} onSeek={onSeek} activeId={activeId} />
          </div>
        ))}
      </>
    ) : generated ? (
      <StateBlock
        compact
        kind="empty"
        icon="list-checks"
        title="No action items were said"
        body="Nobody committed to a task out loud in this meeting, so we didn’t invent any."
      />
    ) : (
      <StateBlock
        compact
        kind="empty"
        icon="list-checks"
        title="Action items not generated yet"
        body="Action items appear here, each with the quote it came from, once the notes are generated."
      />
    );
  } else {
    content = (
      <StateBlock
        compact
        kind="empty"
        icon="bookmark"
        title="No highlights yet"
        body="Clip a moment while you listen. Each clip gets a public link that plays just that range."
      />
    );
  }

  return (
    <aside className={styles.panel} aria-label="Notes">
      <div className={styles.panelTabs}>
        <Tabs
          label="Notes"
          value={tab}
          onChange={(id) => onTab(id as PanelTab)}
          tabs={[
            { id: "summary", label: "Summary" },
            { id: "actions", label: "Action items", count: items.length || undefined },
            { id: "highlights", label: "Highlights" },
          ]}
        />
      </div>
      <div role="tabpanel" aria-label={labels[tab]} className={styles.panelBody}>
        <div hidden={tab !== "summary"}>
          <SummaryTab meetingId={bundle.meeting.id} initial={bundle.summaries} segments={segments} speakers={speakers} onSeek={onSeek} activeId={activeId} />
        </div>
        {content}
      </div>
    </aside>
  );
});

export default MeetingView;
