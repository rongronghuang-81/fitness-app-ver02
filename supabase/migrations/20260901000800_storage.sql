-- ---------------------------------------------------------------------------
-- 0008  Private storage for student media
--
-- Object keys are: {owner_id}/{student_id | _unassigned}/{uuid}.{ext}
-- The first path segment is the owning instructor, which is what every policy
-- below checks. The bucket is private: there is no public URL for any object,
-- and the app serves media exclusively through short-lived signed URLs created
-- on the server.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-media',
  'student-media',
  false,
  524288000, -- 500 MB, enough for a phone video clip
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "student_media_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "student_media_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "student_media_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "student_media_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
