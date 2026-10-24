import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ClipView } from "@/components/clip/ClipView";
import { getClip, getMeeting } from "@/lib/data";
import { meetingLength, segmentsInRange } from "@/lib/ranges";
import { formatTimestamp } from "@/lib/time";

// Public clip page (PLAN.md P1-4, SPEC A6): no sign-in, plays only the clip's range.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

/** Clip + its meeting, or null when either is unknown. Errors (store down) propagate to error.tsx. */
const load = cache(async (id: string) => {
  if (!id || id.length > 100) return null;
  const clip = await getClip(id);
  if (!clip) return null;
  const bundle = await getMeeting(clip.meeting_id);
  if (!bundle) return null;
  const segments = segmentsInRange(
    [...bundle.segments].sort((a, b) => a.start_s - b.start_s),
    clip.start_s,
    clip.end_s,
  );
  return { clip, meeting: bundle.meeting, segments, length: meetingLength(bundle.meeting.duration_s, bundle.segments) };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await load(id).catch(() => null);
  if (!data) return { title: "Clip not available · Fathom AI", robots: { index: false } };
  const { clip, meeting, segments } = data;
  const range = `${formatTimestamp(clip.start_s)}–${formatTimestamp(clip.end_s)}`;
  const quote = segments.map((s) => s.text).join(" ");
  const short = quote.length > 160 ? `${quote.slice(0, 157).trimEnd()}…` : quote;
  const description = `From “${meeting.title}” (${range}).${short ? ` “${short}”` : ""}`;
  return {
    title: `${clip.title} · Fathom AI`,
    description,
    openGraph: { title: clip.title, description, type: "video.other", siteName: "Fathom AI" },
    twitter: { card: "summary", title: clip.title, description },
  };
}

export default async function ClipPage({ params }: Props) {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();
  return <ClipView clip={data.clip} meeting={data.meeting} segments={data.segments} meetingLength={data.length} />;
}
