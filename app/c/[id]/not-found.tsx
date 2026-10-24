import Link from "next/link";
import { ClipHeader } from "@/components/clip/ClipView";
import { StateBlock } from "@/components/ui/StateBlock";
import styles from "@/components/clip/ClipPage.module.css";

export default function ClipNotFound() {
  return (
    <div className={styles.root}>
      <ClipHeader />
      <main className={styles.centered}>
        <StateBlock
          kind="notFound"
          titleAsHeading
          title="This clip isn’t available"
          body="The link may have expired, or sharing was turned off. Ask for a new link."
          actions={
            <Link href="/" className={styles.primary}>
              Go to meetings
            </Link>
          }
        />
      </main>
    </div>
  );
}
