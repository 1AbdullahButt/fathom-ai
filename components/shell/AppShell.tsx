import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./AppShell.module.css";

export const APP_NAME = "Fathom AI";

/** Desktop: 232px sidebar + main column. Phone (<=760px): 52px top bar, no sidebar. */
export function AppShell({ children, current = "meetings" }: { children: ReactNode; current?: "meetings" | "search" }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Link href="/" className={styles.wordmark}>
            {APP_NAME}
          </Link>
        </div>
        <nav className={styles.nav} aria-label="Main">
          <Link href="/" className={styles.navItem} aria-current={current === "meetings" ? "page" : undefined}>
            <Icon name="list" size={17} />
            Meetings
          </Link>
          <Link href="/search" className={styles.navItem} aria-current={current === "search" ? "page" : undefined}>
            <Icon name="search" size={17} />
            Search
            <kbd className={styles.navKbd} aria-hidden="true">
              /
            </kbd>
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
          <Link href="/search" className={styles.phoneSearch} aria-label="Search meetings">
            <Icon name="search" size={19} />
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
