-- ---------------------------------------------------------------------------
-- 0009  Server-side operations: class generation, roster sync, lesson copy,
--       global search. All are SECURITY INVOKER so RLS still applies.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- generate_term_classes
-- Creates one class per week from the term's start_date / weekday / week count.
-- The first class is the first occurrence of `weekday` on or after start_date.
-- Existing weeks are left untouched, so re-running after extending a term only
-- adds the new weeks and never clobbers an edited or completed class.
-- ---------------------------------------------------------------------------

create or replace function public.generate_term_classes(p_term_id uuid)
returns setof public.classes
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_term   public.terms;
  v_first  date;
  v_week   integer;
begin
  select * into v_term from public.terms where id = p_term_id;
  if not found then
    raise exception 'term % not found or not visible', p_term_id;
  end if;

  -- Advance from start_date to the first matching weekday (0 = Sunday).
  v_first := v_term.start_date
             + ((v_term.weekday - extract(dow from v_term.start_date)::int + 7) % 7);

  for v_week in 1 .. v_term.number_of_weeks loop
    insert into public.classes (
      owner_id, term_id, week_number, scheduled_date, start_time, duration_minutes, status
    )
    values (
      v_term.owner_id, v_term.id, v_week,
      v_first + ((v_week - 1) * 7),
      v_term.start_time, v_term.duration_minutes, 'planned'
    )
    on conflict (term_id, week_number) do nothing;
  end loop;

  -- Weeks beyond the (possibly shortened) term that nobody has used yet.
  delete from public.classes c
  where c.term_id = v_term.id
    and c.week_number > v_term.number_of_weeks
    and c.status = 'planned'
    and c.completed_at is null
    and not exists (select 1 from public.class_lessons l where l.class_id = c.id)
    and not exists (
      select 1 from public.class_students cs
      where cs.class_id = c.id and cs.attendance_status <> 'unmarked'
    );

  return query select * from public.classes where term_id = v_term.id order by week_number;
end;
$$;

comment on function public.generate_term_classes(uuid) is
  'Idempotent. Adds missing weekly classes for a term; never overwrites a class '
  'that has been edited, taught, or has a lesson plan attached.';

-- ---------------------------------------------------------------------------
-- sync_term_roster
-- Mirrors a term's enrolled students onto its classes, so opening any class
-- already lists the right people. Only classes that have not been completed are
-- touched: a completed class is a historical record.
-- ---------------------------------------------------------------------------

