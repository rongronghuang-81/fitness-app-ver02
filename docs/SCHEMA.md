# Database schema

PostgreSQL (Supabase). UUID primary keys (`gen_random_uuid()`), `timestamptz`
timestamps, foreign keys everywhere, RLS enabled on every table in the `public`
schema.

## Ownership and RLS model

Every table carries `owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
— including the join tables. This is a deliberate denormalisation: it makes every
policy the same single-index predicate

```sql
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()))
```

instead of a recursive `EXISTS` walk up to the parent, which is both faster and much
harder to get subtly wrong. Triggers keep a child's `owner_id` consistent with its
parent so a client cannot smuggle a row into another owner's object graph.

`skill_statuses` is the one global lookup table: readable by any authenticated user,
writable by nobody through the API.

## Tables

### Identity and settings

**profiles** — one row per instructor, `id` = `auth.users.id`.
`id`, `email`, `full_name`, `timezone` (default `Asia/Singapore`), `theme`,
`default_class_duration_minutes` (60), `default_term_weeks` (6),
`default_start_time` (19:00), `default_attendance_present` (false),
`created_at`, `updated_at`.
Created automatically by an `on_auth_user_created` trigger.

**levels** — configurable, e.g. Beginner / Intermediate / Advanced.
`id`, `owner_id`, `name`, `sort_order`, `color`, `active`, timestamps.
Unique `(owner_id, lower(name))`.

**categories** — configurable, shared shape for both libraries, discriminated by
`kind`.
`id`, `owner_id`, `kind` (`trick` | `exercise`), `name`, `sort_order`, `active`,
timestamps. Unique `(owner_id, kind, lower(name))`.

**skill_statuses** *(global)* — `code` PK, `label`, `sort_order`, `is_achieved`.
Seeded with `not_started`, `introduced`, `practising`, `achieved`, `consistent`.
Adding a status is one INSERT — no enum migration.

### Students

**students** — `id`, `owner_id`, `first_name`, `last_name`, `preferred_name`,
`email`, `phone`, `date_joined`, `active`, `current_level_id → levels`, `goals`,
`general_notes`, timestamps.
Only `first_name` is required, so a student can be created from a name alone.
Archiving sets `active = false`; students are never hard-deleted while history exists.

### Terms and classes

**terms** — `id`, `owner_id`, `name`, `description`, `level_id`, `start_date`,
`weekday` (0=Sun … 6=Sat), `start_time`, `duration_minutes`, `number_of_weeks`
(1–52), `location`, `status` (`draft` | `active` | `completed` | `cancelled`),
`notes`, timestamps.

**term_students** — `id`, `owner_id`, `term_id`, `student_id`,
`status` (`enrolled` | `completed` | `withdrawn`), `joined_at`, `notes`.
Unique `(term_id, student_id)`. Any number of students per term.

**classes** — one row per weekly lesson.
`id`, `owner_id`, `term_id`, `week_number`, `scheduled_date`, `start_time`,
`duration_minutes`, `status` (`planned` | `completed` | `cancelled` |
`rescheduled`), `theme`, `general_notes`, `completed_at`, timestamps.
Unique `(term_id, week_number)`. Generated automatically from the term's
start date / weekday / week count, then individually editable.

**class_students** — the per-student class record. **Consolidates the conceptual
`class_students`, `attendance` and `student_class_records`** (see PLAN.md §4.1).
`id`, `owner_id`, `class_id`, `student_id`,
`attendance_status` (`unmarked` | `present` | `absent` | `late` | `excused`),
`attendance_marked_at`, `performance_notes`, `achievements`, `difficulties`,
`homework`, `instructor_notes`, timestamps. Unique `(class_id, student_id)`.

Read-only views `attendance` and `student_class_records` project this table under
the conceptual names for reporting and export.

### Lesson plans

**class_lessons** — `id`, `owner_id`, `class_id`, `kind` (`planned` | `actual`),
`objective`, `combinations`, `homework`, `instructor_notes`, timestamps.
Unique `(class_id, kind)`. The planned row is never mutated when the actual row is
written, which is what makes "planned vs actual" auditable.

**lesson_items** — the structured contents of a lesson section.
`id`, `owner_id`, `lesson_id`, `section` (`warmup` | `conditioning` |
`preparation` | `tricks` | `combinations` | `cooldown`), `position`,
`trick_id`, `exercise_id`, `free_text`, `sets`, `reps`, `duration_seconds`,
`tempo`, `notes`, `outcome` (`planned` | `done` | `modified` | `skipped`),
timestamps.
`CHECK (trick_id IS NOT NULL OR exercise_id IS NOT NULL OR free_text IS NOT NULL)`
— every item is either a linked library item or free text, never empty.

**lesson_templates** / **lesson_template_items** — same shape as
`class_lessons` / `lesson_items`, reusable across classes. Templates carry
`is_favorite` and `active`.

### Teaching libraries

**tricks** — `id`, `owner_id`, `name`, `description`, `category` links (below),
`difficulty` (1–5), `grip`, `entry`, `exit`, `key_cues`, `common_errors`,
`safety_notes`, `instructor_notes`, `is_favorite`, `active`, timestamps.

**trick_levels** — trick ↔ level (many-to-many, per §19).
**trick_categories** — trick ↔ category (`kind = 'trick'`, enforced by trigger).

**trick_relationships** — `id`, `owner_id`, `from_trick_id`, `to_trick_id`,
`relationship_type` (`prerequisite` | `progression` | `regression` | `related`),
`notes`. Unique `(from_trick_id, to_trick_id, relationship_type)`,
`CHECK (from_trick_id <> to_trick_id)`. `related` edges are mirrored by a trigger so
the relationship reads correctly from either trick.

**exercises** — `id`, `owner_id`, `name`, `description`, `level_id`, `target_area`,
`equipment`, `sets`, `reps`, `duration_seconds`, `tempo`, `difficulty` (1–5),
`progression`, `regression`, `instructor_notes`, `is_favorite`, `active`, timestamps.

**exercise_categories** — exercise ↔ category (`kind = 'exercise'`).

**trick_exercises** — exercise ↔ trick (many-to-many, §24).
`id`, `owner_id`, `trick_id`, `exercise_id`,
`relationship` (`preparation` | `conditioning` | `support`), `notes`.
Unique `(trick_id, exercise_id)`. Drives "related exercises" on a trick page and
"tricks this supports" on an exercise page.

### Progression, milestones, media

**student_skill_progress** — `id`, `owner_id`, `student_id`, `trick_id`,
`status → skill_statuses.code`, `introduced_date`, `first_attempted_date`,
`first_achieved_date`, `consistent_date`, `last_practised_date`,
`instructor_notes`, timestamps. Unique `(student_id, trick_id)`.
A trigger stamps the matching date column the first time a status is reached, so the
history is captured without extra typing.

**milestones** — `id`, `owner_id`, `student_id`, `trick_id?`, `class_id?`,
`achieved_on`, `title`, `description`, `instructor_note`, timestamps.

**media** — metadata only; bytes live in Supabase Storage.
`id`, `owner_id`, `student_id?`, `class_id?`, `trick_id?`, `milestone_id?`,
`storage_path`, `thumbnail_path`, `file_type` (`photo` | `video`), `mime_type`,
`file_size`, `duration_seconds`, `caption`, `notes`, `created_at`.
`CHECK` requires at least one of the four relationships.

## Storage

One **private** bucket, `student-media`. Object keys are
`{owner_id}/{student_id|_unassigned}/{uuid}.{ext}`. Storage policies compare the
first path segment to `auth.uid()`, so a logged-out request can read nothing, and a
logged-in instructor can only read their own objects. The app never builds a public
URL: it issues short-lived signed URLs from the server.

## Indexes

Covering the access patterns the spec calls out:

- `students (owner_id, active)`, trigram index on the student display name
- `classes (owner_id, scheduled_date)`, `classes (term_id, week_number)`
- `terms (owner_id, start_date)`, `terms (owner_id, status)`
- `class_students (class_id)`, `class_students (student_id)`
- trigram indexes on `tricks.name`, `exercises.name`, `terms.name`
- `student_skill_progress (student_id, status)`, `(trick_id)`
- `media (student_id, created_at DESC)`, `(class_id)`, `(trick_id)`, `(milestone_id)`
- `lesson_items (lesson_id, section, position)`
- `milestones (student_id, achieved_on DESC)`

`pg_trgm` powers partial-text search ("scap" → Scapular Pull) without a separate
search service.

## Data integrity

- Students and library items **archive** (`active = false`) rather than delete; the
  UI only offers archive where history exists.
- `ON DELETE RESTRICT` on `students.current_level_id`, `lesson_items.trick_id` and
  friends prevents a library deletion from silently rewriting history.
- Deleting a class cascades only to its own lessons, items and per-student records.
- Deleting a term cascades to its classes (with confirmation), which is why
  cancelling a term is the offered action, not deleting it.
