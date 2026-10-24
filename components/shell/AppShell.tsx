import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./AppShell.module.css";

export const APP_NAME = "Fathom AI";

/** Desktop: 232px sidebar + main column. Phone (<=760px): 52px top bar, no sidebar. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Link href="/" className={styles.wordmark}>
            {APP_NAME}
          </Link>
        </div>
        <nav className={styles.nav} aria-label="Main">
          <Link href="/" className={styles.navItem} aria-current="page">
            <Icon name="list" size={17} />
            Meetings
          </Link>
        </nav>
        <div className={styles.spacer} />
        <div className={styles.note}>
          <span className={styles.noteTitle}>
            <Icon name="mic" size={14} />
            No bot joins your calls
          </span>
          <span className={styles.noteBody}>We work from a recording you upload.</span>
        </div>
      </aside>
      <div className={styles.column}>
        <header className={styles.phoneBar}>
          <Link href="/" className={styles.wordmark}>
            {APP_NAME}
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
