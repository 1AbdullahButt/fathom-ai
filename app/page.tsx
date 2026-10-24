import { MeetingList } from "@/components/meeting/MeetingList";
import { AppShell } from "@/components/shell/AppShell";
import { RecordButton } from "@/components/upload/RecordButton";
import { UploadButton } from "@/components/upload/UploadButton";
import { UploadsProvider } from "@/components/upload/UploadsProvider";
import { listMeetings } from "@/lib/data";
import styles from "./page.module.css";

// Uploads change the list, so never serve a prerendered copy.
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  // Newest first; the sort is stable, so same-day uploads stay ahead of seeded meetings.
  const meetings = [...(await listMeetings())].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppShell>
      <UploadsProvider>
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
          <MeetingList meetings={meetings} listClassName={styles.list} />
        </main>
      </UploadsProvider>
    </AppShell>
  );
}
