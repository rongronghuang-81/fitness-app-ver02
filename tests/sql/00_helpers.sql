-- Test helpers. Loaded before the SQL suites; not part of the application schema.
create schema if not exists test;

create or replace function test.assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'ASSERTION FAILED: %', p_message;
  end if;
  raise notice '  ok  %', p_message;
end;
$$;

create or replace function test.act_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
end;
$$;

grant usage on schema test to authenticated, anon;
grant execute on all functions in schema test to authenticated, anon;
