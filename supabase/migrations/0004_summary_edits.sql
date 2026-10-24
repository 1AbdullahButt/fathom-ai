-- P2-3: inline edits of summary points, kept separate from the AI summary.
-- Summaries stay write-once (0002_security.sql). A human edit is an insert-only row in
-- summary_edits; on read the newest row per (meeting, template, point) replaces that point's
-- text and marks it edited_by_human. Evidence never changes: it is not stored here at all.
-- Action-item edits keep using the human-editable columns granted in 0002.
-- Same model as before (SECURITY.md): public read, narrow inserts, no update, no delete.

-- ---------------------------------------------------------------- meeting registry
-- Seeded meetings live in the repo JSON, not in public.meetings, so policies that need "an
-- existing meeting" (and its length) ask these functions. Seed lengths are
-- max(duration_s, last segment end), rounded up, from seed/meetings/*.json.

create or replace function public.seed_meeting_length(p_id text)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select v.len from (values
    ('m1', 100::double precision),
    ('m2', 80),
    ('ami-es2002a', 1273),
    ('ami-es2004a', 1050),
    ('ami-is1009a', 839),
    ('seattle-len-2025-03-13', 3356)
  ) as v(id, len)
  where v.id = p_id;
$$;

-- Length in seconds of a ready meeting (seeded or uploaded), null if it doesn't exist or is not
-- ready. Uploads: the longer of duration_s and the transcript end (lib/ranges meetingLength).
create or replace function public.meeting_length(p_id text)
returns double precision
language sql
stable
set search_path = ''
as $$
  select coalesce(
    public.seed_meeting_length(p_id),
    (select greatest(m.duration_s, coalesce((select max(s.end_s) from public.segments s where s.meeting_id = m.id), 0))
       from public.meetings m
      where m.id = p_id and m.status = 'ready')
  );
$$;

-- ---------------------------------------------------------------- summary_edits

create table public.summary_edits (
  id           bigint generated always as identity primary key,
  meeting_id   text not null check (char_length(meeting_id) <= 100),
  template     text not null check (template in ('general', 'sales', 'one_on_one')),
  point_index  integer not null check (point_index between 0 and 99),
  -- The human text: plain, 1..1000 characters (the API trims and strips control characters).
  text         text not null check (char_length(text) between 1 and 1000),
  -- The AI text this edit replaced. The edit only applies while the point still has this text,
  -- so a regenerated seed summary can't show an edit on a different point.
  ai_text      text not null check (char_length(ai_text) <= 4000),
  created_at   timestamptz not null default now()
);
create index summary_edits_meeting_idx on public.summary_edits (meeting_id, template, point_index, created_at);

revoke all on public.summary_edits from anon, authenticated;
grant select on public.summary_edits to anon, authenticated;
grant insert (meeting_id, template, point_index, text, ai_text, created_at) on public.summary_edits to anon, authenticated;

alter table public.summary_edits enable row level security;

create policy "public read" on public.summary_edits for select to anon, authenticated using (true);

create policy "insert edits of ready meetings" on public.summary_edits for insert to anon, authenticated
  with check (
    public.meeting_length(meeting_id) is not null
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  );

-- no update or delete grants/policies: edits are append-only, newest wins.
