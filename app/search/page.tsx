import type { Metadata } from "next";
import Link from "next/link";
import { formatMeetingDate } from "@/components/meeting/MeetingRow";
import { AskBox } from "@/components/search/AskBox";
import { markMatch } from "@/components/search/markMatch";
import { SearchBox } from "@/components/search/SearchBox";
import { AppShell } from "@/components/shell/AppShell";
import { StateBlock } from "@/components/ui/StateBlock";
import { listCorpus } from "@/lib/data";
import { searchMeetings, type SearchHit } from "@/lib/search";
import { formatTimestamp } from "@/lib/time";
import type { Meeting, Segment } from "@/lib/types";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Search · Fathom AI" };

const MAX_HITS = 50;

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface Group {
  meeting: Meeting;
  titleHit: boolean;
  lines: { hit: SearchHit; segment: Segment | undefined }[];
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "es"}`;
}

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 200);

  return (
    <AppShell current="search">
      <main className={styles.main}>
        <h1 className={styles.title}>Search</h1>
        <SearchBox key={q} defaultValue={q} size="lg" autoFocus={!q} />
        <AskBox />
        {q ? <Results q={q} /> : <p className={styles.hint}>Search every word said in every meeting.</p>}
      </main>
    </AppShell>
  );
}

async function Results({ q }: { q: string }) {
  let corpus: Awaited<ReturnType<typeof listCorpus>>;
  try {
    corpus = await listCorpus();
  } catch {
    return (
      <StateBlock
        kind="error"
        title="Search isn’t working right now. Your meetings are safe."
        actions={
          <Link href={`/search?q=${encodeURIComponent(q)}`} className={styles.button}>
            Try again
          </Link>
        }
      />
    );
  }

  const all = searchMeetings(q, corpus);
  if (all.length === 0) {
    return (
      <StateBlock
        kind="noResults"
        title={`No meeting mentions “${q}”`}
        body="Search covers meeting titles and every word in their transcripts."
        actions={
          <Link href="/search" className={styles.button}>
            Clear search
          </Link>
        }
      />
    );
  }

  const byId = new Map(corpus.map((c) => [c.meeting.id, c]));
  const groups = new Map<string, Group>();
  for (const hit of all.slice(0, MAX_HITS)) {
    const entry = byId.get(hit.meeting_id);
    if (!entry) continue;
    let g = groups.get(hit.meeting_id);
    if (!g) {
      g = { meeting: entry.meeting, titleHit: false, lines: [] };
      groups.set(hit.meeting_id, g);
    }
    if (hit.segment_id === null) g.titleHit = true;
    else g.lines.push({ hit, segment: entry.segments.find((s) => s.id === hit.segment_id) });
  }
  const meetingCount = new Set(all.map((h) => h.meeting_id)).size;

  return (
    <section aria-label="Search results" className={styles.results}>
      <p className={styles.count}>
        {plural(all.length, "match")} in {meetingCount} meeting{meetingCount === 1 ? "" : "s"}
        {all.length > MAX_HITS ? ` · Showing first ${MAX_HITS}` : ""}
      </p>
      {[...groups.values()].map((g) => (
        <div key={g.meeting.id} className={styles.group}>
          <Link href={`/m/${g.meeting.id}`} className={styles.meeting}>
            <span className={styles.meetingTitle}>{markMatch(g.meeting.title, q)}</span>
            <span className={styles.meetingDate}>{formatMeetingDate(g.meeting.date)}</span>
          </Link>
          {g.lines.length > 0 ? (
            <ul className={styles.lines}>
              {g.lines.map(({ hit, segment }) => {
                const idx = g.meeting.speakers.findIndex((s) => s.id === segment?.speaker_id);
                const name = idx >= 0 ? g.meeting.speakers[idx].name : "Unknown speaker";
                const color = idx >= 0 ? `var(--spk-${(idx % 8) + 1})` : "var(--ink-600)";
                return (
                  <li key={hit.segment_id}>
                    <Link href={`/m/${g.meeting.id}?t=${hit.start_s}`} className={styles.line}>
                      <span className={styles.ts}>{formatTimestamp(hit.start_s)}</span>
                      <span className={styles.speaker} style={{ color }}>
                        <span className={styles.dot} style={{ background: color }} aria-hidden="true" />
                        {name}
                      </span>
                      <span className={styles.snippet}>{markMatch(hit.snippet, q)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  );
}
