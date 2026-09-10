import { z } from 'zod'

/**
 * Validation schemas shared by the forms and the server actions.
 *
 * The same schema runs in both places: the browser copy gives instant feedback,
 * the server copy is the one that actually decides. Never trust the client one.
 */

const trimmed = z.string().trim()
const optionalText = trimmed.max(5000).optional().nullable().transform((v) => v || null)
const optionalShort = trimmed.max(200).optional().nullable().transform((v) => v || null)
const uuid = z.uuid()
const optionalUuid = z
  .union([uuid, z.literal('')])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
const isoTime = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use a valid time')

const optionalInt = (min: number, max: number) =>
  z
    .union([z.coerce.number().int().min(min).max(max), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))

// --- Students ---------------------------------------------------------------

export const studentSchema = z.object({
  first_name: trimmed.min(1, 'A first name is required').max(80),
  last_name: optionalShort,
  preferred_name: optionalShort,
  email: z
    .union([z.email('Enter a valid email address'), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => v || null),
  phone: optionalShort,
  date_joined: isoDate.optional(),
  current_level_id: optionalUuid,
  goals: optionalText,
  general_notes: optionalText,
  active: z.coerce.boolean().optional(),
})
export type StudentInput = z.infer<typeof studentSchema>

// --- Terms ------------------------------------------------------------------

export const termSchema = z.object({
  name: trimmed.min(1, 'Give the term a name').max(120),
  description: optionalText,
  level_id: optionalUuid,
  start_date: isoDate,
  weekday: z.coerce.number().int().min(0).max(6),
  start_time: isoTime,
  duration_minutes: z.coerce.number().int().min(15).max(480),
  number_of_weeks: z.coerce
    .number()
    .int()
    .min(1, 'A term runs for at least one week')
    .max(52, 'A term runs for at most 52 weeks'),
  location: optionalShort,
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('active'),
  notes: optionalText,
})
export type TermInput = z.infer<typeof termSchema>

// --- Classes ----------------------------------------------------------------

export const classSchema = z.object({
  scheduled_date: isoDate,
  start_time: isoTime,
  duration_minutes: z.coerce.number().int().min(15).max(480),
  status: z.enum(['planned', 'completed', 'cancelled', 'rescheduled']),
  theme: optionalShort,
  general_notes: optionalText,
})
export type ClassInput = z.infer<typeof classSchema>

export const attendanceSchema = z.object({
  class_student_id: uuid,
  attendance_status: z.enum(['unmarked', 'present', 'absent', 'late', 'excused']),
})

export const studentClassRecordSchema = z.object({
  class_student_id: uuid,
  attendance_status: z
    .enum(['unmarked', 'present', 'absent', 'late', 'excused'])
    .optional(),
  performance_notes: optionalText,
  achievements: optionalText,
  difficulties: optionalText,
  homework: optionalText,
  instructor_notes: optionalText,
})

// --- Lessons ----------------------------------------------------------------

export const lessonSectionEnum = z.enum([
  'warmup',
  'conditioning',
  'preparation',
  'tricks',
  'combinations',
  'cooldown',
])

export const lessonSchema = z.object({
  objective: optionalText,
  combinations: optionalText,
  homework: optionalText,
  instructor_notes: optionalText,
})

export const lessonItemSchema = z
  .object({
    section: lessonSectionEnum,
    trick_id: optionalUuid,
    exercise_id: optionalUuid,
    free_text: optionalShort,
    sets: optionalInt(1, 50),
    reps: optionalShort,
    duration_seconds: optionalInt(1, 7200),
    tempo: optionalShort,
    notes: optionalText,
    outcome: z.enum(['planned', 'done', 'modified', 'skipped']).optional(),
  })
  .refine((v) => v.trick_id || v.exercise_id || v.free_text, {
    message: 'Pick a trick or exercise, or type what you did',
    path: ['free_text'],
  })
  .refine((v) => !(v.trick_id && v.exercise_id), {
    message: 'An item links to a trick or an exercise, not both',
    path: ['trick_id'],
  })
export type LessonItemInput = z.infer<typeof lessonItemSchema>

export const copyLessonSchema = z.object({
  source_lesson_id: uuid,
  target_class_id: uuid,
  target_kind: z.enum(['planned', 'actual']).default('planned'),
  sections: z.array(lessonSectionEnum).min(1, 'Choose at least one section'),
  replace: z.coerce.boolean().default(false),
})

// --- Library ----------------------------------------------------------------

export const trickSchema = z.object({
  name: trimmed.min(1, 'Give the trick a name').max(120),
  description: optionalText,
  difficulty: optionalInt(1, 5),
  grip: optionalShort,
  entry: optionalShort,
  exit: optionalShort,
  key_cues: optionalText,
  common_errors: optionalText,
  safety_notes: optionalText,
  instructor_notes: optionalText,
  level_ids: z.array(uuid).default([]),
  category_ids: z.array(uuid).default([]),
  active: z.coerce.boolean().optional(),
})
export type TrickInput = z.infer<typeof trickSchema>

export const exerciseSchema = z.object({
  name: trimmed.min(1, 'Give the exercise a name').max(120),
  description: optionalText,
  level_id: optionalUuid,
  target_area: optionalShort,
  equipment: optionalShort,
  sets: optionalInt(1, 50),
  reps: optionalShort,
  duration_seconds: optionalInt(1, 7200),
  tempo: optionalShort,
  difficulty: optionalInt(1, 5),
  progression: optionalShort,
  regression: optionalShort,
  instructor_notes: optionalText,
  category_ids: z.array(uuid).default([]),
  active: z.coerce.boolean().optional(),
})
export type ExerciseInput = z.infer<typeof exerciseSchema>

export const trickRelationshipSchema = z.object({
  from_trick_id: uuid,
  to_trick_id: uuid,
  relationship_type: z.enum(['prerequisite', 'progression', 'regression', 'related']),
  notes: optionalShort,
})

export const trickExerciseSchema = z.object({
  trick_id: uuid,
  exercise_id: uuid,
  relationship: z.enum(['preparation', 'conditioning', 'support']).default('preparation'),
  notes: optionalShort,
})

// --- Progression, milestones, media -----------------------------------------

export const skillProgressSchema = z.object({
  student_id: uuid,
  trick_id: uuid,
  status: trimmed.min(1).max(40),
  instructor_notes: optionalText,
  last_practised_date: isoDate.optional().nullable(),
})

export const milestoneSchema = z.object({
  student_id: uuid,
  trick_id: optionalUuid,
  class_id: optionalUuid,
  achieved_on: isoDate,
  title: trimmed.min(1, 'Describe the milestone').max(160),
  description: optionalText,
  instructor_note: optionalText,
})

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const

export const mediaMetadataSchema = z
  .object({
    student_id: optionalUuid,
    class_id: optionalUuid,
    trick_id: optionalUuid,
    milestone_id: optionalUuid,
    storage_path: trimmed.min(1),
    thumbnail_path: optionalShort,
    file_type: z.enum(['photo', 'video']),
    mime_type: z.enum(ALLOWED_MIME_TYPES),
    file_size: z.coerce.number().int().positive().max(MAX_UPLOAD_BYTES),
    duration_seconds: z.coerce.number().nonnegative().optional().nullable(),
    caption: optionalShort,
    notes: optionalText,
  })
  .refine((v) => v.student_id || v.class_id || v.trick_id || v.milestone_id, {
    message: 'Attach the media to a student, class, trick or milestone',
    path: ['student_id'],
  })

// --- Settings ---------------------------------------------------------------

export const profileSchema = z.object({
  full_name: optionalShort,
  timezone: trimmed.min(1).max(60),
  theme: z.enum(['system', 'light', 'dark']),
  default_class_duration_minutes: z.coerce.number().int().min(15).max(480),
  default_term_weeks: z.coerce.number().int().min(1).max(52),
  default_start_time: isoTime,
  default_attendance_present: z.coerce.boolean(),
})

export const levelSchema = z.object({
  name: trimmed.min(1, 'Name the level').max(60),
  color: trimmed.max(20).default('slate'),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
})

export const categorySchema = z.object({
  kind: z.enum(['trick', 'exercise']),
  name: trimmed.min(1, 'Name the category').max(60),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
})

export const templateSchema = z.object({
  name: trimmed.min(1, 'Name the template').max(120),
  description: optionalText,
  level_id: optionalUuid,
  objective: optionalText,
  homework: optionalText,
  notes: optionalText,
})

// --- Auth -------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const resetRequestSchema = z.object({
  email: z.email('Enter a valid email address'),
})

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
