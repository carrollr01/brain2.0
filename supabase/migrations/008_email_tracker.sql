-- Email open tracking

create table tracks (
  id text primary key,
  label text not null,
  recipient text,
  subject text,
  created_at timestamptz default now()
);

create table opens (
  id serial primary key,
  track_id text references tracks(id) on delete cascade,
  opened_at timestamptz default now(),
  ip text,
  user_agent text,
  referer text
);

create index idx_opens_track_id on opens(track_id);

alter table tracks enable row level security;
alter table opens enable row level security;

create policy "Allow all on tracks" on tracks for all using (true) with check (true);
create policy "Allow all on opens" on opens for all using (true) with check (true);
