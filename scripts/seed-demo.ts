/**
 * Demo/development seed (§47).
 *
 * Creates a realistic instructor account with students, terms, generated
 * classes, a full trick and exercise library with relationships, lesson plans,
 * attendance, progression and milestones — enough to click through every screen.
 *
 *   npm run seed:demo
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY. This is the ONLY place in the codebase
 * that uses the service-role key, and it is intended for a local or staging
 * project. It creates no media files: media metadata rows would point at bytes
 * that do not exist, and embedding stock footage would be a licensing problem.
 * Upload a photo through the app to exercise that path.
 */

import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

config({ path: '.env.local' })
config({ path: '.env' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.SEED_INSTRUCTOR_EMAIL ?? 'instructor@example.com'
const password = process.env.SEED_INSTRUCTOR_PASSWORD ?? 'pole-studio-demo'

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy .env.example to .env.local and fill them in first.',
  )
  process.exit(1)
}

const db: SupabaseClient<Database> = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function ensureInstructor(): Promise<string> {
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Demo Instructor' },
  })

  if (created?.user) {
    console.log(`Created instructor ${email}`)
    return created.user.id
  }

  // Already exists: find them so the seed is re-runnable.
  if (error && !/already/i.test(error.message)) throw error

  const { data: list } = await db.auth.admin.listUsers({ perPage: 200 })
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existing) throw new Error(`Could not create or find the instructor account for ${email}`)
  console.log(`Using existing instructor ${email}`)
  return existing.id
}

/** Nothing is dropped that the instructor might have typed by hand — the seed
 *  only clears rows it owns, and only for the demo account. */
async function resetDemoData(owner: string) {
  const tables = [
    'media',
    'milestones',
    'student_skill_progress',
    'lesson_items',
    'class_lessons',
    'lesson_template_items',
    'lesson_templates',
    'class_students',
    'classes',
    'term_students',
    'terms',
    'trick_exercises',
    'trick_relationships',
    'trick_categories',
    'trick_levels',
    'exercise_categories',
    'tricks',
    'exercises',
    'students',
  ] as const

  for (const table of tables) {
    const { error } = await db.from(table).delete().eq('owner_id', owner)
    if (error) throw new Error(`Clearing ${table}: ${error.message}`)
  }
}

