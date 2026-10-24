import { ClipHeader } from "@/components/clip/ClipView";
import { Skeleton } from "@/components/ui/Skeleton";
import styles from "@/components/clip/ClipPage.module.css";
import meetingStyles from "@/components/meeting/MeetingView.module.css";

/** Clip page loading (design/screens.md §4): title/meta skeletons, night block, 3 lines. */
export default function Loading() {
  return (
    <div className={styles.root} aria-busy="true" aria-label="Loading clip">
      <ClipHeader />
      <main className={styles.main}>
        <div className={styles.intro}>
          <Skeleton width="55%" height={28} radius="var(--radius-sm)" />
          <Skeleton width="35%" height={12} />
        </div>
        <div className={styles.player}>
          <div className={meetingStyles.stage} style={{ cursor: "default" }} />
        </div>
        <Skeleton lines={3} height={12} />
      </main>
    </div>
  );
}
