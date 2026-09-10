-- ---------------------------------------------------------------------------
-- 0005  Lesson plans (planned vs actual) and reusable templates
-- ---------------------------------------------------------------------------

-- Sections shared by lessons and templates.
create domain public.lesson_section as text
  check (value in ('warmup', 'conditioning', 'preparation', 'tricks', 'combinations', 'cooldown'));

create table public.class_lessons (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  class_id         uuid not null references public.classes (id) on delete cascade,
  kind             text not null check (kind in ('planned', 'actual')),
  objective        text,
  combinations     text,
  homework         text,
  instructor_notes text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (class_id, kind)
);

comment on table public.class_lessons is
  'Two rows per class at most: the plan and what actually happened. Recording the '
  'actual lesson never mutates the planned row (spec §14).';

create index class_lessons_class_idx on public.class_lessons (class_id, kind);

create trigger class_lessons_set_updated_at before update on public.class_lessons
  for each row execute function public.set_updated_at();
create trigger class_lessons_force_owner before insert on public.class_lessons
  for each row execute function public.force_owner_id();

create table public.lesson_items (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  lesson_id        uuid not null references public.class_lessons (id) on delete cascade,
  section          public.lesson_section not null,
  position         integer not null default 0,
  trick_id         uuid references public.tricks (id) on delete restrict,
  exercise_id      uuid references public.exercises (id) on delete restrict,
  free_text        text,
  sets             smallint check (sets between 1 and 50),
  reps             text,
  duration_seconds integer check (duration_seconds between 1 and 7200),
  tempo            text,
  notes            text,
  outcome          text not null default 'planned'
                     check (outcome in ('planned', 'done', 'modified', 'skipped')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Every item is a linked library item or free text — never an empty row.
  constraint lesson_items_has_content
    check (trick_id is not null or exercise_id is not null
           or nullif(trim(coalesce(free_text, '')), '') is not null),
  -- An item links to a trick or an exercise, not both.
  constraint lesson_items_single_link
    check (not (trick_id is not null and exercise_id is not null))
);

create index lesson_items_lesson_idx on public.lesson_items (lesson_id, section, position);
create index lesson_items_trick_idx on public.lesson_items (trick_id);
create index lesson_items_exercise_idx on public.lesson_items (exercise_id);

create trigger lesson_items_set_updated_at before update on public.lesson_items
  for each row execute function public.set_updated_at();
create trigger lesson_items_force_owner before insert on public.lesson_items
  for each row execute function public.force_owner_id();

-- ---------------------------------------------------------------------------
-- Reusable lesson templates (§33)
-- ---------------------------------------------------------------------------

create table public.lesson_templates (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 120),
  description text,
  level_id    uuid references public.levels (id) on delete set null,
  objective   text,
  homework    text,
  notes       text,
  is_favorite boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index lesson_templates_owner_name_key
  on public.lesson_templates (owner_id, lower(name));
create index lesson_templates_owner_favorite_idx
  on public.lesson_templates (owner_id, is_favorite desc, name);

create trigger lesson_templates_set_updated_at before update on public.lesson_templates
  for each row execute function public.set_updated_at();
create trigger lesson_templates_force_owner before insert on public.lesson_templates
  for each row execute function public.force_owner_id();

create table public.lesson_template_items (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  template_id      uuid not null references public.lesson_templates (id) on delete cascade,
  section          public.lesson_section not null,
  position         integer not null default 0,
  trick_id         uuid references public.tricks (id) on delete restrict,
  exercise_id      uuid references public.exercises (id) on delete restrict,
  free_text        text,
  sets             smallint check (sets between 1 and 50),
  reps             text,
  duration_seconds integer check (duration_seconds between 1 and 7200),
  tempo            text,
  notes            text,
  created_at       timestamptz not null default now(),
  constraint lesson_template_items_has_content
    check (trick_id is not null or exercise_id is not null
           or nullif(trim(coalesce(free_text, '')), '') is not null),
  constraint lesson_template_items_single_link
    check (not (trick_id is not null and exercise_id is not null))
);

create index lesson_template_items_template_idx
  on public.lesson_template_items (template_id, section, position);

create trigger lesson_template_items_force_owner before insert on public.lesson_template_items
  for each row execute function public.force_owner_id();
