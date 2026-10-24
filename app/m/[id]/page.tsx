import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MeetingView } from "@/components/meeting/MeetingView";
import { getMeeting } from "@/lib/data";

// Uploaded meetings change while they process; never serve a prerendered copy.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getMeeting(id);
  return { title: bundle ? `${bundle.meeting.title} · Fathom AI` : "Meeting not found · Fathom AI" };
}

export default async function MeetingPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const bundle = await getMeeting(id);
  if (!bundle) notFound();
  const t = Number(Array.isArray(query.t) ? query.t[0] : query.t);
  return <MeetingView bundle={bundle} initialTime={Number.isFinite(t) && t > 0 ? t : 0} />;
}
