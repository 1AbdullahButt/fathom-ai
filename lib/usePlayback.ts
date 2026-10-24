"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const RATES = [1, 1.5, 2, 0.75] as const;

export interface Playback {
  time: number;
  playing: boolean;
  rate: number;
  duration: number;
  seek(s: number): void;
  play(): void;
  pause(): void;
  toggle(): void;
  cycleRate(): void;
  /** Pass as `ref` to the <audio>/<video> element. Leave unattached for the simulated clock. */
  attachMedia(el: HTMLMediaElement | null): void;
}

const TICK_MS = 250;

/**
 * One playback clock for the meeting page. With a media element attached it mirrors the element
 * (timeupdate / play / pause); without one (transcript-only meetings, or media that failed to load)
 * it runs a simulated wall clock so play, seek and the active transcript line still work.
 * Playback always stops on unmount or when `sourceKey` (the meeting id) changes, so opening
 * another meeting, with or without ?t=, starts paused.
 */
export function usePlayback(duration: number, initialTime = 0, sourceKey?: string): Playback {
  const [time, setTime] = useState(() => clamp(initialTime, duration));
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [mediaDuration, setMediaDuration] = useState(0);
  /** The attached element lives in a ref (it is mutated: currentTime, playbackRate); `attached` re-runs effects. */
  const el = useRef<HTMLMediaElement | null>(null);
  const [attached, setAttached] = useState(0);
  const hasMedia = attached > 0;

  const total = mediaDuration > 0 ? mediaDuration : duration;
  const timeRef = useRef(time);
  const totalRef = useRef(total);
  useEffect(() => {
    timeRef.current = time;
    totalRef.current = total;
  }, [time, total]);
  /** A seek requested before the media knows its length; applied on loadedmetadata. */
  const pendingSeek = useRef<number | null>(initialTime > 0 ? initialTime : null);
  /** play() asked for before metadata: started after the pending seek, so it never plays from 0 first. */
  const pendingPlay = useRef(false);

  const attachMedia = useCallback((node: HTMLMediaElement | null) => {
    if (el.current === node) return;
    el.current = node;
    setAttached((n) => (node ? Math.abs(n) + 1 : -Math.abs(n)));
  }, []);

  // Mirror the media element.
  useEffect(() => {
    const media = el.current;
    if (!hasMedia || !media) return;
    const onTime = () => setTime(media.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onRate = () => setRate(media.playbackRate);
    const onMeta = () => {
      if (Number.isFinite(media.duration) && media.duration > 0) setMediaDuration(media.duration);
      if (pendingSeek.current != null) {
        media.currentTime = pendingSeek.current;
        pendingSeek.current = null;
      }
      if (pendingPlay.current) {
        pendingPlay.current = false;
        media.play().catch(() => setPlaying(false));
      }
    };
    media.addEventListener("timeupdate", onTime);
    media.addEventListener("seeked", onTime);
    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onPause);
    media.addEventListener("ended", onPause);
    media.addEventListener("ratechange", onRate);
    media.addEventListener("loadedmetadata", onMeta);
    if (media.readyState >= 1) onMeta();
    else if (timeRef.current > 0) pendingSeek.current = timeRef.current;
    if (!media.paused) onPlay();
    return () => {
      media.removeEventListener("timeupdate", onTime);
      media.removeEventListener("seeked", onTime);
      media.removeEventListener("play", onPlay);
      media.removeEventListener("pause", onPause);
      media.removeEventListener("ended", onPause);
      media.removeEventListener("ratechange", onRate);
      media.removeEventListener("loadedmetadata", onMeta);
      // Detached or unmounted (navigating to another meeting): stop the sound. A detached element
      // is not guaranteed to pause by itself, and its pause event would no longer reach us.
      pendingPlay.current = false;
      media.pause();
      setPlaying(false);
    };
  }, [hasMedia, attached]);

  // Another meeting in the same view (sourceKey changed) never inherits the old one's playback.
  useEffect(() => {
    return () => {
      pendingPlay.current = false;
      setPlaying(false);
    };
  }, [sourceKey]);

  // Simulated clock when there is no media element.
  useEffect(() => {
    if (hasMedia || !playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const next = timeRef.current + ((now - last) / 1000) * rate;
      last = now;
      if (next >= totalRef.current) {
        setTime(totalRef.current);
        setPlaying(false);
      } else {
        setTime(next);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [hasMedia, playing, rate]);

  const seek = useCallback(
    (s: number) => {
      const t = clamp(s, totalRef.current);
      timeRef.current = t;
      setTime(t);
      const media = el.current;
      if (media) {
        if (media.readyState >= 1) media.currentTime = t;
        else pendingSeek.current = t;
      }
    },
    [],
  );

  const play = useCallback(() => {
    if (timeRef.current >= totalRef.current) seek(0);
    const media = el.current;
    if (media && media.readyState < 1) {
      pendingPlay.current = true;
    } else if (media) {
      media.play().catch(() => setPlaying(false));
    } else {
      setPlaying(true);
    }
  }, [seek]);

  const pause = useCallback(() => {
    pendingPlay.current = false;
    if (el.current) el.current.pause();
    else setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, play, pause]);

  const cycleRate = useCallback(() => {
    const i = RATES.indexOf(rate as (typeof RATES)[number]);
    const next = RATES[(i + 1) % RATES.length];
    if (el.current) el.current.playbackRate = next;
    setRate(next);
  }, [rate]);

  return { time, playing, rate, duration: total, seek, play, pause, toggle, cycleRate, attachMedia };
}

function clamp(s: number, max: number): number {
  if (!Number.isFinite(s)) return 0;
  return Math.max(0, max > 0 ? Math.min(max, s) : s);
}
