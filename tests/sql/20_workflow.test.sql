-- ===========================================================================
-- Workflow tests: the acceptance-criteria path (§58) and the worked class
-- example from §48, exercised at the database level.
-- ===========================================================================

\set I '33333333-3333-3333-3333-333333333333'

insert into auth.users (id, email) values (:'I', 'instructor@example.com');

set role authenticated;
select test.act_as(:'I');

-- --- students ---------------------------------------------------------------
insert into public.students (first_name) values ('Sarah');
insert into public.students (first_name, last_name) values ('Michelle', 'Lim');

do $$
begin
  perform test.assert((select count(*) from public.students) = 2,
    'a student can be created from a first name alone');
end;
$$;

-- --- a 6-week term starting Wednesday 9 September 2026 (§10) ----------------
insert into public.terms (name, start_date, weekday, start_time, duration_minutes, number_of_weeks, status)
values ('Intermediate Pole', date '2026-09-09', 3, time '19:00', 60, 6, 'active');

select public.generate_term_classes(id) from public.terms where name = 'Intermediate Pole';

do $$
declare
  v_dates date[];
begin
  select array_agg(scheduled_date order by week_number) into v_dates from public.classes;

  perform test.assert(array_length(v_dates, 1) = 6,
    'a 6-week term generates exactly six classes');
  perform test.assert(
    v_dates = array[date '2026-09-09', date '2026-09-16', date '2026-09-23',
                    date '2026-09-30', date '2026-10-07', date '2026-10-14'],
    'weekly dates match the worked example (9 Sep → 14 Oct 2026)');
  perform test.assert(
    (select bool_and(extract(dow from scheduled_date) = 3) from public.classes),
    'every generated class falls on the term''s weekday');
end;
$$;

-- Re-running must not duplicate or clobber (idempotence).
update public.classes set theme = 'Shoulder mount week' where week_number = 4;
select public.generate_term_classes(id) from public.terms where name = 'Intermediate Pole';

do $$
begin
  perform test.assert((select count(*) from public.classes) = 6,
    'regenerating a term does not duplicate classes');
  perform test.assert(
    (select theme from public.classes where week_number = 4) = 'Shoulder mount week',
    'regenerating a term does not clobber an edited class');
end;
$$;

-- --- enrolment fans the roster out onto every class ------------------------
insert into public.term_students (term_id, student_id)
select t.id, s.id from public.terms t, public.students s where t.name = 'Intermediate Pole';

do $$
begin
  perform test.assert((select count(*) from public.class_students) = 12,
    'enrolling 2 students in a 6-week term seeds 12 class records');
  perform test.assert(
    (select bool_and(attendance_status = 'unmarked') from public.class_students),
    'attendance starts unmarked, not defaulted to present');
end;
$$;

-- --- lesson plan for week 4 (§13) ------------------------------------------
insert into public.tricks (name, difficulty) values ('Shoulder Mount', 4), ('Ayesha', 5), ('Janeiro', 4);
insert into public.exercises (name, target_area) values
  ('Scapular Pull', 'Shoulder'), ('Hollow Body Hold', 'Core');

insert into public.class_lessons (class_id, kind, objective)
select id, 'planned', 'Clean shoulder mount entry'
from public.classes where week_number = 4;

insert into public.lesson_items (lesson_id, section, position, exercise_id)
select l.id, 'conditioning', 0, e.id
from public.class_lessons l, public.exercises e
where l.kind = 'planned' and e.name = 'Scapular Pull';

insert into public.lesson_items (lesson_id, section, position, trick_id)
select l.id, 'tricks', ord - 1, t.id
from public.class_lessons l
join lateral (
  select t.id, row_number() over (order by t.name) as ord
  from public.tricks t where t.name in ('Shoulder Mount', 'Ayesha', 'Janeiro')
) t on true
where l.kind = 'planned';

do $$
begin
  perform test.assert((select count(*) from public.lesson_items) = 4,
    'lesson items link to library tricks and exercises');
end;
$$;

