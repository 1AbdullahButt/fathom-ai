"use client";

import { ClipHeader } from "@/components/clip/ClipView";
import { Button } from "@/components/ui/Button";
import { StateBlock } from "@/components/ui/StateBlock";
import styles from "@/components/clip/ClipPage.module.css";

export default function ClipError({ reset }: { error: Error; reset(): void }) {
  return (
    <div className={styles.root}>
      <ClipHeader />
      <main className={styles.centered}>
        <StateBlock
          kind="error"
          title="We couldn’t play this clip"
          body="The clip still exists — try again in a moment."
          actions={
            <Button variant="primary" icon="refresh-cw" onClick={reset}>
              Try again
            </Button>
          }
        />
      </main>
    </div>
  );
}
