-- Fathom AI: user-created data (uploads, highlights, clips, overrides of seeded summaries).
-- Seeded meetings are static JSON in the repo and never stored here, so meeting_id columns on
-- summaries / action_items / highlights / clips are plain text (no FK): they may point at a seed id.
-- Public demo workspace, no auth: the app uses the publishable (anon) key, so access is
-- controlled by narrow grants + RLS policies below. No role may delete anything.

-- ---------------------------------------------------------------- tables

create table public.meetings (
  id          text primary key,
  title       text not null check (char_length(title) between 1 and 300),
  date        date not null,
  duration_s  double precision not null default 0 check (duration_s >= 0 and duration_s <= 4 * 3600),
  media_url   text check (media_url is null or char_length(media_url) <= 2000),
  speakers    jsonb not null default '[]'::jsonb check (jsonb_typeof(speakers) = 'array'),
  status      text not null default 'processing' check (status in ('processing', 'ready', 'error')),
  source      text not null default 'upload' check (source = 'upload'),
  error       text check (error is null or char_length(error) <= 2000),
  created_at  timestamptz not null default now()
);

create table public.segments (
  id          text primary key,
  meeting_id  text not null references public.meetings (id) on delete cascade,
  start_s     double precision not null check (start_s >= 0),
  end_s       double precision not null check (end_s >= start_s),
  speaker_id  text not null check (char_length(speaker_id) <= 100),
  text        text not null check (char_length(text) <= 10000)
);
create index segments_meeting_start_idx on public.segments (meeting_id, start_s);

create table public.summaries (
  meeting_id  text not null check (char_length(meeting_id) <= 100),
  template    text not null check (template in ('general', 'sales', 'one_on_one')),
  points      jsonb not null check (jsonb_typeof(points) = 'array'),
  updated_at  timestamptz not null default now(),
  primary key (meeting_id, template)
);

create table public.action_items (
  id               text primary key check (char_length(id) <= 100),
  meeting_id       text not null check (char_length(meeting_id) <= 100),
  position         integer not null default 0,
  task             text not null check (char_length(task) between 1 and 2000),
  owner            text check (owner is null or char_length(owner) <= 200),
  due              date,
  due_phrase       text check (due_phrase is null or char_length(due_phrase) <= 200),
  confidence       text not null check (confidence in ('high', 'low')),
  evidence         jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  edited_by_human  boolean not null default false
);
create index action_items_meeting_idx on public.action_items (meeting_id, position);

create table public.highlights (
  id          text primary key check (char_length(id) <= 100),
  meeting_id  text not null check (char_length(meeting_id) <= 100),
  start_s     double precision not null check (start_s >= 0),
  end_s       double precision not null check (end_s >= start_s),
  note        text not null default '' check (char_length(note) <= 2000),
  created_at  timestamptz not null default now()
);
create index highlights_meeting_idx on public.highlights (meeting_id, start_s);

create table public.clips (
  id          text primary key check (char_length(id) <= 100),
  meeting_id  text not null check (char_length(meeting_id) <= 100),
  start_s     double precision not null check (start_s >= 0),
  end_s       double precision not null check (end_s > start_s),
  title       text not null check (char_length(title) between 1 and 300),
  public      boolean not null default true check (public),
  created_at  timestamptz not null default now()
);

-- Upload rate limit (3/hour/client). ip_hash is a salted hash computed server-side, never a raw IP.
create table public.upload_log (
  id          bigint generated always as identity primary key,
  ip_hash     text not null check (char_length(ip_hash) <= 128),
  meeting_id  text check (meeting_id is null or char_length(meeting_id) <= 100),
  created_at  timestamptz not null default now()
);
create index upload_log_ip_created_idx on public.upload_log (ip_hash, created_at);

-- ---------------------------------------------------------------- grants

-- Start from nothing, then grant only what the app needs.
revoke all on public.meetings, public.segments, public.summaries, public.action_items,
  public.highlights, public.clips, public.upload_log from anon, authenticated;

grant select, insert on public.meetings, public.segments, public.summaries, public.action_items,
  public.highlights, public.clips, public.upload_log to anon, authenticated;

-- Processing updates an upload's status/result fields only.
grant update (title, status, duration_s, speakers, media_url, error) on public.meetings to anon, authenticated;
-- Template summaries are upserted (regenerate / human edit).
grant update (meeting_id, template, points, updated_at) on public.summaries to anon, authenticated;
-- Action items are upserted on extraction and edited inline.
grant update (id, meeting_id, position, task, owner, due, due_phrase, confidence, evidence, edited_by_human)
  on public.action_items to anon, authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.meetings     enable row level security;
alter table public.segments     enable row level security;
alter table public.summaries    enable row level security;
alter table public.action_items enable row level security;
alter table public.highlights   enable row level security;
alter table public.clips        enable row level security;
alter table public.upload_log   enable row level security;

-- read: public demo workspace
create policy "public read" on public.meetings     for select to anon, authenticated using (true);
create policy "public read" on public.segments     for select to anon, authenticated using (true);
create policy "public read" on public.summaries    for select to anon, authenticated using (true);
create policy "public read" on public.action_items for select to anon, authenticated using (true);
create policy "public read" on public.highlights   for select to anon, authenticated using (true);
create policy "public read" on public.clips        for select to anon, authenticated using (true);
create policy "public read" on public.upload_log   for select to anon, authenticated using (true);

-- insert
create policy "insert uploads" on public.meetings for insert to anon, authenticated
  with check (source = 'upload' and status = 'processing');
create policy "insert segments of processing uploads" on public.segments for insert to anon, authenticated
  with check (exists (select 1 from public.meetings m where m.id = meeting_id and m.status = 'processing'));
create policy "insert summaries" on public.summaries for insert to anon, authenticated with check (true);
create policy "insert action items" on public.action_items for insert to anon, authenticated with check (true);
create policy "insert highlights" on public.highlights for insert to anon, authenticated with check (true);
create policy "insert clips" on public.clips for insert to anon, authenticated with check (public);
create policy "insert upload log" on public.upload_log for insert to anon, authenticated with check (true);

-- update (column grants above limit which fields)
create policy "update uploads" on public.meetings for update to anon, authenticated
  using (source = 'upload') with check (source = 'upload');
create policy "update summaries" on public.summaries for update to anon, authenticated
  using (true) with check (true);
create policy "update action items" on public.action_items for update to anon, authenticated
  using (true) with check (true);

-- no delete policies: deletes are denied for every non-owner role.

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads', 'uploads', true, 209715200,
  array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav',
        'audio/x-wav', 'audio/wave', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-flac',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket: files are readable by URL without a select policy (no listing allowed).
create policy "anon upload to uploads" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'uploads');
