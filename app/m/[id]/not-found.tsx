import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { StateBlock } from "@/components/ui/StateBlock";
import styles from "./not-found.module.css";

export default function MeetingNotFound() {
  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.back}>
          <Icon name="arrow-left" size={17} />
          Meetings
        </Link>
      </header>
      <main className={styles.main}>
        <StateBlock
          kind="notFound"
          title="This meeting doesn’t exist"
          body="The link may be wrong, or the meeting was never uploaded here."
          actions={
            <Link href="/" className={styles.primary}>
              Back to meetings
            </Link>
          }
        />
      </main>
    </div>
  );
}
