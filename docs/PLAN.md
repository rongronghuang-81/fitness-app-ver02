# Pole Studio — Implementation Plan

A private teaching-management app for a single freelance pole fitness instructor
(Singapore). "My digital teaching notebook + class calendar + student progress
tracker + trick/conditioning library."

---

## 1. Repository inspection

The repository was empty at the start of this work (a bare git repo on branch
`claude/pole-fitness-instructor-app-m727z0`, no commits, no files). Nothing was
overwritten or rewritten; everything here is new.

## 2. Technology choices

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Server Components + Server Actions keep secrets server-side |
| Language | TypeScript 5.9, `strict: true` + `noUncheckedIndexedAccess` | Spec requires strict TS |
| UI | React 19 + Tailwind CSS v4 | Fast iteration, CSS-first theming via `@theme` |
| Accessible primitives | Radix UI (`radix-ui` unified package) | Mature, accessible, unstyled — dialogs/sheets/tabs/popovers |
| Backend | Supabase (Postgres + Auth + Storage + RLS) | Spec requirement |
| Auth transport | `@supabase/ssr` cookie sessions + `middleware.ts` | Session persistence and route protection |
| Validation | Zod 4, shared client/server schemas | Server-side validation for every mutation |
| Mutations | Next.js Server Actions | No public API surface to secure separately |
| Dates | `date-fns` + `date-fns-tz` | Weekly date generation, Asia/Singapore display |
| Icons | `lucide-react` | Light, consistent |
| PWA | Hand-written service worker + web manifest | No build-plugin coupling to the Next major; predictable caching |
| Tests | Vitest (unit) + Vitest integration suite against local Supabase | Pure logic always runs; DB/RLS tests gated on env |
| Deploy | Vercel + Supabase | Spec requirement |

Deliberately **not** used: `next-pwa` (unmaintained against Next 16), any ORM
(Supabase client + SQL migrations are enough and keep RLS authoritative), and any
heavyweight design system (a small internal UI kit keeps the coaching aesthetic).

## 3. Proposed folder structure

```
.
├── docs/                        PLAN.md, SCHEMA.md, DEPLOYMENT.md
├── supabase/
│   ├── migrations/              numbered, forward-only SQL migrations
│   ├── seed.sql                 taxonomy defaults applied on db reset
│   └── tests/                   pgTAP RLS tests
├── scripts/seed-demo.ts         demo students/terms/classes/tricks (service role, local)
├── public/                      manifest, icons, sw.js
├── src/
│   ├── middleware.ts            session refresh + route protection
│   ├── app/
│   │   ├── (auth)/              login, forgot-password, update-password
│   │   ├── (app)/               authenticated shell: dashboard, calendar, classes,
│   │   │                        students, terms, tricks, exercises, progress,
│   │   │                        templates, search, settings
│   │   ├── auth/                callback + signout route handlers
│   │   └── api/media/           signed-URL issuing route
│   ├── actions/                 server actions, one module per domain
│   ├── components/
│   │   ├── ui/                  button, card, input, sheet, tabs, badge, empty-state…
│   │   ├── nav/                 desktop sidebar, mobile tab bar, more-sheet
│   │   └── <domain>/            students/, terms/, classes/, library/, media/, progress/
│   ├── lib/
│   │   ├── supabase/            browser / server / middleware / admin clients
│   │   ├── domain/              pure business logic (schedule generation, attendance
│   │   │                        maths, lesson copying, CSV) — unit tested
│   │   └── validation/          Zod schemas shared by forms and actions
│   └── types/database.ts        hand-maintained DB types
└── tests/                       unit/ (always runs) + integration/ (gated on env)
```

Business logic lives in `src/lib/domain` as pure functions so it is unit-testable
without a database; presentation stays in `components/`; I/O stays in `actions/`.

## 4. Ambiguities identified, and the assumptions taken

1. **`attendance` vs `student_class_records` vs `class_students`.** The conceptual
   schema lists all three, but they describe one row per (class, student):
   attendance status plus per-student notes. Three tables would need constant
   synchronisation and could disagree about whether a student attended.
   **Assumption:** consolidate into one table, `class_students`, carrying the roster
   link, attendance status, and the per-student record fields. All the relationships
   the spec requires are preserved. Read-only views named `attendance` and
   `student_class_records` are provided for export/reporting compatibility.
2. **Planned vs actual lesson.** Modelled as two rows in `class_lessons`
   discriminated by `kind` (`planned` | `actual`), unique per class, rather than two
   tables. The "actual" row is created by copying the planned row at completion time,
   so the plan is never overwritten.
3. **Levels on tricks.** §19 requires a trick to belong to potentially multiple
   levels, so tricks use a `trick_levels` join table. Exercises and terms keep a
   single `level_id` (§22 and §9 describe one level each).
4. **Skill-progress statuses must be extensible.** A Postgres enum cannot be
   extended inside a transaction cleanly, so status is `text` with a foreign key to a
   `skill_statuses` lookup table. New statuses are one INSERT.
5. **Attendance default.** §16 says "Default to Present only when explicitly selected
   or configured." **Assumption:** new rosters start at `unmarked`; a per-instructor
   setting (`default_attendance_present`, off by default) enables Present-by-default,
   and the completion flow offers a one-tap "Mark all present".
6. **Timezone.** Single instructor in Singapore. Class dates are stored as `date` and
   times as `time` (wall-clock, no timezone maths on scheduling), with
   `Asia/Singapore` as the display default stored on the profile. This avoids
   off-by-one class dates around midnight UTC.
7. **Multi-instructor future.** Every row carries `owner_id → profiles.id`. V1 has one
   account; the column plus RLS means a second instructor is additive, not a rewrite.
8. **Media thumbnails.** No server-side transcoding in V1. Photo thumbnails are
   generated in the browser on upload (canvas) and stored alongside the original;
   videos fall back to a poster frame captured client-side where the browser allows,
   otherwise an icon placeholder. No third-party image service.
9. **Term weeks.** 4/6/8 are presets; `number_of_weeks` is an integer 1–52 so
   "custom" is supported without a separate concept.
10. **Public holidays.** Not modelled. Individual classes can be cancelled or
    rescheduled after generation, which covers the case without a holiday calendar.

## 5. Delivery phases

**Phase 1 — foundation & core workflow**
Project setup, migrations for profiles/taxonomy/students/terms/classes/lessons,
RLS on every table, auth (login, logout, reset), app shell + navigation, dashboard,
student CRUD, term CRUD with automatic weekly class generation, class pages,
attendance, lesson plans.

**Phase 2 — teaching library**
Tricks, exercises, configurable levels and categories, trick↔trick relationships
(prerequisite / progression / regression / related), trick↔exercise links, lesson
templates, inline quick-add, favourites.

**Phase 3 — progression & media**
`student_skill_progress`, milestones, Supabase Storage with private bucket and
signed URLs, mobile upload flow, student progress dashboard, Quick Class Completion
mode.

**Phase 4 — polish**
PWA (manifest, icons, service worker, offline shell), global search, filters,
CSV export, performance passes (indexes, pagination, lazy media), accessibility
and mobile UX polish, tests, documentation.

## 6. Out of scope for V1 (per §59)

Payments, booking, invoicing, marketplace, public/social feeds, student-facing
accounts or chat, class discovery, subscription billing, marketing automation,
AI-generated lessons, multi-business SaaS, native apps. The schema is
owner-scoped and normalised so these remain possible later, but none are built.
