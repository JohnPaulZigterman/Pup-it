create extension if not exists pgcrypto;

create table if not exists shows (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  house_style jsonb not null default '{}'::jsonb,
  cast jsonb not null default '[]'::jsonb,
  asset_references jsonb not null default '[]'::jsonb,
  show_bible jsonb not null default '{}'::jsonb,
  publishing_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  season_number integer not null default 1,
  episode_number integer not null default 1,
  title text not null,
  description text not null default '',
  status text not null default 'draft' check (
    status in ('draft', 'rough_cut', 'ready_for_review', 'approved', 'scheduled', 'published')
  ),
  metadata jsonb not null default '{}'::jsonb,
  scenes jsonb not null default '[]'::jsonb,
  takes jsonb not null default '[]'::jsonb,
  final_cuts jsonb not null default '[]'::jsonb,
  publishing_packages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (show_id, season_number, episode_number)
);

create table if not exists render_jobs (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id) on delete cascade,
  status text not null default 'queued' check (
    status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')
  ),
  renderer text not null default 'browser',
  request jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shows_updated_at_idx on shows(updated_at desc);
create index if not exists episodes_show_status_idx on episodes(show_id, status);
create index if not exists render_jobs_episode_status_idx on render_jobs(episode_id, status);
