-- P2-2: chapters of uploaded meetings. Seeded meetings keep theirs in the repo JSON.
-- Same least-privilege model as 0002_security.sql (SECURITY.md): public read, insert-only
-- while the meeting is still processing, no update, no delete.

create table public.chapters (
  meeting_id  text not null references public.meetings (id) on delete cascade,
  position    integer not null check (position between 0 and 49),
  title       text not null check (char_length(title) between 1 and 200),
  start_s     double precision not null check (start_s >= 0 and start_s <= 4 * 3600),
  primary key (meeting_id, position)
);

revoke all on public.chapters from anon, authenticated;
grant select, insert on public.chapters to anon, authenticated;

alter table public.chapters enable row level security;

create policy "public read" on public.chapters for select to anon, authenticated using (true);

create policy "insert chapters of processing uploads" on public.chapters for insert to anon, authenticated
  with check (
    exists (select 1 from public.meetings m where m.id = meeting_id and m.status = 'processing')
  );
