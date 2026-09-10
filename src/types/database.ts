/**
 * Database types.
 *
 * Hand-maintained to mirror `supabase/migrations`. Regenerate-and-diff with
 * `supabase gen types typescript --local` when the schema changes.
 */

export type LessonSection =
  | 'warmup'
  | 'conditioning'
  | 'preparation'
  | 'tricks'
  | 'combinations'
  | 'cooldown'

export type AttendanceStatus = 'unmarked' | 'present' | 'absent' | 'late' | 'excused'
export type ClassStatus = 'planned' | 'completed' | 'cancelled' | 'rescheduled'
export type TermStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type EnrolmentStatus = 'enrolled' | 'completed' | 'withdrawn'
export type LessonKind = 'planned' | 'actual'
export type LessonItemOutcome = 'planned' | 'done' | 'modified' | 'skipped'
export type TrickRelationshipType = 'prerequisite' | 'progression' | 'regression' | 'related'
export type TrickExerciseRelationship = 'preparation' | 'conditioning' | 'support'
export type CategoryKind = 'trick' | 'exercise'
export type MediaFileType = 'photo' | 'video'
export type SkillStatusCode = 'not_started' | 'introduced' | 'practising' | 'achieved' | 'consistent'

type Timestamps = { created_at: string; updated_at: string }
type Owned = { id: string; owner_id: string }

export type Profile = Timestamps & {
  id: string
  email: string
  full_name: string | null
  timezone: string
  theme: 'system' | 'light' | 'dark'
  default_class_duration_minutes: number
  default_term_weeks: number
  default_start_time: string
  default_attendance_present: boolean
}

export type Level = Owned & Timestamps & {
  name: string
  sort_order: number
  color: string
  active: boolean
}

export type Category = Owned & Timestamps & {
  kind: CategoryKind
  name: string
  sort_order: number
  active: boolean
}

export type SkillStatus = {
  code: SkillStatusCode | string
  label: string
  description: string | null
  sort_order: number
  is_achieved: boolean
}

export type Student = Owned & Timestamps & {
  first_name: string
  last_name: string | null
  preferred_name: string | null
  email: string | null
  phone: string | null
  date_joined: string
  active: boolean
  current_level_id: string | null
  goals: string | null
  general_notes: string | null
}

export type Term = Owned & Timestamps & {
  name: string
  description: string | null
  level_id: string | null
  start_date: string
  weekday: number
  start_time: string
  duration_minutes: number
  number_of_weeks: number
  location: string | null
  status: TermStatus
  notes: string | null
}

export type TermStudent = Owned & {
  term_id: string
  student_id: string
  status: EnrolmentStatus
  joined_at: string
  notes: string | null
}

export type ClassRow = Owned & Timestamps & {
  term_id: string
  week_number: number
  scheduled_date: string
  start_time: string
  duration_minutes: number
  status: ClassStatus
  theme: string | null
  general_notes: string | null
  completed_at: string | null
}

export type ClassStudent = Owned & Timestamps & {
  class_id: string
  student_id: string
  attendance_status: AttendanceStatus
  attendance_marked_at: string | null
  performance_notes: string | null
  achievements: string | null
  difficulties: string | null
  homework: string | null
  instructor_notes: string | null
}

export type ClassLesson = Owned & Timestamps & {
  class_id: string
  kind: LessonKind
  objective: string | null
  combinations: string | null
  homework: string | null
  instructor_notes: string | null
}

export type LessonItem = Owned & Timestamps & {
  lesson_id: string
  section: LessonSection
  position: number
  trick_id: string | null
  exercise_id: string | null
  free_text: string | null
  sets: number | null
  reps: string | null
  duration_seconds: number | null
  tempo: string | null
  notes: string | null
  outcome: LessonItemOutcome
}

export type LessonTemplate = Owned & Timestamps & {
  name: string
  description: string | null
  level_id: string | null
  objective: string | null
  homework: string | null
  notes: string | null
  is_favorite: boolean
  active: boolean
}

export type LessonTemplateItem = Owned & {
  template_id: string
  section: LessonSection
  position: number
  trick_id: string | null
  exercise_id: string | null
  free_text: string | null
  sets: number | null
  reps: string | null
  duration_seconds: number | null
  tempo: string | null
  notes: string | null
  created_at: string
}

export type Trick = Owned & Timestamps & {
  name: string
  description: string | null
  difficulty: number | null
  grip: string | null
  entry: string | null
  exit: string | null
  key_cues: string | null
  common_errors: string | null
  safety_notes: string | null
  instructor_notes: string | null
  is_favorite: boolean
  active: boolean
}

export type TrickLevel = Owned & {
  trick_id: string
  level_id: string
}

export type TrickCategory = Owned & {
  trick_id: string
  category_id: string
}

export type TrickRelationship = Owned & {
  from_trick_id: string
  to_trick_id: string
  relationship_type: TrickRelationshipType
  notes: string | null
  created_at: string
}

