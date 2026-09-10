'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireUser } from '@/lib/supabase/server'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, mediaMetadataSchema } from '@/lib/validation/schemas'
import { describeDbError, failure, fieldErrors, success, type ActionState } from '@/actions/types'
import { MEDIA_BUCKET, SIGNED_URL_TTL_SECONDS } from '@/lib/media-constants'


/**
 * Issues the storage path a browser upload should target.
 *
 * The path is always prefixed with the caller's own user id, which is what the
 * storage policy checks — so a client cannot choose a path in someone else's
 * namespace even by tampering with the request.
 */
export async function prepareUpload(input: {
  studentId?: string | null
  fileName: string
  mimeType: string
  fileSize: number
}): Promise<ActionState & { path?: string }> {
  const user = await requireUser()

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    return failure('That file type is not supported. Use a JPEG, PNG, WebP, HEIC, MP4 or MOV.')
  }
  if (input.fileSize <= 0 || input.fileSize > MAX_UPLOAD_BYTES) {
    return failure('That file is too large. The limit is 500 MB.')
  }

  const extension = input.fileName.includes('.')
    ? input.fileName.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '')
    : 'bin'
  const folder = input.studentId ?? '_unassigned'
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${extension || 'bin'}`

  return { ...success(), path }
}

/** Records the metadata row after the bytes land in Storage (§27). */
export async function recordMedia(input: {
  storage_path: string
  thumbnail_path?: string | null
  file_type: 'photo' | 'video'
  mime_type: string
  file_size: number
  duration_seconds?: number | null
  student_id?: string | null
  class_id?: string | null
  trick_id?: string | null
  milestone_id?: string | null
  caption?: string | null
}): Promise<ActionState> {
  const user = await requireUser()
  const parsed = mediaMetadataSchema.safeParse(input)
  if (!parsed.success) return fieldErrors(parsed.error)

  // Storage policies already refuse to read or sign an object outside the
  // caller's own prefix, but a row pointing somewhere else should never be
  // written in the first place — a metadata row is a claim about ownership.
  if (!parsed.data.storage_path.startsWith(`${user.id}/`)) {
    return failure('That upload path is not valid for this account.')
  }
  if (parsed.data.thumbnail_path && !parsed.data.thumbnail_path.startsWith(`${user.id}/`)) {
    return failure('That thumbnail path is not valid for this account.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('media').insert(parsed.data).select('id').single()

  if (error) {
    // The bytes are already uploaded; leaving them orphaned wastes quota.
    await supabase.storage.from(MEDIA_BUCKET).remove([parsed.data.storage_path])
    return failure(describeDbError(error))
  }

  if (parsed.data.student_id) revalidatePath(`/students/${parsed.data.student_id}`)
  if (parsed.data.class_id) revalidatePath(`/classes/${parsed.data.class_id}`)
  if (parsed.data.trick_id) revalidatePath(`/tricks/${parsed.data.trick_id}`)
  return success('Uploaded.', data.id)
}

/**
 * Signed URLs for a batch of media rows.
 *
 * The bucket is private, so this is the only way the browser can see a file.
 * Reading the rows first means RLS decides what the caller may sign.
 */
export async function getSignedMediaUrls(
  mediaIds: string[],
): Promise<Record<string, { url: string; thumbnailUrl: string | null }>> {
  await requireUser()
  if (mediaIds.length === 0) return {}

  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('media')
    .select('id, storage_path, thumbnail_path')
    .in('id', mediaIds)

  if (!rows || rows.length === 0) return {}

  const paths = rows.flatMap((r) => [r.storage_path, ...(r.thumbnail_path ? [r.thumbnail_path] : [])])
  const { data: signed } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  const result: Record<string, { url: string; thumbnailUrl: string | null }> = {}

  for (const row of rows) {
    const url = byPath.get(row.storage_path)
    if (!url) continue
    result[row.id] = {
      url,
      thumbnailUrl: row.thumbnail_path ? (byPath.get(row.thumbnail_path) ?? null) : null,
    }
  }
  return result
}

export async function updateMediaCaption(
  mediaId: string,
  caption: string | null,
): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('media')
    .update({ caption })
    .eq('id', mediaId)
    .select('student_id')
    .single()

  if (error) return failure(describeDbError(error))
  if (data.student_id) revalidatePath(`/students/${data.student_id}`)
  return success('Caption saved.')
}

/** Removes the metadata row and the underlying file together. */
export async function deleteMedia(mediaId: string): Promise<ActionState> {
  await requireUser()
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('media')
    .select('storage_path, thumbnail_path, student_id, class_id')
    .eq('id', mediaId)
    .maybeSingle()

  if (!row) return failure('That media item no longer exists.')

  const { error } = await supabase.from('media').delete().eq('id', mediaId)
  if (error) return failure(describeDbError(error))

  await supabase.storage
    .from(MEDIA_BUCKET)
    .remove([row.storage_path, ...(row.thumbnail_path ? [row.thumbnail_path] : [])])

  if (row.student_id) revalidatePath(`/students/${row.student_id}`)
  if (row.class_id) revalidatePath(`/classes/${row.class_id}`)
  return success('Media deleted.')
}