create or replace function public.sync_term_roster(p_term_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  insert into public.class_students (owner_id, class_id, student_id, attendance_status)
  select c.owner_id, c.id, ts.student_id,
         case when p.default_attendance_present then 'present' else 'unmarked' end
  from public.classes c
  join public.term_students ts on ts.term_id = c.term_id and ts.status = 'enrolled'
  join public.profiles p on p.id = c.owner_id
  where c.term_id = p_term_id
    and c.status <> 'completed'
  on conflict (class_id, student_id) do nothing;

  -- Withdrawn students drop off classes they never actually attended.
  delete from public.class_students cs
  using public.classes c
  where cs.class_id = c.id
    and c.term_id = p_term_id
    and c.status <> 'completed'
    and cs.attendance_status = 'unmarked'
    and not exists (
      select 1 from public.term_students ts
      where ts.term_id = p_term_id
        and ts.student_id = cs.student_id
        and ts.status = 'enrolled'
    );
end;
$$;

create or replace function public.trg_sync_term_roster()
returns trigger
language plpgsql
as $$
begin
  perform public.sync_term_roster(coalesce(new.term_id, old.term_id));
  return coalesce(new, old);
end;
$$;

create trigger term_students_sync_roster
  after insert or update or delete on public.term_students
  for each row execute function public.trg_sync_term_roster();

-- Statement-level with a transition table: generating a term inserts every week
-- at once, and a per-row trigger would re-sync the whole term once per class.
create or replace function public.trg_sync_roster_for_new_classes()
returns trigger
language plpgsql
as $$
declare
  v_term_id uuid;
begin
  for v_term_id in select distinct term_id from new_classes loop
    perform public.sync_term_roster(v_term_id);
  end loop;
  return null;
end;
$$;

create trigger classes_sync_roster
  after insert on public.classes
  referencing new table as new_classes
  for each statement execute function public.trg_sync_roster_for_new_classes();

-- ---------------------------------------------------------------------------
-- copy_lesson_items
-- Powers "copy previous lesson", "apply template", and the planned → actual
-- copy at completion time. Sections can be filtered so the instructor can take
-- only the warm-up, only the tricks, and so on (spec §15).
-- ---------------------------------------------------------------------------

create or replace function public.copy_lesson_items(
  p_source_lesson_id uuid,
  p_target_lesson_id uuid,
  p_sections         text[] default null,
  p_replace          boolean default false
)
returns integer
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  if p_replace then
    delete from public.lesson_items
    where lesson_id = p_target_lesson_id
      and (p_sections is null or section = any (p_sections));
  end if;

  insert into public.lesson_items (
    owner_id, lesson_id, section, position, trick_id, exercise_id,
    free_text, sets, reps, duration_seconds, tempo, notes
  )
  select l.owner_id, p_target_lesson_id, i.section,
         i.position, i.trick_id, i.exercise_id,
         i.free_text, i.sets, i.reps, i.duration_seconds, i.tempo, i.notes
  from public.lesson_items i
  join public.class_lessons l on l.id = p_target_lesson_id
  where i.lesson_id = p_source_lesson_id
    and (p_sections is null or i.section = any (p_sections))
  order by i.section, i.position;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.apply_template_to_lesson(
  p_template_id      uuid,
  p_target_lesson_id uuid,
  p_sections         text[] default null,
  p_replace          boolean default false
)
returns integer
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  if p_replace then
    delete from public.lesson_items
    where lesson_id = p_target_lesson_id
      and (p_sections is null or section = any (p_sections));
  end if;

  insert into public.lesson_items (
    owner_id, lesson_id, section, position, trick_id, exercise_id,
    free_text, sets, reps, duration_seconds, tempo, notes
  )
  select l.owner_id, p_target_lesson_id, i.section,
         i.position, i.trick_id, i.exercise_id,
         i.free_text, i.sets, i.reps, i.duration_seconds, i.tempo, i.notes
  from public.lesson_template_items i
  join public.class_lessons l on l.id = p_target_lesson_id
  where i.template_id = p_template_id
    and (p_sections is null or i.section = any (p_sections))
  order by i.section, i.position;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- global_search — partial matches across the five searchable entities (§31).
-- RLS on the underlying tables scopes results to the caller automatically.
-- ---------------------------------------------------------------------------

create or replace function public.global_search(p_query text, p_limit integer default 8)
returns table (
  kind     text,
  id       uuid,
  title    text,
  subtitle text,
  score    real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (select trim(p_query) as term)
  (
    select 'student'::text,
           s.id,
           public.student_display_name(s.preferred_name, s.first_name, s.last_name),
           case when s.active then coalesce(l.name, 'Student') else 'Archived' end,
           extensions.similarity(
             public.student_display_name(s.preferred_name, s.first_name, s.last_name), q.term)
    from public.students s
    cross join q
    left join public.levels l on l.id = s.current_level_id
    where public.student_display_name(s.preferred_name, s.first_name, s.last_name)
            ilike '%' || q.term || '%'
       or s.email::text ilike '%' || q.term || '%'
    order by 5 desc, 3
    limit p_limit
  )
  union all
  (
    select 'trick'::text, t.id, t.name,
           coalesce(nullif(t.grip, ''), 'Trick'),
           extensions.similarity(t.name, q.term)
    from public.tricks t
    cross join q
    where t.name ilike '%' || q.term || '%'
       or t.description ilike '%' || q.term || '%'
    order by 5 desc, 3
    limit p_limit
  )
  union all
  (
    select 'exercise'::text, e.id, e.name,
           coalesce(nullif(e.target_area, ''), 'Exercise'),
           extensions.similarity(e.name, q.term)
    from public.exercises e
    cross join q
    where e.name ilike '%' || q.term || '%'
       or e.description ilike '%' || q.term || '%'
    order by 5 desc, 3
    limit p_limit
  )
  union all
  (
    select 'term'::text, tm.id, tm.name,
           to_char(tm.start_date, 'FMMonth YYYY') || ' · ' || tm.number_of_weeks || ' weeks',
           extensions.similarity(tm.name, q.term)
    from public.terms tm
    cross join q
    where tm.name ilike '%' || q.term || '%'
       or tm.location ilike '%' || q.term || '%'
       or to_char(tm.start_date, 'FMMonth YYYY') ilike '%' || q.term || '%'
    order by 5 desc, 3
    limit p_limit
  )
  union all
  (
    select 'class'::text, c.id,
           tm.name || ' · Week ' || c.week_number,
           to_char(c.scheduled_date, 'FMDay FMDD FMMon YYYY'),
           greatest(extensions.similarity(coalesce(c.theme, ''), q.term),
                    extensions.similarity(tm.name, q.term))
    from public.classes c
    join public.terms tm on tm.id = c.term_id
    cross join q
    where c.theme ilike '%' || q.term || '%'
       or tm.name ilike '%' || q.term || '%'
       or to_char(c.scheduled_date, 'FMMonth YYYY') ilike '%' || q.term || '%'
       or to_char(c.scheduled_date, 'FMDay') ilike '%' || q.term || '%'
    order by 5 desc, 4 desc
    limit p_limit
  );
$$;

comment on function public.global_search(text, integer) is
  'Partial-text search across students, tricks, exercises, terms and classes. '
  'RLS on the underlying tables scopes results to the calling instructor.';

-- ---------------------------------------------------------------------------
-- Function privileges. Every function above is SECURITY INVOKER, so RLS still
-- applies to whatever they touch; anon is granted nothing.
-- ---------------------------------------------------------------------------

grant execute on function public.generate_term_classes(uuid) to authenticated;
grant execute on function public.sync_term_roster(uuid) to authenticated;
grant execute on function public.copy_lesson_items(uuid, uuid, text[], boolean) to authenticated;
grant execute on function public.apply_template_to_lesson(uuid, uuid, text[], boolean) to authenticated;
grant execute on function public.global_search(text, integer) to authenticated;
grant execute on function public.student_display_name(text, text, text) to authenticated;

revoke all on function public.seed_default_taxonomy(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Safety net: fail the migration if any public table ever ships without RLS.
-- ---------------------------------------------------------------------------

do $$
declare
  v_missing text;
begin
  select string_agg(c.relname, ', ')
  into v_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if v_missing is not null then
    raise exception 'RLS is not enabled on: %', v_missing;
  end if;
end;
$$;
