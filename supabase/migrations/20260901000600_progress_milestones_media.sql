-- ---------------------------------------------------------------------------
-- 0006  Skill progression, milestones, media metadata
-- ---------------------------------------------------------------------------

create table public.student_skill_progress (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.profiles (id) on delete cascade,
  student_id          uuid not null references public.students (id) on delete cascade,
  trick_id            uuid not null references public.tricks (id) on delete cascade,
  status              text not null default 'not_started'
                        references public.skill_statuses (code) on update cascade,
  introduced_date     date,
  first_attempted_date date,
  first_achieved_date date,
  consistent_date     date,
  last_practised_date date,
  instructor_notes    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (student_id, trick_id)
);

comment on column public.student_skill_progress.status is
  'FK to skill_statuses rather than an enum, so new statuses are one INSERT (§25).';

create index student_skill_progress_student_idx
  on public.student_skill_progress (student_id, status);
create index student_skill_progress_trick_idx on public.student_skill_progress (trick_id);
create index student_skill_progress_recent_idx
  on public.student_skill_progress (owner_id, updated_at desc);

create trigger student_skill_progress_set_updated_at
  before update on public.student_skill_progress
  for each row execute function public.set_updated_at();
create trigger student_skill_progress_force_owner
  before insert on public.student_skill_progress
  for each row execute function public.force_owner_id();

-- Stamp the milestone dates the first time each status is reached, so the
-- instructor never has to type a date to keep the history accurate.
create or replace function public.stamp_skill_progress_dates()
returns trigger
language plpgsql
as $$
declare
  v_rank integer;
  v_today date := current_date;
begin
  select sort_order into v_rank from public.skill_statuses where code = new.status;

  if v_rank >= 1 and new.introduced_date is null then
    new.introduced_date := v_today;
  end if;
  if v_rank >= 2 and new.first_attempted_date is null then
    new.first_attempted_date := v_today;
  end if;
  if v_rank >= 3 and new.first_achieved_date is null then
    new.first_achieved_date := v_today;
  end if;
  if v_rank >= 4 and new.consistent_date is null then
    new.consistent_date := v_today;
  end if;
  if v_rank >= 1 then
    new.last_practised_date := coalesce(new.last_practised_date, v_today);
  end if;
  return new;
end;
$$;

create trigger student_skill_progress_stamp_dates
  before insert or update of status on public.student_skill_progress
  for each row execute function public.stamp_skill_progress_dates();

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------

create table public.milestones (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  student_id      uuid not null references public.students (id) on delete cascade,
  trick_id        uuid references public.tricks (id) on delete set null,
  class_id        uuid references public.classes (id) on delete set null,
  achieved_on     date not null default current_date,
  title           text not null check (length(trim(title)) between 1 and 160),
  description     text,
  instructor_note text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index milestones_student_idx on public.milestones (student_id, achieved_on desc);
create index milestones_owner_recent_idx on public.milestones (owner_id, achieved_on desc);
create index milestones_trick_idx on public.milestones (trick_id);
create index milestones_class_idx on public.milestones (class_id);

create trigger milestones_set_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();
create trigger milestones_force_owner before insert on public.milestones
  for each row execute function public.force_owner_id();

-- ---------------------------------------------------------------------------
-- media  (metadata only — bytes live in Supabase Storage)
-- ---------------------------------------------------------------------------

create table public.media (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  student_id       uuid references public.students (id) on delete cascade,
  class_id         uuid references public.classes (id) on delete set null,
  trick_id         uuid references public.tricks (id) on delete set null,
  milestone_id     uuid references public.milestones (id) on delete set null,
  storage_path     text not null unique,
  thumbnail_path   text,
  file_type        text not null check (file_type in ('photo', 'video')),
  mime_type        text not null,
  file_size        bigint not null check (file_size > 0),
  duration_seconds numeric(8, 2),
  caption          text,
  notes            text,
  created_at       timestamptz not null default now(),
  -- Media must hang off something; an orphan file is not useful.
  constraint media_has_relationship
    check (student_id is not null or class_id is not null
           or trick_id is not null or milestone_id is not null)
);

create index media_student_idx on public.media (student_id, created_at desc);
create index media_class_idx on public.media (class_id);
create index media_trick_idx on public.media (trick_id);
create index media_milestone_idx on public.media (milestone_id);
create index media_owner_recent_idx on public.media (owner_id, created_at desc);

create trigger media_force_owner before insert on public.media
  for each row execute function public.force_owner_id();
