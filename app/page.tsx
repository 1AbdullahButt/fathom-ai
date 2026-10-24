import { MeetingRow } from "@/components/meeting/MeetingRow";
import { AppShell } from "@/components/shell/AppShell";
import { StateBlock } from "@/components/ui/StateBlock";
import { RecordButton } from "@/components/upload/RecordButton";
import { UploadButton } from "@/components/upload/UploadButton";
import { listMeetings } from "@/lib/data";
import styles from "./page.module.css";

// Uploads change the list, so never serve a prerendered copy.
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  // Newest first; the sort is stable, so same-day uploads stay ahead of seeded meetings.
  const meetings = [...(await listMeetings())].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppShell>
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Meetings</h1>
            <p className={styles.subtitle}>Uploaded recordings, never with a bot in the call.</p>
          </div>
          <div className={styles.actions}>
            <UploadButton />
            <RecordButton />
          </div>
        </div>
        {meetings.length ? (
          <ul className={styles.list}>
            {meetings.map((m) => (
              <li key={m.id}>
                <MeetingRow meeting={m} />
              </li>
            ))}
          </ul>
        ) : (
          <StateBlock
            kind="empty"
            title="No meetings yet"
            body="Upload a recording you already have and we’ll transcribe it. No bot ever joins your meetings."
          />
        )}
      </main>
    </AppShell>
  );
}
