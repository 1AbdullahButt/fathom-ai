import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import styles from "@/components/meeting/MeetingView.module.css";

/**
 * Meeting page loading state (design/screens.md): title/meta bars, night player block with a
 * centred Spinner, TranscriptSkeleton (5 rows), left column lines and PanelSkeleton.
 */
export default function Loading() {
  return (
    <div className={styles.root} data-phone-tab="transcript" aria-busy="true" aria-label="Loading meeting">
      <header className={styles.topBar}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
          <Skeleton width="40%" height={16} />
          <Skeleton width="22%" height={10} />
        </div>
      </header>
      <div className={styles.grid}>
        <aside className={styles.left}>
          <div style={{ padding: 10 }}>
            <Skeleton lines={7} height={12} gap={14} />
          </div>
        </aside>
        <section className={styles.centre}>
          <div className={styles.player}>
            <div className={styles.stage} style={{ cursor: "default" }}>
              <Spinner size={24} color="var(--paper-0)" label="Loading recording" />
            </div>
          </div>
          <div className={styles.transcriptPane}>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 22 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 12 }}>
                  <Skeleton width={36} height={10} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Skeleton width={110} height={10} />
                    <Skeleton lines={2} height={11} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className={styles.panel}>
          <div className={styles.panelBody}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 18 }}>
              <Skeleton width={180} height={28} radius="var(--radius-sm)" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Skeleton lines={2} height={11} />
                  <Skeleton height={48} radius="var(--radius-sm)" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
