"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AskResponse } from "@/app/api/ask/route";
import { QuoteChip } from "@/components/meeting/QuoteChip";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { MAX_QUESTION_CHARS } from "@/lib/ask";
import styles from "./AskBox.module.css";

type State =
  | { kind: "idle" }
  | { kind: "loading"; question: string }
  | { kind: "answer"; question: string; data: AskResponse }
  | { kind: "error"; question: string; message: string };

/**
 * "Ask across meetings" (PLAN.md P2-4, design/screens.md §5): one question, an answer whose every
 * sentence carries the quotes it came from, or a plain "not found" when nothing said supports it.
 */
export function AskBox() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const submit = async () => {
    const q = question.replace(/\s+/g, " ").trim();
    if (!q || state.kind === "loading") return;
    setState({ kind: "loading", question: q });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = (await res.json().catch(() => null)) as (AskResponse & { error?: string }) | null;
      if (!res.ok || !json || json.error) {
        setState({ kind: "error", question: q, message: json?.error ?? "We couldn’t answer that right now. Try again in a moment." });
        return;
      }
      setState({ kind: "answer", question: q, data: json });
    } catch {
      setState({ kind: "error", question: q, message: "You seem to be offline. Check your connection and try again." });
    }
  };

  return (
    <section className={styles.card} aria-labelledby="ask-title">
      <h2 id="ask-title" className={styles.heading}>
        <Icon name="circle-help" size={15} color="var(--accent)" />
        Ask across meetings
      </h2>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className={styles.input}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={MAX_QUESTION_CHARS}
          placeholder="Ask a question, e.g. What did Omar commit to?"
          aria-label="Ask a question across your meetings"
          autoComplete="off"
        />
        <Button type="submit" variant="primary" loading={state.kind === "loading"} disabled={!question.trim()}>
          Ask
        </Button>
      </form>
      <p className={styles.note}>Answers come only from what was said, with the quotes they rely on.</p>

      <div aria-live="polite">
        {state.kind === "loading" ? (
          <div className={styles.result} aria-busy="true" aria-label="Finding an answer">
            <Skeleton lines={3} height={12} />
          </div>
        ) : null}

        {state.kind === "error" ? (
          <div className={styles.result} role="alert">
            <p className={styles.error}>
              <Icon name="circle-alert" size={15} color="var(--danger)" />
              {state.message}
            </p>
            <Button size="sm" onClick={() => void submit()}>
              Try again
            </Button>
          </div>
        ) : null}

        {state.kind === "answer" && !state.data.found ? (
          <div className={styles.result}>
            <p className={styles.notFound}>Not found in your meetings</p>
            <p className={styles.note}>Nothing said in your meetings answers “{state.question}”, so we didn’t guess.</p>
          </div>
        ) : null}

        {state.kind === "answer" && state.data.found ? (
          <ol className={`${styles.result} ${styles.claims}`} aria-label={`Answer to “${state.question}”`}>
            {state.data.claims.map((claim, i) => (
              <li key={i} className={styles.claim}>
                <p className={styles.claimText}>{claim.text}</p>
                <ul className={styles.quotes}>
                  {claim.citations.map((c) => {
                    const src = state.data.sources[c.segment_id];
                    if (!src) return null;
                    const color = src.speaker_index >= 0 ? `var(--spk-${(src.speaker_index % 8) + 1})` : "var(--ink-600)";
                    return (
                      <li key={c.segment_id}>
                        <span className={styles.meeting}>{src.meeting_title}</span>
                        <QuoteChip
                          segment={{
                            id: src.segment_id,
                            meeting_id: src.meeting_id,
                            start_s: src.start_s,
                            end_s: src.start_s,
                            speaker_id: "",
                            text: src.text,
                          }}
                          speaker={{ id: "", name: src.speaker }}
                          color={color}
                          onSeek={(s) => router.push(`/m/${encodeURIComponent(src.meeting_id)}?t=${Math.floor(s)}`)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
