/** Private Supabase Storage bucket holding all student photos and video. */
export const MEDIA_BUCKET = 'student-media'

/** How long a signed media URL stays valid. Short: these are private files. */
export const SIGNED_URL_TTL_SECONDS = 60 * 30