-- An item must carry content.
do $$
begin
  begin
    insert into public.lesson_items (lesson_id, section, position)
    select id, 'warmup', 0 from public.class_lessons limit 1;
    perform test.assert(false, 'an empty lesson item must be rejected');
  exception when check_violation then
    perform test.assert(true, 'an empty lesson item is rejected by a constraint');
  end;
end;
$$;

-- --- planned vs actual: the plan must survive (§14) -------------------------
insert into public.class_lessons (class_id, kind, objective)
select class_id, 'actual', 'Clean shoulder mount entry'
from public.class_lessons where kind = 'planned';

select public.copy_lesson_items(
  (select id from public.class_lessons where kind = 'planned'),
  (select id from public.class_lessons where kind = 'actual')
);

-- What really happened: Janeiro was postponed, extra conditioning was added.
delete from public.lesson_items
where lesson_id = (select id from public.class_lessons where kind = 'actual')
  and trick_id = (select id from public.tricks where name = 'Janeiro');

insert into public.lesson_items (lesson_id, section, position, free_text, outcome)
values ((select id from public.class_lessons where kind = 'actual'),
        'conditioning', 5, 'Extra shoulder conditioning', 'done');

do $$
begin
  perform test.assert(
    (select count(*) from public.lesson_items i
      join public.class_lessons l on l.id = i.lesson_id where l.kind = 'planned') = 4,
    'the planned lesson is unchanged after recording the actual lesson');
  perform test.assert(
    (select count(*) from public.lesson_items i
      join public.class_lessons l on l.id = i.lesson_id where l.kind = 'actual') = 4,
    'the actual lesson records the real content');
  perform test.assert(
    exists (select 1 from public.lesson_items i
            join public.class_lessons l on l.id = i.lesson_id
            where l.kind = 'planned' and i.trick_id =
              (select id from public.tricks where name = 'Janeiro')),
    'Janeiro is still on the plan even though it was not taught');
end;
$$;

-- --- attendance -------------------------------------------------------------
update public.class_students cs
set attendance_status = 'present'
from public.classes c
where cs.class_id = c.id and c.week_number = 4;

do $$
begin
  perform test.assert(
    (select bool_and(attendance_marked_at is not null) from public.class_students
      where attendance_status = 'present'),
    'marking attendance stamps the time it was taken');
end;
$$;

-- --- skill progression date stamping (§25) ---------------------------------
insert into public.student_skill_progress (student_id, trick_id, status)
select s.id, t.id, 'introduced'
from public.students s, public.tricks t
where s.first_name = 'Sarah' and t.name = 'Shoulder Mount';

do $$
begin
  perform test.assert(
    (select introduced_date is not null and first_achieved_date is null
     from public.student_skill_progress),
    'reaching "introduced" stamps only the introduced date');
end;
$$;

update public.student_skill_progress set status = 'achieved';

do $$
begin
  perform test.assert(
    (select introduced_date is not null
        and first_attempted_date is not null
        and first_achieved_date is not null
        and consistent_date is null
     from public.student_skill_progress),
    'reaching "achieved" back-fills the earlier dates but not the later ones');
end;
$$;

-- --- trick ⇄ exercise links read from both sides (§24) ---------------------
insert into public.trick_exercises (trick_id, exercise_id)
select t.id, e.id from public.tricks t, public.exercises e
where t.name = 'Shoulder Mount' and e.name = 'Scapular Pull';

do $$
begin
  perform test.assert(
    (select count(*) from public.trick_exercises te
      join public.tricks t on t.id = te.trick_id where t.name = 'Shoulder Mount') = 1,
    'a trick page can list its preparation exercises');
  perform test.assert(
    (select count(*) from public.trick_exercises te
      join public.exercises e on e.id = te.exercise_id where e.name = 'Scapular Pull') = 1,
    'an exercise page can list the tricks it supports');
end;
$$;

-- --- symmetric "related" trick edges ---------------------------------------
insert into public.trick_relationships (from_trick_id, to_trick_id, relationship_type)
select a.id, b.id, 'related' from public.tricks a, public.tricks b
where a.name = 'Ayesha' and b.name = 'Shoulder Mount';

