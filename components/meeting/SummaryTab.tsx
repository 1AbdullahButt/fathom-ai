"use client";

import { useState } from "react";
import type { Segment, Speaker, Summary, Template } from "@/lib/types";
import { sendEdit } from "@/lib/edits";
import { TEMPLATE_LABELS, TEMPLATES } from "@/lib/templates";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateBlock } from "@/components/ui/StateBlock";
import { SummaryPoint } from "./SummaryPoint";

export interface SummaryTabProps {
  meetingId: string;
  /** Summaries already saved (seeded / precomputed / generated earlier). */
  initial: Partial<Record<Template, Summary>>;
  /** Points can be edited inline (P2-3); false while the meeting isn't ready. */
  editable?: boolean;
  segments: Segment[];
  speakers: Speaker[];
  onSeek(s: number): void;
  activeId?: string;
}

type Status = "loading" | { error: string };

const OPTIONS = TEMPLATES.map((t) => ({ value: t, label: TEMPLATE_LABELS[t] }));

/**
 * Summary tab with the template switcher (PLAN.md P1-1, SPEC A4). Summaries are cached per
 * meeting in memory for the life of the page: a template seen once swaps back instantly.
 * A template with no saved summary is generated once by POST /api/meetings/[id]/summary.
 */
export function SummaryTab({ meetingId, initial, editable = false, segments, speakers, onSeek, activeId }: SummaryTabProps) {
  const [template, setTemplate] = useState<Template>("general");
  const [cache, setCache] = useState<Partial<Record<Template, Summary>>>(initial);
  const [status, setStatus] = useState<Partial<Record<Template, Status>>>({});

  const load = async (t: Template) => {
    setStatus((s) => ({ ...s, [t]: "loading" }));
    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/summary?template=${t}`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { summary?: Summary; error?: string };
      if (!res.ok || !body.summary) throw new Error(body.error || "Writing this summary failed.");
      const summary = body.summary;
      setCache((c) => ({ ...c, [t]: summary }));
      setStatus((s) => ({ ...s, [t]: undefined }));
    } catch (e) {
      const msg = e instanceof Error && e.message !== "Failed to fetch" ? e.message : "We couldn’t reach the server.";
      setStatus((s) => ({ ...s, [t]: { error: msg } }));
    }
  };

  /** Inline edit of one point: the server stores it beside the AI summary and returns the result. */
  const savePoint = async (t: Template, index: number, text: string): Promise<string | null> => {
    const r = await sendEdit<{ summary?: Summary }>(meetingId, { kind: "summary_point", template: t, index, text });
    if (!r.ok) return r.error;
    const saved = r.data.summary;
    if (saved) setCache((c) => ({ ...c, [t]: saved }));
    return null;
  };

  const change = (v: string) => {
    const t = v as Template;
    setTemplate(t);
    // General comes with the meeting; never generated here (it is written when the meeting is processed).
    if (t !== "general" && !cache[t] && status[t] !== "loading") void load(t);
  };

  const summary = cache[template];
  const st = status[template];
  const points = summary?.points ?? [];

  let body;
  if (summary) {
    body = points.length ? (
      <div style={{ paddingTop: 8 }}>
        {points.map((p, i) => (
          <SummaryPoint
            key={i}
            point={p}
            segments={segments}
            speakers={speakers}
            onSeek={onSeek}
            activeId={activeId}
            onSave={editable ? (text) => savePoint(template, i, text) : undefined}
          />
        ))}
      </div>
    ) : (
      <StateBlock
        compact
        kind="empty"
        icon="file-text"
        title="Nothing to summarise for this template"
        body="The meeting didn’t cover what this template looks for, so we didn’t invent anything."
      />
    );
  } else if (st === "loading") {
    body = (
      <div aria-busy="true" aria-label={`Writing the ${TEMPLATE_LABELS[template]} summary`} style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 22 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton lines={2} height={11} />
            <Skeleton height={28} radius="var(--radius-sm)" width="40%" />
          </div>
        ))}
      </div>
    );
  } else if (st) {
    body = (
      <StateBlock
        compact
        kind="error"
        title="We couldn’t write this summary"
        body={st.error}
        actions={
          <Button size="sm" variant="primary" icon="refresh-cw" onClick={() => void load(template)}>
            Try again
          </Button>
        }
      />
    );
  } else {
    body = (
      <StateBlock
        compact
        kind="empty"
        icon="file-text"
        title="Summary not generated yet"
        body="The summary for this meeting hasn’t been written yet. The transcript is ready to read and play."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 14 }}>
        <Select size="sm" label="Template" icon="layout-template" value={template} onChange={change} options={OPTIONS} />
        {points.length ? <Legend /> : null}
      </div>
      {body}
    </div>
  );
}

/** Which text is whose (design: MeetingPanel Legend): sans "Aa" AI-written, serif "Aa" edited by a person. */
function Legend() {
  return (
    <p style={{ margin: 0, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 12px", font: "400 12px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
      <span>
        <span aria-hidden="true" style={{ font: "500 13px/1 var(--font-sans)", color: "var(--text-1)", marginRight: 4 }}>
          Aa
        </span>
        AI-written
      </span>
      <span>
        <span aria-hidden="true" style={{ font: "400 14px/1 var(--font-serif)", color: "var(--human-text)", marginRight: 4 }}>
          Aa
        </span>
        Edited by a person
      </span>
    </p>
  );
}

export default SummaryTab;
