/** "m:ss" under an hour, "h:mm:ss" from one hour up. Fractional seconds are floored. */
export function formatTimestamp(s: number): string {
  const total = Math.max(0, Math.floor(s));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** "Mon 2 Nov" for an ISO date (YYYY-MM-DD, read as a calendar day, not a local time). Unparseable input is returned as is. */
export function formatDueDate(iso: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const dayMonth = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${weekday} ${dayMonth}`;
}

/**
 * A length (meeting, clip, highlight): the one rule for every total shown in the app.
 * Floors to the whole second, like the player clock, so a 3354.3 s file and its 3355 s
 * record can never disagree by rounding direction.
 */
export function formatDuration(s: number): string {
  return formatTimestamp(Math.floor(s));
}

/**
 * The total the meeting page shows: the stored meeting length, unless the loaded media's own
 * duration is more than 1 s away from it (then the media is the truth for the scrubber).
 */
export function shownTotal(meetingLength: number, mediaDuration: number): number {
  return mediaDuration > 0 && Math.abs(mediaDuration - meetingLength) > 1 ? mediaDuration : meetingLength;
}