do $$
begin
  perform test.assert(
    (select count(*) from public.trick_relationships where relationship_type = 'related') = 2,
    '"related" edges are mirrored so they read from either trick');
end;
$$;

-- Directed edges are not mirrored.
insert into public.trick_relationships (from_trick_id, to_trick_id, relationship_type)
select a.id, b.id, 'prerequisite' from public.tricks a, public.tricks b
where a.name = 'Ayesha' and b.name = 'Shoulder Mount';

do $$
begin
  perform test.assert(
    (select count(*) from public.trick_relationships
      where relationship_type = 'prerequisite') = 1,
    'prerequisites stay directed');
end;
$$;

-- A trick cannot be its own prerequisite.
do $$
begin
  begin
    insert into public.trick_relationships (from_trick_id, to_trick_id, relationship_type)
    select id, id, 'prerequisite' from public.tricks where name = 'Ayesha';
    perform test.assert(false, 'a self-referencing relationship must be rejected');
  exception when check_violation then
    perform test.assert(true, 'a trick cannot be its own prerequisite');
  end;
end;
$$;

-- --- global search (§31) ----------------------------------------------------
do $$
begin
  perform test.assert(
    exists (select 1 from public.global_search('Sarah') where kind = 'student'),
    'search finds a student by name');
  perform test.assert(
    exists (select 1 from public.global_search('shoulder') where kind = 'trick'),
    'search finds a trick by partial, lower-case text');
  perform test.assert(
    exists (select 1 from public.global_search('scap') where kind = 'exercise'),
    'search finds an exercise from a 4-letter prefix');
  perform test.assert(
    exists (select 1 from public.global_search('September') where kind = 'class'),
    'search finds classes by month name');
  perform test.assert(
    exists (select 1 from public.global_search('Intermediate') where kind = 'term'),
    'search finds a term by name');
end;
$$;

-- --- archiving keeps history (§43) -----------------------------------------
update public.students set active = false where first_name = 'Sarah';

do $$
begin
  perform test.assert(
    (select count(*) from public.class_students cs
      join public.students s on s.id = cs.student_id
     where s.first_name = 'Sarah') = 6,
    'archiving a student leaves their class history intact');
  perform test.assert(
    (select count(*) from public.student_skill_progress) = 1,
    'archiving a student leaves their skill progress intact');
end;
$$;

-- A library item that appears in a taught lesson cannot be deleted out from
-- under the historical record.
do $$
begin
  begin
    delete from public.exercises where name = 'Scapular Pull';
    perform test.assert(false, 'deleting a referenced exercise must be refused');
  exception when foreign_key_violation then
    perform test.assert(true, 'an exercise used in a lesson cannot be hard-deleted');
  end;
end;
$$;

-- --- completing a class -----------------------------------------------------
update public.classes set status = 'completed', completed_at = now() where week_number = 4;

do $$
begin
  perform test.assert(
    (select completed_at is not null from public.classes where week_number = 4),
    'completing a class records when it happened');
  begin
    update public.classes set status = 'completed', completed_at = null where week_number = 5;
    perform test.assert(false, 'completed status without a timestamp must be refused');
  exception when check_violation then
    perform test.assert(true, 'a class cannot be "completed" without a completion time');
  end;
end;
$$;

-- --- historical timestamps must survive later edits (§44) ------------------
do $$
declare
  v_first  timestamptz;
  v_second timestamptz;
begin
  select completed_at into v_first from public.classes where week_number = 4;

  -- Editing a completed class (adding a theme, say) must not move the moment
  -- it was taught. The application preserves completed_at; this pins the
  -- database side of the contract that makes that possible.
  update public.classes set theme = 'Edited afterwards' where week_number = 4;
  select completed_at into v_second from public.classes where week_number = 4;

  perform test.assert(v_first = v_second,
    'editing a completed class does not move its completion time');

  perform test.assert(
    (select updated_at >= created_at from public.classes where week_number = 4),
    'updated_at advances while created_at stays put');
end;
$$;

reset role;
