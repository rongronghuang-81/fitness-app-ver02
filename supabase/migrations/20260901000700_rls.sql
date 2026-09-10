-- ---------------------------------------------------------------------------
-- 0007  Row Level Security
--
-- Every table in `public` gets RLS enabled and explicit policies. The app never
-- relies on application-level filtering: if a policy does not permit a row, the
-- database does not return it, no matter what the client asks for.
--
-- All owner-scoped tables share one predicate — `owner_id = auth.uid()` — which
-- is why owner_id is denormalised onto every table including join tables. The
-- policies below are generated in a loop so the predicate cannot drift between
-- tables by accident; they are ordinary, explicit policies in pg_policies once
-- created, and 0009 adds an assertion that none is missing.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  owner_scoped constant text[] := array[
    'levels', 'categories',
    'students', 'terms', 'term_students', 'classes', 'class_students',
    'class_lessons', 'lesson_items', 'lesson_templates', 'lesson_template_items',
    'tricks', 'trick_levels', 'trick_categories', 'trick_relationships',
    'exercises', 'exercise_categories', 'trick_exercises',
    'student_skill_progress', 'milestones', 'media'
  ];
begin
  foreach t in array owner_scoped loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    execute format($p$
      create policy %I on public.%I
        for select to authenticated
        using (owner_id = (select auth.uid()))
    $p$, t || '_select_own', t);

    execute format($p$
      create policy %I on public.%I
        for insert to authenticated
        with check (owner_id = (select auth.uid()))
    $p$, t || '_insert_own', t);

    execute format($p$
      create policy %I on public.%I
        for update to authenticated
        using (owner_id = (select auth.uid()))
        with check (owner_id = (select auth.uid()))
    $p$, t || '_update_own', t);

    execute format($p$
      create policy %I on public.%I
        for delete to authenticated
        using (owner_id = (select auth.uid()))
    $p$, t || '_delete_own', t);

    -- Table privileges are granted explicitly rather than inherited from the
    -- Supabase defaults, so the migration is self-contained. RLS above is what
    -- actually decides which rows these privileges can reach.
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: a user sees and edits exactly their own profile. There is no
-- insert policy — profiles are created by the on_auth_user_created trigger —
-- and no delete policy, because deleting the auth user cascades.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- skill_statuses: a global lookup. Readable by any signed-in instructor,
-- writable by nobody through the API (migrations only).
-- ---------------------------------------------------------------------------

alter table public.skill_statuses enable row level security;

create policy skill_statuses_select_all on public.skill_statuses
  for select to authenticated
  using (true);

grant select on public.skill_statuses to authenticated;

-- ---------------------------------------------------------------------------
-- Anonymous users get nothing. There is deliberately no policy granting the
-- `anon` role access to any table, so an unauthenticated request reads zero
-- rows even with a valid anon API key.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- Views inherit the underlying table's policies (security_invoker = true).
grant select on public.attendance to authenticated;
grant select on public.student_class_records to authenticated;
