-- ---------------------------------------------------------------------------
-- 0003  Students, terms, generated classes, per-student class records
-- ---------------------------------------------------------------------------

create table public.students (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  first_name       text not null check (length(trim(first_name)) between 1 and 80),
  last_name        text check (length(last_name) <= 80),
  preferred_name   text check (length(preferred_name) <= 80),
  email            extensions.citext,
  phone            text check (length(phone) <= 40),
  date_joined      date not null default current_date,
  active           boolean not null default true,
  current_level_id uuid references public.levels (id) on delete set null,
  goals            text,
  general_notes    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.students is
  'Only first_name is required so a student can be added from a name alone. '
  'Students archive (active = false) rather than delete — history must survive.';

-- The name the instructor actually reads and searches on.
create or replace function public.student_display_name(
  p_preferred text, p_first text, p_last text
) returns text
language sql immutable
as $$
  select trim(both ' ' from coalesce(nullif(trim(p_preferred), ''), p_first)
                            || coalesce(' ' || nullif(trim(p_last), ''), ''));
$$;

create index students_owner_active_idx on public.students (owner_id, active);
create index students_owner_level_idx on public.students (owner_id, current_level_id);
create index students_name_trgm_idx on public.students
  using gin (public.student_display_name(preferred_name, first_name, last_name)
             extensions.gin_trgm_ops);

create trigger students_set_updated_at before update on public.students
  for each row execute function public.set_updated_at();
create trigger students_force_owner before insert on public.students
  for each row execute function public.force_owner_id();

-- ---------------------------------------------------------------------------
-- terms
-- ---------------------------------------------------------------------------

create table public.terms (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  name             text not null check (length(trim(name)) between 1 and 120),
  description      text,
  level_id         uuid references public.levels (id) on delete set null,
  start_date       date not null,
  weekday          smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time       time not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  number_of_weeks  integer not null check (number_of_weeks between 1 and 52),
  location         text,
  status           text not null default 'draft'
                     check (status in ('draft', 'active', 'completed', 'cancelled')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.terms.number_of_weeks is
  '4/6/8 are presets in the UI; any value 1-52 is accepted so "custom" needs no separate concept.';

create index terms_owner_start_idx on public.terms (owner_id, start_date desc);
create index terms_owner_status_idx on public.terms (owner_id, status);
create index terms_name_trgm_idx on public.terms using gin (name extensions.gin_trgm_ops);

create trigger terms_set_updated_at before update on public.terms
  for each row execute function public.set_updated_at();
create trigger terms_force_owner before insert on public.terms
  for each row execute function public.force_owner_id();

-- ---------------------------------------------------------------------------
-- term_students  (any number of students per term, not just 3)
-- ---------------------------------------------------------------------------

create table public.term_students (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  term_id    uuid not null references public.terms (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status     text not null default 'enrolled'
               check (status in ('enrolled', 'completed', 'withdrawn')),
  joined_at  timestamptz not null default now(),
  notes      text,
  unique (term_id, student_id)
);

create index term_students_student_idx on public.term_students (student_id);
create index term_students_term_idx on public.term_students (term_id);

create trigger term_students_force_owner before insert on public.term_students
  for each row execute function public.force_owner_id();

-- ---------------------------------------------------------------------------
-- classes  (generated weekly from the term, then individually editable)
-- ---------------------------------------------------------------------------

create table public.classes (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  term_id          uuid not null references public.terms (id) on delete cascade,
  week_number      integer not null check (week_number between 1 and 52),
  scheduled_date   date not null,
  start_time       time not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  status           text not null default 'planned'
                     check (status in ('planned', 'completed', 'cancelled', 'rescheduled')),
  theme            text,
  general_notes    text,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (term_id, week_number),
  -- A class is only "completed" together with its timestamp, and vice versa.
  constraint classes_completed_consistency
    check ((status = 'completed') = (completed_at is not null))
);

create index classes_owner_date_idx on public.classes (owner_id, scheduled_date);
create index classes_term_week_idx on public.classes (term_id, week_number);
create index classes_owner_status_idx on public.classes (owner_id, status);

create trigger classes_set_updated_at before update on public.classes
  for each row execute function public.set_updated_at();
create trigger classes_force_owner before insert on public.classes
  for each row execute function public.force_owner_id();

-- ---------------------------------------------------------------------------
-- class_students
-- Consolidates the conceptual class_students + attendance + student_class_records
-- into the one row per (class, student) they all describe. See docs/SCHEMA.md.
-- ---------------------------------------------------------------------------

create table public.class_students (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references public.profiles (id) on delete cascade,
  class_id             uuid not null references public.classes (id) on delete cascade,
  student_id           uuid not null references public.students (id) on delete cascade,
  attendance_status    text not null default 'unmarked'
                         check (attendance_status in
                           ('unmarked', 'present', 'absent', 'late', 'excused')),
  -- Where this roster row came from. Rows created by term enrolment are
  -- managed by sync_term_roster; a drop-in added to a single class is not, and
  -- must survive later enrolment changes in that term.
  added_via            text not null default 'manual'
                         check (added_via in ('term', 'manual')),
  attendance_marked_at timestamptz,
  performance_notes    text,
  achievements         text,
  difficulties         text,
  homework             text,
  instructor_notes     text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (class_id, student_id)
);

create index class_students_class_idx on public.class_students (class_id);
create index class_students_student_idx on public.class_students (student_id);
create index class_students_student_status_idx
  on public.class_students (student_id, attendance_status);

create trigger class_students_set_updated_at before update on public.class_students
  for each row execute function public.set_updated_at();
create trigger class_students_force_owner before insert on public.class_students
  for each row execute function public.force_owner_id();

-- Stamp the moment attendance was actually taken.
create or replace function public.stamp_attendance_marked_at()
returns trigger
language plpgsql
as $$
begin
  if new.attendance_status is distinct from coalesce(old.attendance_status, 'unmarked') then
    new.attendance_marked_at := case when new.attendance_status = 'unmarked' then null else now() end;
  end if;
  return new;
end;
$$;

create trigger class_students_stamp_attendance
  before insert or update of attendance_status on public.class_students
  for each row execute function public.stamp_attendance_marked_at();

-- Conceptual-name views for reporting and CSV export (read-only).
create view public.attendance
  with (security_invoker = true) as
  select id, owner_id, class_id, student_id,
         attendance_status, attendance_marked_at, updated_at
  from public.class_students;

create view public.student_class_records
  with (security_invoker = true) as
  select id, owner_id, class_id, student_id, attendance_status, added_via,
         performance_notes, achievements, difficulties, homework,
         instructor_notes, created_at, updated_at
  from public.class_students;
