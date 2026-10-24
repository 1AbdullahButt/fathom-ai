"use client";

import { useEffect } from "react";
import { StateBlock } from "@/components/ui/StateBlock";
import { useUploads } from "@/components/upload/UploadsProvider";
import type { Meeting } from "@/lib/types";
import { MeetingRow } from "./MeetingRow";

/**
 * The meetings list. Server-rendered meetings plus uploads started in this tab (newest first);
 * processing rows update in place from UploadsProvider's polling, without a reload.
 */
export function MeetingList({ meetings, listClassName }: { meetings: Meeting[]; listClassName?: string }) {
  const { uploads, retry, track } = useUploads();

  useEffect(() => {
    for (const m of meetings) if (m.source === "upload" && m.status !== "ready") track(m);
  }, [meetings, track]);

  const known = new Set(meetings.map((m) => m.id));
  const fresh = Object.values(uploads)
    .filter((u) => !known.has(u.meeting.id))
    .map((u) => u.meeting)
    .reverse();
  const rows = [...fresh, ...meetings.map((m) => uploads[m.id]?.meeting ?? m)];

  if (!rows.length) {
    return (
      <StateBlock
        kind="empty"
        title="No meetings yet"
        body="Upload a recording you already have and we’ll transcribe it. No bot ever joins your meetings."
      />
    );
  }
  return (
    <ul className={listClassName}>
      {rows.map((m) => {
        const u = uploads[m.id];
        return (
          <li key={m.id}>
            <MeetingRow meeting={m} upload={u ? { stage: u.stage, progress: u.progress, error: u.error, onRetry: () => retry(m.id) } : undefined} />
          </li>
        );
      })}
    </ul>
  );
}

export default MeetingList;
