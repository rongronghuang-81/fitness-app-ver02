-- ---------------------------------------------------------------------------
-- 0001  Extensions, instructor profiles, shared helpers
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;
create extension if not exists "citext" with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Forces owner_id to the authenticated user on insert. Prevents a client from
-- writing a row into somebody else's object graph even if the policy allowed it.
create or replace function public.force_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is not null then
    new.owner_id := auth.uid();
  elsif new.owner_id is null then
    raise exception 'owner_id is required when there is no authenticated user';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per instructor account
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                              uuid primary key references auth.users (id) on delete cascade,
  email                           extensions.citext not null,
  full_name                       text,
  timezone                        text not null default 'Asia/Singapore',
  theme                           text not null default 'system'
                                    check (theme in ('system', 'light', 'dark')),
  default_class_duration_minutes  integer not null default 60
                                    check (default_class_duration_minutes between 15 and 480),
  default_term_weeks              integer not null default 6
                                    check (default_term_weeks between 1 and 52),
  default_start_time              time not null default '19:00',
  default_attendance_present      boolean not null default false,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

comment on table public.profiles is
  'Instructor accounts. V1 has one row; owner_id on every other table points here '
  'so a second instructor is additive rather than a rewrite.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