export type Exercise = Owned & Timestamps & {
  name: string
  description: string | null
  level_id: string | null
  target_area: string | null
  equipment: string | null
  sets: number | null
  reps: string | null
  duration_seconds: number | null
  tempo: string | null
  difficulty: number | null
  progression: string | null
  regression: string | null
  instructor_notes: string | null
  is_favorite: boolean
  active: boolean
}

export type ExerciseCategory = Owned & {
  exercise_id: string
  category_id: string
}

export type TrickExercise = Owned & {
  trick_id: string
  exercise_id: string
  relationship: TrickExerciseRelationship
  notes: string | null
  created_at: string
}

export type StudentSkillProgress = Owned & Timestamps & {
  student_id: string
  trick_id: string
  status: SkillStatusCode | string
  introduced_date: string | null
  first_attempted_date: string | null
  first_achieved_date: string | null
  consistent_date: string | null
  last_practised_date: string | null
  instructor_notes: string | null
}

export type Milestone = Owned & Timestamps & {
  student_id: string
  trick_id: string | null
  class_id: string | null
  achieved_on: string
  title: string
  description: string | null
  instructor_note: string | null
}

export type Media = Owned & {
  student_id: string | null
  class_id: string | null
  trick_id: string | null
  milestone_id: string | null
  storage_path: string
  thumbnail_path: string | null
  file_type: MediaFileType
  mime_type: string
  file_size: number
  duration_seconds: number | null
  caption: string | null
  notes: string | null
  created_at: string
}

export type SearchResult = {
  kind: 'student' | 'trick' | 'exercise' | 'term' | 'class'
  id: string
  title: string
  subtitle: string | null
  score: number | null
}

type Def<Row, RequiredInsert extends keyof Row = never> = {
  Row: Row
  Insert: Partial<Omit<Row, 'id' | 'created_at' | 'updated_at' | 'owner_id'>> &
    Pick<Row, RequiredInsert> & { id?: string; owner_id?: string }
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; email: string }; Update: Partial<Profile>; Relationships: [] }
      levels: Def<Level, 'name'>
      categories: Def<Category, 'kind' | 'name'>
      skill_statuses: { Row: SkillStatus; Insert: SkillStatus; Update: Partial<SkillStatus>; Relationships: [] }
      students: Def<Student, 'first_name'>
      terms: Def<Term, 'name' | 'start_date' | 'weekday' | 'start_time' | 'number_of_weeks'>
      term_students: Def<TermStudent, 'term_id' | 'student_id'>
      classes: Def<ClassRow, 'term_id' | 'week_number' | 'scheduled_date' | 'start_time'>
      class_students: Def<ClassStudent, 'class_id' | 'student_id'>
      class_lessons: Def<ClassLesson, 'class_id' | 'kind'>
      lesson_items: Def<LessonItem, 'lesson_id' | 'section'>
      lesson_templates: Def<LessonTemplate, 'name'>
      lesson_template_items: Def<LessonTemplateItem, 'template_id' | 'section'>
      tricks: Def<Trick, 'name'>
      trick_levels: Def<TrickLevel, 'trick_id' | 'level_id'>
      trick_categories: Def<TrickCategory, 'trick_id' | 'category_id'>
      trick_relationships: Def<TrickRelationship, 'from_trick_id' | 'to_trick_id' | 'relationship_type'>
      exercises: Def<Exercise, 'name'>
      exercise_categories: Def<ExerciseCategory, 'exercise_id' | 'category_id'>
      trick_exercises: Def<TrickExercise, 'trick_id' | 'exercise_id'>
      student_skill_progress: Def<StudentSkillProgress, 'student_id' | 'trick_id'>
      milestones: Def<Milestone, 'student_id' | 'title'>
      media: Def<Media, 'storage_path' | 'file_type' | 'mime_type' | 'file_size'>
    }
    Views: {
      attendance: { Row: Pick<ClassStudent, 'id' | 'owner_id' | 'class_id' | 'student_id' | 'attendance_status' | 'attendance_marked_at' | 'updated_at'>; Relationships: [] }
      student_class_records: { Row: Omit<ClassStudent, 'attendance_marked_at'>; Relationships: [] }
    }
    Functions: {
      generate_term_classes: { Args: { p_term_id: string }; Returns: ClassRow[] }
      sync_term_roster: { Args: { p_term_id: string }; Returns: undefined }
      copy_lesson_items: {
        Args: {
          p_source_lesson_id: string
          p_target_lesson_id: string
          p_sections?: string[] | null
          p_replace?: boolean
        }
        Returns: number
      }
      apply_template_to_lesson: {
        Args: {
          p_template_id: string
          p_target_lesson_id: string
          p_sections?: string[] | null
          p_replace?: boolean
        }
        Returns: number
      }
      global_search: { Args: { p_query: string; p_limit?: number }; Returns: SearchResult[] }
      student_display_name: {
        Args: { p_preferred: string | null; p_first: string; p_last: string | null }
        Returns: string
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
