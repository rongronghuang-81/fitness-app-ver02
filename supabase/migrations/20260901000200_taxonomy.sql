-- ---------------------------------------------------------------------------
-- 0002  Configurable taxonomy: levels, categories, skill statuses
-- ---------------------------------------------------------------------------

create table public.levels (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  sort_order  integer not null default 0,
  color       text not null default 'slate',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index levels_owner_name_key on public.levels (owner_id, lower(name));
create index levels_owner_sort_idx on public.levels (owner_id, sort_order);

create trigger levels_set_updated_at before update on public.levels
  for each row execute function public.set_updated_at();
create trigger levels_force_owner before insert on public.levels
  for each row execute function public.force_owner_id();

-- Categories are shared between the two libraries, discriminated by `kind`.
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('trick', 'exercise')),
  name        text not null check (length(trim(name)) between 1 and 60),
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index categories_owner_kind_name_key
  on public.categories (owner_id, kind, lower(name));
create index categories_owner_kind_idx on public.categories (owner_id, kind, sort_order);

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger categories_force_owner before insert on public.categories
  for each row execute function public.force_owner_id();

-- ---------------------------------------------------------------------------
-- skill_statuses: global lookup so new statuses are an INSERT, not an enum
-- migration (spec §25 "design so more statuses can be added later").
-- ---------------------------------------------------------------------------

create table public.skill_statuses (
  code        text primary key,
  label       text not null,
  description text,
  sort_order  integer not null default 0,
  is_achieved boolean not null default false
);

insert into public.skill_statuses (code, label, description, sort_order, is_achieved) values
  ('not_started', 'Not started', 'On the radar but not shown yet.',                    0, false),
  ('introduced',  'Introduced',  'Demonstrated and explained in class.',                1, false),
  ('practising',  'Practising',  'Actively drilling; not yet clean.',                   2, false),
  ('achieved',    'Achieved',    'Performed successfully at least once.',               3, true),
  ('consistent',  'Consistent',  'Repeatable on demand with good form.',                4, true);

-- ---------------------------------------------------------------------------
-- Default taxonomy for a brand-new instructor account.
-- ---------------------------------------------------------------------------

create or replace function public.seed_default_taxonomy(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.levels (owner_id, name, sort_order, color)
  values (p_owner, 'Beginner', 0, 'emerald'),
         (p_owner, 'Improver', 1, 'sky'),
         (p_owner, 'Intermediate', 2, 'amber'),
         (p_owner, 'Advanced', 3, 'rose')
  on conflict do nothing;

  insert into public.categories (owner_id, kind, name, sort_order)
  select p_owner, 'trick', name, ord
  from unnest(array[
    'Spins', 'Climbs', 'Inverts', 'Mounts', 'Static holds', 'Flexibility',
    'Strength', 'Transitions', 'Drops', 'Combos', 'Floorwork'
  ]) with ordinality as t(name, ord)
  on conflict do nothing;

  insert into public.categories (owner_id, kind, name, sort_order)
  select p_owner, 'exercise', name, ord
  from unnest(array[
    'Shoulder', 'Pull', 'Push', 'Core', 'Grip', 'Hip', 'Hamstring',
    'Flexibility', 'Mobility', 'Conditioning', 'Activation', 'Pole-specific prep'
  ]) with ordinality as t(name, ord)
  on conflict do nothing;
end;
$$;

comment on function public.seed_default_taxonomy(uuid) is
  'Populates starter levels and categories for a new instructor. Idempotent.';

-- Run it automatically for every new profile.
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.seed_default_taxonomy(new.id);
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();