async function main() {
  const owner = await ensureInstructor()
  await resetDemoData(owner)

  // Taxonomy is created for every new profile by a database trigger; read it
  // back rather than duplicating the list here.
  const { data: levels } = await db.from('levels').select('id, name').eq('owner_id', owner)
  const { data: categories } = await db
    .from('categories')
    .select('id, name, kind')
    .eq('owner_id', owner)

  const level = (name: string) => levels?.find((l) => l.name === name)?.id ?? null
  const category = (kind: 'trick' | 'exercise', name: string) =>
    categories?.find((c) => c.kind === kind && c.name === name)?.id ?? null

  // --- Students -------------------------------------------------------------
  const { data: students, error: studentError } = await db
    .from('students')
    .insert([
      {
        owner_id: owner,
        first_name: 'Sarah',
        last_name: 'Tan',
        email: 'sarah@example.com',
        date_joined: '2026-01-14',
        current_level_id: level('Intermediate'),
        goals: 'Clean shoulder mount, then work towards Ayesha.',
        general_notes: 'Prefers left side. Watch the right wrist after a long week at a desk.',
      },
      {
        owner_id: owner,
        first_name: 'Michelle',
        last_name: 'Lim',
        preferred_name: 'Mich',
        date_joined: '2026-02-03',
        current_level_id: level('Intermediate'),
        goals: 'Stronger invert and grip endurance.',
      },
      {
        owner_id: owner,
        first_name: 'Jane',
        last_name: 'Wong',
        date_joined: '2026-06-20',
        current_level_id: level('Beginner'),
        goals: 'Get comfortable spinning and build confidence upside down.',
      },
    ])
    .select('id, first_name')

  if (studentError) throw studentError
  const student = (name: string) => students!.find((s) => s.first_name === name)!.id

  // --- Trick library --------------------------------------------------------
  const trickSeed = [
    { name: 'Fireman Spin', difficulty: 1, cat: 'Spins', lvl: 'Beginner', grip: 'Two-hand', cues: 'Push the pole away, squeeze the ankles.' },
    { name: 'Chair Spin', difficulty: 2, cat: 'Spins', lvl: 'Beginner', grip: 'Two-hand', cues: 'Lift the knees, keep the chest tall.' },
    { name: 'Invert', difficulty: 3, cat: 'Inverts', lvl: 'Improver', grip: 'Two-hand', cues: 'Ribs in, pull with the lats before the legs move.' },
    { name: 'Crucifix', difficulty: 3, cat: 'Static holds', lvl: 'Improver', grip: 'Knee hold', cues: 'Squeeze the thigh, open the chest slowly.' },
    { name: 'Butterfly', difficulty: 4, cat: 'Inverts', lvl: 'Intermediate', grip: 'Split grip', cues: 'Long bottom arm, stack the shoulder.' },
    { name: 'Shoulder Mount', difficulty: 4, cat: 'Mounts', lvl: 'Intermediate', grip: 'Cup grip', cues: 'Pole in the shoulder pocket, drive through the elbow.' },
    { name: 'Ayesha', difficulty: 5, cat: 'Static holds', lvl: 'Advanced', grip: 'Split grip', cues: 'Push the bottom hand, do not collapse into the shoulder.' },
    { name: 'Janeiro', difficulty: 4, cat: 'Static holds', lvl: 'Intermediate', grip: 'Elbow grip', cues: 'Elbow locked to the ribs, hips stacked over the base.' },
  ]

  const { data: tricks, error: trickError } = await db
    .from('tricks')
    .insert(
      trickSeed.map((t) => ({
        owner_id: owner,
        name: t.name,
        difficulty: t.difficulty,
        grip: t.grip,
        key_cues: t.cues,
        is_favorite: ['Shoulder Mount', 'Invert'].includes(t.name),
        description: `${t.name} — taught from ${t.lvl.toLowerCase()} level upwards.`,
      })),
    )
    .select('id, name')

  if (trickError) throw trickError
  const trick = (name: string) => tricks!.find((t) => t.name === name)!.id

  await db.from('trick_categories').insert(
    trickSeed
      .map((t) => ({ owner_id: owner, trick_id: trick(t.name), category_id: category('trick', t.cat) }))
      .filter((r): r is { owner_id: string; trick_id: string; category_id: string } =>
        r.category_id !== null,
      ),
  )
  await db.from('trick_levels').insert(
    trickSeed
      .map((t) => ({ owner_id: owner, trick_id: trick(t.name), level_id: level(t.lvl) }))
      .filter((r): r is { owner_id: string; trick_id: string; level_id: string } => r.level_id !== null),
  )

  // The §21 worked example: Ayesha's prerequisites, progression and regression.
  await db.from('trick_relationships').insert([
    { owner_id: owner, from_trick_id: trick('Ayesha'), to_trick_id: trick('Invert'), relationship_type: 'prerequisite' },
    { owner_id: owner, from_trick_id: trick('Ayesha'), to_trick_id: trick('Butterfly'), relationship_type: 'prerequisite' },
    { owner_id: owner, from_trick_id: trick('Butterfly'), to_trick_id: trick('Ayesha'), relationship_type: 'progression' },
    { owner_id: owner, from_trick_id: trick('Ayesha'), to_trick_id: trick('Butterfly'), relationship_type: 'regression' },
    { owner_id: owner, from_trick_id: trick('Shoulder Mount'), to_trick_id: trick('Invert'), relationship_type: 'prerequisite' },
    { owner_id: owner, from_trick_id: trick('Janeiro'), to_trick_id: trick('Crucifix'), relationship_type: 'related' },
  ])

  // --- Exercise library -----------------------------------------------------
  const exerciseSeed = [
    { name: 'Scapular Pull', area: 'Shoulder', cat: 'Shoulder', sets: 3, reps: '8–10', notes: 'Pure scapular retraction — elbows stay straight.' },
    { name: 'Dead Hang', area: 'Grip', cat: 'Grip', sets: 3, hold: 30, notes: 'Build to 45 seconds before adding load.' },
    { name: 'Hollow Body Hold', area: 'Core', cat: 'Core', sets: 3, hold: 30, notes: 'Lower back stays pressed into the floor.' },
    { name: 'Split Hold', area: 'Hamstring', cat: 'Flexibility', sets: 2, hold: 45, notes: 'Square the hips before deepening.' },
    { name: 'Shoulder Mobility Drill', area: 'Shoulder', cat: 'Mobility', sets: 2, reps: '10', notes: 'Slow, controlled, no shrugging.' },
    { name: 'Active Compression', area: 'Hip', cat: 'Activation', sets: 3, reps: '8', notes: 'Lift the legs with the hip flexors, not momentum.' },
    { name: 'Split Squat', area: 'Hip', cat: 'Conditioning', sets: 3, reps: '10 each side' },
    { name: 'Pike Compression', area: 'Core', cat: 'Core', sets: 3, reps: '8' },
  ]

  const { data: exercises, error: exerciseError } = await db
    .from('exercises')
    .insert(
      exerciseSeed.map((e) => ({
        owner_id: owner,
        name: e.name,
        target_area: e.area,
        sets: e.sets,
        reps: e.reps ?? null,
        duration_seconds: e.hold ?? null,
        instructor_notes: e.notes ?? null,
        is_favorite: ['Scapular Pull', 'Hollow Body Hold'].includes(e.name),
      })),
    )
    .select('id, name')

  if (exerciseError) throw exerciseError
  const exercise = (name: string) => exercises!.find((e) => e.name === name)!.id

  await db.from('exercise_categories').insert(
    exerciseSeed
      .map((e) => ({
        owner_id: owner,
        exercise_id: exercise(e.name),
        category_id: category('exercise', e.cat),
      }))
      .filter((r): r is { owner_id: string; exercise_id: string; category_id: string } =>
        r.category_id !== null,
      ),
  )

  // §24's worked example: Scapular Pull supports Invert, Shoulder Mount, Ayesha.
  await db.from('trick_exercises').insert([
    { owner_id: owner, trick_id: trick('Invert'), exercise_id: exercise('Scapular Pull'), relationship: 'preparation' },
    { owner_id: owner, trick_id: trick('Shoulder Mount'), exercise_id: exercise('Scapular Pull'), relationship: 'preparation' },
    { owner_id: owner, trick_id: trick('Ayesha'), exercise_id: exercise('Scapular Pull'), relationship: 'preparation' },
    { owner_id: owner, trick_id: trick('Invert'), exercise_id: exercise('Hollow Body Hold'), relationship: 'conditioning' },
    { owner_id: owner, trick_id: trick('Shoulder Mount'), exercise_id: exercise('Dead Hang'), relationship: 'conditioning' },
    { owner_id: owner, trick_id: trick('Ayesha'), exercise_id: exercise('Shoulder Mobility Drill'), relationship: 'support' },
    { owner_id: owner, trick_id: trick('Butterfly'), exercise_id: exercise('Active Compression'), relationship: 'preparation' },
  ])

  // --- Terms and generated classes ------------------------------------------
  const termSeed = [
    { name: 'Beginner Spin Basics — Sep 2026', weeks: 4, start: '2026-09-07', weekday: 1, time: '18:00', lvl: 'Beginner', status: 'active' as const },
    { name: 'Intermediate Pole — Sep 2026', weeks: 6, start: '2026-09-09', weekday: 3, time: '19:00', lvl: 'Intermediate', status: 'active' as const },
    { name: 'Advanced Skills — Oct 2026', weeks: 8, start: '2026-10-03', weekday: 6, time: '10:00', lvl: 'Advanced', status: 'draft' as const },
  ]

  const { data: terms, error: termError } = await db
    .from('terms')
    .insert(
      termSeed.map((t) => ({
        owner_id: owner,
        name: t.name,
        start_date: t.start,
        weekday: t.weekday,
        start_time: t.time,
        duration_minutes: 60,
        number_of_weeks: t.weeks,
        level_id: level(t.lvl),
        location: 'Studio A',
        status: t.status,
      })),
    )
    .select('id, name')

  if (termError) throw termError
  const term = (name: string) => terms!.find((t) => t.name.startsWith(name))!.id

  for (const t of terms!) {
    const { error } = await db.rpc('generate_term_classes', { p_term_id: t.id })
    if (error) throw new Error(`Generating classes for ${t.name}: ${error.message}`)
  }

  // --- Enrolment (the roster trigger fans this onto every class) ------------
  await db.from('term_students').insert([
    { owner_id: owner, term_id: term('Intermediate Pole'), student_id: student('Sarah') },
    { owner_id: owner, term_id: term('Intermediate Pole'), student_id: student('Michelle') },
    { owner_id: owner, term_id: term('Beginner Spin Basics'), student_id: student('Jane') },
  ])

  // --- The §48 worked class: Intermediate week 4 ----------------------------
  const { data: week4 } = await db
    .from('classes')
    .select('id')
    .eq('term_id', term('Intermediate Pole'))
    .eq('week_number', 4)
    .single()

  if (week4) {
    await db.from('classes').update({ theme: 'Shoulder mount and Ayesha prep' }).eq('id', week4.id)

    const { data: planned } = await db
      .from('class_lessons')
      .insert({
        owner_id: owner,
        class_id: week4.id,
        kind: 'planned',
        objective: 'Clean shoulder mount entry; introduce Ayesha preparation.',
        homework: 'Scapular pulls and hollow body holds, three times this week.',
      })
      .select('id')
      .single()

    if (planned) {
      await db.from('lesson_items').insert([
        { owner_id: owner, lesson_id: planned.id, section: 'warmup', position: 0, exercise_id: exercise('Shoulder Mobility Drill') },
        { owner_id: owner, lesson_id: planned.id, section: 'conditioning', position: 0, exercise_id: exercise('Scapular Pull'), sets: 3, reps: '8' },
        { owner_id: owner, lesson_id: planned.id, section: 'conditioning', position: 1, exercise_id: exercise('Hollow Body Hold'), sets: 3, duration_seconds: 30 },
        { owner_id: owner, lesson_id: planned.id, section: 'preparation', position: 0, trick_id: trick('Invert') },
        { owner_id: owner, lesson_id: planned.id, section: 'tricks', position: 0, trick_id: trick('Shoulder Mount') },
        { owner_id: owner, lesson_id: planned.id, section: 'tricks', position: 1, trick_id: trick('Ayesha') },
        { owner_id: owner, lesson_id: planned.id, section: 'tricks', position: 2, trick_id: trick('Janeiro') },
        { owner_id: owner, lesson_id: planned.id, section: 'cooldown', position: 0, exercise_id: exercise('Split Hold') },
      ])

      // What actually happened: extra conditioning added, Janeiro postponed.
      const { data: actual } = await db
        .from('class_lessons')
        .insert({
          owner_id: owner,
          class_id: week4.id,
          kind: 'actual',
          objective: 'Clean shoulder mount entry; introduce Ayesha preparation.',
          instructor_notes: 'Ran out of time for Janeiro — carry it into week 5.',
          homework: 'Scapular pulls and hollow body holds, three times this week.',
        })
        .select('id')
        .single()

      if (actual) {
        await db.from('lesson_items').insert([
          { owner_id: owner, lesson_id: actual.id, section: 'warmup', position: 0, exercise_id: exercise('Shoulder Mobility Drill'), outcome: 'done' },
          { owner_id: owner, lesson_id: actual.id, section: 'conditioning', position: 0, exercise_id: exercise('Scapular Pull'), sets: 4, reps: '8', outcome: 'modified' },
          { owner_id: owner, lesson_id: actual.id, section: 'conditioning', position: 1, exercise_id: exercise('Hollow Body Hold'), sets: 3, duration_seconds: 30, outcome: 'done' },
          { owner_id: owner, lesson_id: actual.id, section: 'conditioning', position: 2, free_text: 'Extra shoulder conditioning', outcome: 'done' },
          { owner_id: owner, lesson_id: actual.id, section: 'preparation', position: 0, trick_id: trick('Invert'), outcome: 'done' },
          { owner_id: owner, lesson_id: actual.id, section: 'tricks', position: 0, trick_id: trick('Shoulder Mount'), outcome: 'done' },
          { owner_id: owner, lesson_id: actual.id, section: 'tricks', position: 1, trick_id: trick('Ayesha'), outcome: 'done' },
          { owner_id: owner, lesson_id: actual.id, section: 'cooldown', position: 0, exercise_id: exercise('Split Hold'), outcome: 'done' },
        ])
      }
    }

    await db
      .from('class_students')
      .update({
        attendance_status: 'present',
        achievements: 'First clean unassisted shoulder mount.',
        performance_notes: 'Strong shoulder engagement today.',
        difficulties: 'Entry still a little scrambly — slow it down.',
      })
      .eq('class_id', week4.id)
      .eq('student_id', student('Sarah'))

    await db
      .from('class_students')
      .update({
        attendance_status: 'present',
        performance_notes: 'Invert is noticeably cleaner.',
        difficulties: 'Grip strength is the limiter. Keep the dead hangs going.',
      })
      .eq('class_id', week4.id)
      .eq('student_id', student('Michelle'))

    await db
      .from('classes')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        general_notes: 'Good energy. Janeiro pushed to week 5.',
      })
      .eq('id', week4.id)

    await db.from('milestones').insert({
      owner_id: owner,
      student_id: student('Sarah'),
      trick_id: trick('Shoulder Mount'),
      class_id: week4.id,
      achieved_on: '2026-09-30',
      title: 'First successful unassisted shoulder mount',
      description: 'Held the entry cleanly on the third attempt, both sides.',
    })
  }

  // Mark weeks 1–3 as taught so attendance history is not empty.
  const { data: earlier } = await db
    .from('classes')
    .select('id')
    .eq('term_id', term('Intermediate Pole'))
    .lt('week_number', 4)

  for (const c of earlier ?? []) {
    await db.from('class_students').update({ attendance_status: 'present' }).eq('class_id', c.id)
    await db
      .from('classes')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', c.id)
  }
  // One absence, so the attendance percentage is not a flat 100%.
  const firstClass = earlier?.[0]
  if (firstClass) {
    await db
      .from('class_students')
      .update({ attendance_status: 'absent' })
      .eq('class_id', firstClass.id)
      .eq('student_id', student('Michelle'))
  }

  // --- Skill progression ----------------------------------------------------
  await db.from('student_skill_progress').insert([
    { owner_id: owner, student_id: student('Sarah'), trick_id: trick('Invert'), status: 'consistent' },
    { owner_id: owner, student_id: student('Sarah'), trick_id: trick('Shoulder Mount'), status: 'achieved' },
    { owner_id: owner, student_id: student('Sarah'), trick_id: trick('Ayesha'), status: 'introduced' },
    { owner_id: owner, student_id: student('Michelle'), trick_id: trick('Invert'), status: 'practising' },
    { owner_id: owner, student_id: student('Michelle'), trick_id: trick('Shoulder Mount'), status: 'introduced' },
    { owner_id: owner, student_id: student('Jane'), trick_id: trick('Fireman Spin'), status: 'achieved' },
    { owner_id: owner, student_id: student('Jane'), trick_id: trick('Chair Spin'), status: 'practising' },
  ])

  // --- A reusable template ---------------------------------------------------
  const { data: template } = await db
    .from('lesson_templates')
    .insert({
      owner_id: owner,
      name: 'Beginner Spin Basics',
      description: 'Standard opening lesson for a new beginner term.',
      level_id: level('Beginner'),
      objective: 'Two clean spins on both sides.',
      homework: 'Grip work: dead hangs, three sets.',
      is_favorite: true,
    })
    .select('id')
    .single()

  if (template) {
    await db.from('lesson_template_items').insert([
      { owner_id: owner, template_id: template.id, section: 'warmup', position: 0, exercise_id: exercise('Shoulder Mobility Drill') },
      { owner_id: owner, template_id: template.id, section: 'conditioning', position: 0, exercise_id: exercise('Dead Hang'), sets: 3, duration_seconds: 30 },
      { owner_id: owner, template_id: template.id, section: 'tricks', position: 0, trick_id: trick('Fireman Spin') },
      { owner_id: owner, template_id: template.id, section: 'tricks', position: 1, trick_id: trick('Chair Spin') },
      { owner_id: owner, template_id: template.id, section: 'cooldown', position: 0, exercise_id: exercise('Split Hold') },
    ])
  }

  console.log(`
Demo data ready.

  Sign in at /login
    Email:    ${email}
    Password: ${password}

  3 students, 3 terms (4/6/8 weeks) with generated classes,
  8 tricks and 8 exercises with relationships, a taught week 4 with
  planned-vs-actual, attendance, progression, a milestone, and a template.

  No media files are seeded — upload a photo through the app to try that flow.
`)
}

main().catch((error) => {
  console.error('\nSeed failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
