-- SEC-1: least privilege for the public, no-auth demo (SECURITY.md).
-- The server talks to Supabase with the publishable (anon) key, which is public by design, so
-- anyone can call PostgREST/Storage with exactly the rights the server has. Every grant and
-- policy below is therefore written as "what may an anonymous caller do", limited to the writes
-- the current code paths make. Nothing may be deleted (no delete grants or policies anywhere).

-- ---------------------------------------------------------------- meetings
-- Inserted by POST /api/uploads (status processing), then updated only by the pipeline:
-- media_url once, speakers/duration after transcription, status -> ready | error, and
-- error -> processing on Retry. Ready meetings are frozen; title is never updated.

revoke update on public.meetings from anon, authenticated;
grant update (status, duration_s, speakers, media_url, error) on public.meetings to anon, authenticated;

-- media_url may only point at this upload's own folder in this project's "uploads" bucket.
create or replace function public.is_own_media_url(meeting_id text, url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select url is null
      or url ~ ('^https://pcljaqoohcjtezjhupzp\.supabase\.co/storage/v1/object/public/uploads/'
                || meeting_id || '/[A-Za-z0-9_-]+\.[a-z0-9]{1,5}$');
$$;

drop policy if exists "insert uploads" on public.meetings;
create policy "insert uploads" on public.meetings for insert to anon, authenticated
  with check (
    id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and source = 'upload' and status = 'processing' and error is null
    and public.is_own_media_url(id, media_url)
  );

drop policy if exists "update uploads" on public.meetings;
create policy "update unfinished uploads" on public.meetings for update to anon, authenticated
  using (source = 'upload' and status in ('processing', 'error'))
  with check (source = 'upload' and public.is_own_media_url(id, media_url));

-- ---------------------------------------------------------------- segments
-- Insert-only, while the meeting is processing, with the pipeline's id scheme.

drop policy if exists "insert segments of processing uploads" on public.segments;
create policy "insert segments of processing uploads" on public.segments for insert to anon, authenticated
  with check (
    starts_with(id, meeting_id || '-s')
    and exists (select 1 from public.meetings m where m.id = meeting_id and m.status = 'processing')
  );

-- ---------------------------------------------------------------- summaries
-- Write-once per (meeting, template): the pipeline and the template switch insert with
-- ON CONFLICT DO NOTHING, so a saved summary (seeded overlay or upload) can't be overwritten.
-- P2-3 (inline edits) must add a points-only update grant + policy when it lands.

revoke update on public.summaries from anon, authenticated;
drop policy if exists "update summaries" on public.summaries;

drop policy if exists "insert summaries" on public.summaries;
create policy "insert summaries" on public.summaries for insert to anon, authenticated
  with check (jsonb_array_length(points) <= 100);

-- ---------------------------------------------------------------- action items
-- Inserted on extraction (and as the first-edit copy of a seeded item); afterwards only the
-- human-editable fields may change. id, meeting_id, evidence, confidence, position are fixed.

revoke update on public.action_items from anon, authenticated;
grant update (task, owner, due, due_phrase, edited_by_human) on public.action_items to anon, authenticated;

drop policy if exists "insert action items" on public.action_items;
create policy "insert action items" on public.action_items for insert to anon, authenticated
  with check (jsonb_array_length(evidence) <= 50);

-- ---------------------------------------------------------------- upload_log (rate limits)
-- Not public data: no reads. The server counts through a narrow function instead, so the
-- (salted) client hashes can't be listed. Inserts must look like a server-computed hash and
-- carry the current time (no back/forward-dated rows to poison someone's limit).

revoke select on public.upload_log from anon, authenticated;
drop policy if exists "public read" on public.upload_log;

drop policy if exists "insert upload log" on public.upload_log;
create policy "insert upload log" on public.upload_log for insert to anon, authenticated
  with check (
    ip_hash ~ '^([a-z]+:)?[0-9a-f]{64}$'
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  );

create or replace function public.count_upload_log(p_ip_hash text, p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.upload_log
  where ip_hash = p_ip_hash and created_at >= greatest(p_since, now() - interval '1 day');
$$;
revoke all on function public.count_upload_log(text, timestamptz) from public;
grant execute on function public.count_upload_log(text, timestamptz) to anon, authenticated;

-- ---------------------------------------------------------------- storage
-- Insert-only (no select/update/delete policies: no listing, no overwrite, no delete) into
-- <meeting id>/<safe filename> of a meeting that is still processing. The bucket enforces
-- audio/video MIME types and the 200 MB limit on every upload, signed or not.

update storage.buckets set
  public = true,
  file_size_limit = 209715200,
  allowed_mime_types = array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
    'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-flac',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg']
where id = 'uploads';

drop policy if exists "anon upload to uploads" on storage.objects;
create policy "anon upload to processing meeting folder" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'uploads'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-]+\.[a-z0-9]{1,5}$'
    and exists (
      select 1 from public.meetings m
      where m.id = split_part(name, '/', 1) and m.status = 'processing'
    )
  );
