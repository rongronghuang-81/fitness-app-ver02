-- ===========================================================================
-- Security tests: Row Level Security and storage policies.
-- Two instructors (A and B) plus an anonymous caller. Every assertion here is
-- about the DATABASE refusing access, not the application filtering it.
-- ===========================================================================

\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'

-- --- setup (as the migration/superuser role) -------------------------------
insert into auth.users (id, email) values
  (:'A', 'a@example.com'),
  (:'B', 'b@example.com');

do $$
begin
  perform test.assert(
    (select count(*) from public.profiles) = 2,
    'signing up creates an instructor profile automatically');
  perform test.assert(
    (select count(*) from public.levels where owner_id = '11111111-1111-1111-1111-111111111111') = 4,
    'a new profile is seeded with default levels');
  perform test.assert(
    (select count(*) from public.categories
      where owner_id = '11111111-1111-1111-1111-111111111111' and kind = 'trick') = 11,
    'a new profile is seeded with default trick categories');
end;
$$;

-- --- instructor A creates data ---------------------------------------------
set role authenticated;
select test.act_as(:'A');

insert into public.students (first_name, last_name) values ('Sarah', 'Tan');
insert into public.tricks (name, difficulty) values ('Shoulder Mount', 4);
insert into public.exercises (name, target_area) values ('Scapular Pull', 'Shoulder');

do $$
begin
  perform test.assert((select count(*) from public.students) = 1,
    'A sees the student A just created');
  perform test.assert(
    (select owner_id from public.students limit 1) = '11111111-1111-1111-1111-111111111111',
    'owner_id is stamped from the session, not from client input');
end;
$$;

-- A cannot mislabel a row as belonging to B: the trigger overrides owner_id.
insert into public.students (owner_id, first_name)
values ('22222222-2222-2222-2222-222222222222', 'Smuggled');

do $$
begin
  perform test.assert(
    (select count(*) from public.students
      where owner_id = '22222222-2222-2222-2222-222222222222') = 0,
    'a client cannot insert a row into another instructor''s data');
end;
$$;

-- --- instructor B is fully isolated ----------------------------------------
select test.act_as(:'B');

do $$
begin
  perform test.assert((select count(*) from public.students) = 0,
    'B cannot see A''s students');
  perform test.assert((select count(*) from public.tricks) = 0,
    'B cannot see A''s tricks');
  perform test.assert((select count(*) from public.exercises) = 0,
    'B cannot see A''s exercises');
  perform test.assert((select count(*) from public.profiles) = 1,
    'B sees only their own profile');
end;
$$;

-- B cannot update or delete A's rows: RLS makes them invisible, so 0 rows match.
do $$
declare
  v integer;
begin
  update public.students set first_name = 'Hacked';
  get diagnostics v = row_count;
  perform test.assert(v = 0, 'B''s UPDATE touches none of A''s students');

  delete from public.students;
  get diagnostics v = row_count;
  perform test.assert(v = 0, 'B''s DELETE removes none of A''s students');
end;
$$;

-- --- anonymous callers get nothing -----------------------------------------
reset role;
set role anon;
select test.act_as(null);

do $$
declare
  v integer;
begin
  begin
    select count(*) into v from public.students;
    perform test.assert(v = 0, 'an anonymous caller reads zero students');
  exception when insufficient_privilege then
    perform test.assert(true, 'an anonymous caller is denied students outright');
  end;

  begin
    select count(*) into v from public.media;
    perform test.assert(v = 0, 'an anonymous caller reads zero media rows');
  exception when insufficient_privilege then
    perform test.assert(true, 'an anonymous caller is denied media outright');
  end;
end;
$$;

-- --- storage: object keys are namespaced by owner --------------------------
reset role;
set role authenticated;
select test.act_as(:'A');

insert into storage.objects (bucket_id, name)
values ('student-media', '11111111-1111-1111-1111-111111111111/student-1/clip.mp4');

do $$
begin
  perform test.assert((select count(*) from storage.objects) = 1,
    'A can read their own storage object');
end;
$$;

select test.act_as(:'B');

do $$
declare
  v integer;
begin
  perform test.assert((select count(*) from storage.objects) = 0,
    'B cannot read A''s private student media');

  delete from storage.objects;
  get diagnostics v = row_count;
  perform test.assert(v = 0, 'B cannot delete A''s private student media');
end;
$$;

-- B cannot write into A's storage namespace.
do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    values ('student-media', '11111111-1111-1111-1111-111111111111/sneaky.mp4');
    perform test.assert(false, 'B must not be able to write into A''s storage prefix');
  exception when insufficient_privilege then
    perform test.assert(true, 'B is blocked from writing into A''s storage prefix');
  end;
end;
$$;

-- --- every public table is protected ---------------------------------------
reset role;

do $$
declare
  v_missing text;
  v_unpolicied text;
begin
  select string_agg(c.relname, ', ') into v_missing
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  perform test.assert(v_missing is null, 'RLS is enabled on every public table');

  select string_agg(c.relname, ', ') into v_unpolicied
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and not exists (select 1 from pg_policy p where p.polrelid = c.oid);
  perform test.assert(v_unpolicied is null, 'every public table has at least one policy');
end;
$$;
