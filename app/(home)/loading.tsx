import { AppShell } from "@/components/shell/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import styles from "./page.module.css";

const WIDTHS = ["52%", "38%", "61%", "44%", "33%"];

/** ListSkeleton (design/screens.md): 5 rows, 40px tile + two bars, while the list loads. */
export default function Loading() {
  return (
    <AppShell>
      <main className={styles.main} aria-busy="true" aria-label="Loading meetings">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Meetings</h1>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {WIDTHS.map((w) => (
            <div key={w} style={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: 14, padding: "14px 16px" }}>
              <Skeleton width={40} height={40} radius="var(--radius-sm)" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 3 }}>
                <Skeleton width={w} height={13} />
                <Skeleton width="28%" height={10} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
