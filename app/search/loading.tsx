import { AppShell } from "@/components/shell/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import styles from "./page.module.css";

const WIDTHS = ["52%", "38%", "61%", "44%", "33%"];

/** ListSkeleton (design/screens.md section 5) while search results load. */
export default function Loading() {
  return (
    <AppShell current="search">
      <main className={styles.main} aria-busy="true" aria-label="Loading search results">
        <h1 className={styles.title}>Search</h1>
        <Skeleton width="100%" height={44} radius="var(--radius-sm)" />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {WIDTHS.map((w) => (
            <div key={w} style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 12, padding: "10px 12px" }}>
              <Skeleton width={40} height={10} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton width="20%" height={10} />
                <Skeleton width={w} height={13} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
