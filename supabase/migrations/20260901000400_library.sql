-- ---------------------------------------------------------------------------
-- 0004  Teaching libraries: tricks, exercises, and the links between them
-- ---------------------------------------------------------------------------

create table public.tricks (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  name             text not null check (length(trim(name)) between 1 and 120),
  description      text,
  difficulty       smallint check (difficulty between 1 and 5),
  grip             text,
  entry            text,
  exit             text,
  key_cues         text,
  common_errors    text,
  safety_notes     text,
  instructor_notes text,
  is_favorite      boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index tricks_owner_name_key on public.tricks (owner_id, lower(name));
create index tricks_owner_active_idx on public.tricks (owner_id, active);
create index tricks_owner_favorite_idx on public.tricks (owner_id, is_favorite desc, name);
create index tricks_name_trgm_idx on public.tricks using gin (name extensions.gin_trgm_ops);

create trigger tricks_set_updated_at before update on public.tricks
  for each row execute function public.set_updated_at();
create trigger tricks_force_owner before insert on public.tricks
  for each row execute function public.force_owner_id();

-- A trick can sit at more than one level (§19).
create table public.trick_levels (
  id       uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  trick_id uuid not null references public.tricks (id) on delete cascade,
  level_id uuid not null references public.levels (id) on delete cascade,
  unique (trick_id, level_id)
);
create index trick_levels_level_idx on public.trick_levels (level_id);
create trigger trick_levels_force_owner before insert on public.trick_levels
  for each row execute function public.force_owner_id();

create table public.trick_categories (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  trick_id    uuid not null references public.tricks (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  unique (trick_id, category_id)
);
create index trick_categories_category_idx on public.trick_categories (category_id);
create trigger trick_categories_force_owner before insert on public.trick_categories
  for each row execute function public.force_owner_id();

-- Guard: a trick may only be filed under a category of kind 'trick'.
create or replace function public.assert_category_kind()
returns trigger
language plpgsql
as $$
declare
  v_kind text;
begin
  select kind into v_kind from public.categories where id = new.category_id;
  if v_kind is distinct from tg_argv[0] then
    raise exception 'category % is of kind %, expected %', new.category_id, v_kind, tg_argv[0];
  end if;
  return new;
end;
$$;

create trigger trick_categories_kind_guard
  before insert or update on public.trick_categories
  for each row execute function public.assert_category_kind('trick');

-- ---------------------------------------------------------------------------
-- trick_relationships: prerequisites / progressions / regressions / related
-- ---------------------------------------------------------------------------

create table public.trick_relationships (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  from_trick_id     uuid not null references public.tricks (id) on delete cascade,
  to_trick_id       uuid not null references public.tricks (id) on delete cascade,
  relationship_type text not null
                      check (relationship_type in
                        ('prerequisite', 'progression', 'regression', 'related')),
  notes             text,
  created_at        timestamptz not null default now(),
  unique (from_trick_id, to_trick_id, relationship_type),
  constraint trick_relationships_no_self check (from_trick_id <> to_trick_id)
);

comment on table public.trick_relationships is
  'Directed edges read as: from_trick HAS relationship_type to_trick. '
  'e.g. (Ayesha, prerequisite, Invert) = "Invert is a prerequisite of Ayesha".';

create index trick_relationships_from_idx on public.trick_relationships (from_trick_id, relationship_type);
create index trick_relationships_to_idx on public.trick_relationships (to_trick_id, relationship_type);
create trigger trick_relationships_force_owner before insert on public.trick_relationships
  for each row execute function public.force_owner_id();

-- 'related' is symmetric — mirror it so it reads correctly from either trick.
create or replace function public.mirror_related_trick()
returns trigger
language plpgsql
as $$
begin
  if new.relationship_type = 'related' then
    insert into public.trick_relationships (owner_id, from_trick_id, to_trick_id, relationship_type)
    values (new.owner_id, new.to_trick_id, new.from_trick_id, 'related')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trick_relationships_mirror
  after insert on public.trick_relationships
  for each row execute function public.mirror_related_trick();

create or replace function public.unmirror_related_trick()
returns trigger
language plpgsql
as $$
begin
  if old.relationship_type = 'related' then
    delete from public.trick_relationships
    where from_trick_id = old.to_trick_id
      and to_trick_id = old.from_trick_id
      and relationship_type = 'related';
  end if;
  return old;
end;
$$;

create trigger trick_relationships_unmirror
  after delete on public.trick_relationships
  for each row execute function public.unmirror_related_trick();

-- ---------------------------------------------------------------------------
-- exercises
-- ---------------------------------------------------------------------------

create table public.exercises (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  name             text not null check (length(trim(name)) between 1 and 120),
  description      text,
  level_id         uuid references public.levels (id) on delete set null,
  target_area      text,
  equipment        text,
  sets             smallint check (sets between 1 and 50),
  reps             text,
  duration_seconds integer check (duration_seconds between 1 and 7200),
  tempo            text,
  difficulty       smallint check (difficulty between 1 and 5),
  progression      text,
  regression       text,
  instructor_notes text,
  is_favorite      boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index exercises_owner_name_key on public.exercises (owner_id, lower(name));
create index exercises_owner_active_idx on public.exercises (owner_id, active);
create index exercises_owner_favorite_idx on public.exercises (owner_id, is_favorite desc, name);
create index exercises_owner_level_idx on public.exercises (owner_id, level_id);
create index exercises_name_trgm_idx on public.exercises using gin (name extensions.gin_trgm_ops);

create trigger exercises_set_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger exercises_force_owner before insert on public.exercises
  for each row execute function public.force_owner_id();

create table public.exercise_categories (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  unique (exercise_id, category_id)
);
create index exercise_categories_category_idx on public.exercise_categories (category_id);
create trigger exercise_categories_force_owner before insert on public.exercise_categories
  for each row execute function public.force_owner_id();
create trigger exercise_categories_kind_guard
  before insert or update on public.exercise_categories
  for each row execute function public.assert_category_kind('exercise');

-- ---------------------------------------------------------------------------
-- trick_exercises: which conditioning work supports which trick (§24)
-- ---------------------------------------------------------------------------

create table public.trick_exercises (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  trick_id     uuid not null references public.tricks (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  relationship text not null default 'preparation'
                 check (relationship in ('preparation', 'conditioning', 'support')),
  notes        text,
  created_at   timestamptz not null default now(),
  unique (trick_id, exercise_id)
);

create index trick_exercises_trick_idx on public.trick_exercises (trick_id);
create index trick_exercises_exercise_idx on public.trick_exercises (exercise_id);
create trigger trick_exercises_force_owner before insert on public.trick_exercises
  for each row execute function public.force_owner_id();
