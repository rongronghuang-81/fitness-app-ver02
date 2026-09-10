-- ---------------------------------------------------------------------------
-- Minimal Supabase shim for running the migrations against a plain PostgreSQL
-- instance (CI, or `npm run test:sql` locally). It recreates only the pieces
-- the migrations touch: the auth/storage schemas, the Supabase roles, and
-- auth.uid(). It is a TEST FIXTURE — never applied to a real project.
-- ---------------------------------------------------------------------------

create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- Mirrors Supabase: the subject claim of the caller's JWT, or NULL when anonymous.
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user::text);
$$;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text not null references storage.buckets (id),
  name       text not null,
  owner      uuid,
  created_at timestamptz not null default now(),
  metadata   jsonb,
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;

-- Supabase's helper: splits an object key into its folder segments.
create or replace function storage.foldername(name text)
returns text[]
language sql immutable
as $$
  select string_to_array(name, '/');
$$;
