-- SEC-2: highlights and clips were still insert `with check (true)` / `(public)` from 0001.
-- Same least-privilege model as 0002 (SECURITY.md): public read, narrow inserts, no update,
-- no delete. "Existing meeting" and its length come from public.meeting_length (0004): a seeded
-- id or a ready upload; ranges must sit inside it (1 s slack, as lib/ranges END_SLACK_S).

-- Only select + insert, re-asserted (0001 never granted update/delete; keep it that way).
revoke update, delete, truncate on public.highlights, public.clips from anon, authenticated;

-- ---------------------------------------------------------------- highlights

drop policy if exists "insert highlights" on public.highlights;
create policy "insert highlights of ready meetings" on public.highlights for insert to anon, authenticated
  with check (
    id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and start_s >= 0
    and end_s > start_s
    and end_s <= public.meeting_length(meeting_id) + 1
    and char_length(note) <= 500
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  );

-- ---------------------------------------------------------------- clips

drop policy if exists "insert clips" on public.clips;
create policy "insert clips of ready meetings" on public.clips for insert to anon, authenticated
  with check (
    public
    and id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and start_s >= 0
    and end_s > start_s
    and end_s - start_s <= 600
    and end_s <= public.meeting_length(meeting_id) + 1
    and char_length(title) between 1 and 200
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  );
