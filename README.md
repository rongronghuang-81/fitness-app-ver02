# Pole Studio

A private teaching-management app for a freelance pole fitness instructor.

> My digital teaching notebook + class calendar + student progress tracker +
> trick/conditioning library.

Built for one instructor teaching small-group classes (1–3 students) in fixed
weekly terms of 4, 6 or 8 weeks. The measure of success is simple: **can I open
this on my phone after class and record what mattered in two to four minutes?**

---

## Contents

- [What it does](#what-it-does)
- [Stack](#stack)
- [Quick start](#quick-start)
- [Creating the first instructor account](#creating-the-first-instructor-account)
- [Your first student, term, class, trick and exercise](#your-first-student-term-class-trick-and-exercise)
- [How media uploads work](#how-media-uploads-work)
- [Backups and export](#backups-and-export)
- [Security model](#security-model)
- [Testing](#testing)
- [Project layout](#project-layout)
- [Deployment](#deployment)
- [Not in V1](#not-in-v1)

---

## What it does

**Plan** — Create a term (4, 6, 8 or any number of weeks) and every weekly class
date is generated for you. Build a structured lesson plan from your own trick and
exercise libraries, copy last week's lesson, or apply a saved template.

**Teach** — Open today's class on your phone. One tap per student for attendance.
Tick off what you actually covered.

**Record** — The Complete Class flow is four short steps: who came, what you
taught, per-student notes with an inline skill update and milestone, then wrap up.
The planned lesson is never overwritten, so you can see later that Janeiro was
planned and postponed, not simply absent.

**Track** — Each student has attendance history with a percentage, skill
progression with automatic date stamping, a milestone timeline, private media,
and their notes from every class.

**Build** — A trick library with prerequisites, progressions, regressions and
related skills; a conditioning library linked to the tricks it prepares for,
readable from either side.

---

## Stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Language | TypeScript 5.9, `strict` + `noUncheckedIndexedAccess` |
| UI | React 19, Tailwind CSS v4, Radix UI primitives |
| Backend | Supabase — PostgreSQL, Auth, Storage, Row Level Security |
| Validation | Zod 4, shared between forms and server actions |
| Tests | Vitest (unit + component), SQL suites against real PostgreSQL |
| PWA | Web manifest, generated icons, hand-written service worker |
| Hosting | Vercel + Supabase |

---

## Quick start

**Prerequisites:** Node 20.9+, the [Supabase CLI](https://supabase.com/docs/guides/cli),
and Docker (for `supabase start`).

```bash
git clone <your-repo-url> pole-studio
cd pole-studio
npm install

cp .env.example .env.local     # then fill it in — see below

supabase start                 # local Postgres, Auth, Storage and Studio
supabase db reset              # applies every migration in supabase/migrations

npm run seed:demo              # optional: realistic demo data
npm run dev                    # http://localhost:3000
```

`supabase start` prints your local API URL and keys. Put them in `.env.local`:

| Variable | Where it comes from | Exposed to the browser? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase start` output, or Dashboard → Project Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same, the `anon` key | Yes — safe only because RLS is on |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your domain in production | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Same, the `service_role` key | **Never.** Seed script only |
| `SEED_INSTRUCTOR_EMAIL` / `SEED_INSTRUCTOR_PASSWORD` | Your choice | No |

`.env.local` is gitignored. Never commit real keys.

---

## Creating the first instructor account

The app is private and **public sign-up is disabled** (`supabase/config.toml`,
`[auth] enable_signup = false`). There is no registration page by design: you
create the one account deliberately.

**Locally**, the demo seed creates it for you:

```bash
npm run seed:demo
# signs in with SEED_INSTRUCTOR_EMAIL / SEED_INSTRUCTOR_PASSWORD
```

**In production**, create it once from the Supabase Dashboard:

1. Open your project → **Authentication** → **Users** → **Add user**.
2. Choose **Create new user**, enter your email and a strong password, and tick
   **Auto Confirm User**.
3. Click **Create user**.

That is all. A database trigger (`on_auth_user_created`) creates your profile
row, and a second trigger seeds your starter levels and trick/exercise
categories, so the app is usable the moment you sign in.

To sign in: go to `/login`. To change your password later, use **Forgot your
password?** — Supabase emails a link that returns you to `/update-password`.
(Configure SMTP under **Authentication → Email** in production, or password
reset emails will not send.)

**Adding a second instructor later** is possible without a schema change: every
table already carries `owner_id`, and RLS scopes all data by it. Create another
auth user and they get their own isolated workspace.

---

## Your first student, term, class, trick and exercise

The whole loop takes about five minutes.

### 1. A student

**Students** → **Add student**. A first name is the only required field — type
`Sarah` and save. Everything else (level, goals, contact details, notes) can be
filled in whenever you like.

### 2. A term, and its classes

**Terms** → **New term**. Fill in:

- **Name** — `Intermediate Pole — September 2026`
- **Start date** — `2026-09-09`
- **Class day** — Wednesday
- **Start time** — 19:00, **Duration** — 60 minutes
- **Number of weeks** — tap the **6 weeks** preset

As you type, the form shows exactly which classes will be created:

```
Week 1 — Wed, 9 Sep 2026     Week 4 — Wed, 30 Sep 2026
Week 2 — Wed, 16 Sep 2026    Week 5 — Wed, 7 Oct 2026
Week 3 — Wed, 23 Sep 2026    Week 6 — Wed, 14 Oct 2026
```

Save, and all six class records exist. If your start date is not on the chosen
weekday, week 1 rolls forward to the first matching day.

Individual classes can then be **rescheduled, cancelled, restored, retimed or
annotated** without affecting the rest of the term. Extending a term later adds
only the new weeks — classes you have already taught are never touched.

### 3. Enrol the student

On the term page, **Enrol** → pick Sarah. A database trigger adds her to every
class in the term that has not been taught yet, so you never build a roster
class by class.

### 4. A trick and an exercise

**Tricks** → **Add trick**: `Shoulder Mount`, difficulty 4, tick the
*Intermediate* level and the *Mounts* category, add your key cues.

**Exercises** → **Add exercise**: `Scapular Pull`, target area *Shoulder*,
3 sets of 8.

Then, on the trick page, **Link** the Scapular Pull as preparation. Open the
exercise and it now lists Shoulder Mount under *Tricks this supports* — the link
is one row, readable from both ends.

You never have to visit these pages to create library items: while planning a
lesson, type `scap` into the picker and, if nothing matches, tap
**Create "scap…"** to add it inline.

### 5. Plan week 1

Open the term → **Week 1** → **Lesson plan**. Add exercises to Warm-up and
Conditioning, tricks to Tricks & skills, free-text notes anywhere. Set the
objective and homework.

### 6. Teach and record

On your phone, open the class and tap **Complete class**:

1. **Who came** — one tap per student, or *Everyone came*.
2. **What you taught** — tick items off; anything unticked stays on the plan as
   not taught.
3. **Student notes** — a note, an achievement, optionally mark a trick achieved
   and record a milestone, and add a photo or video.
4. **Wrap up** — general class notes, then **Mark class complete**.

Each step saves as you go, so an interruption never loses what you entered.

### 7. Week 2, from week 1

Open week 2 → **Copy week 1** → choose which sections to bring across → edit.

---

## How media uploads work

Student photos and video are private. Nothing about the flow produces a public
URL.

**Uploading.** Tap **+ Media** (on a class, or from the completion flow). Choose
**Take photo / video** — which opens the camera directly on a phone — or pick
from the camera roll. Choose the student and the trick, add a caption, save.

**What happens under the hood:**

1. The browser asks the server for an upload path. The server mints
   `{your-user-id}/{student-id}/{uuid}.{ext}` — the path always begins with your
   own user id, so a tampered client cannot write into anyone else's namespace.
2. The file is validated for type (JPEG, PNG, WebP, HEIC, AVIF, MP4, MOV, WebM)
   and size (500 MB limit) on both sides.
3. The bytes go straight to the **private** `student-media` bucket.
4. For photos, a 400px JPEG thumbnail is generated in the browser and uploaded
   alongside, so galleries never download full-size originals.
5. A `media` row records the metadata — path, type, size, caption, and the
   student / class / trick / milestone it belongs to. Bytes live in Storage;
   only metadata lives in Postgres.

**Viewing.** The gallery asks the server for **signed URLs valid for 30
minutes**, and the server only signs paths for rows RLS lets you read. A signed
-out visitor can reach nothing: the bucket is private, storage policies compare
the first path segment to `auth.uid()`, and the service worker never caches
storage responses.

**Deleting** removes the metadata row and the underlying file (and thumbnail)
together. If the metadata insert fails after an upload, the orphaned bytes are
cleaned up immediately.

---

## Backups and export

**Export (in the app).** **Settings → Export your data** produces CSV files
generated server-side under RLS, with no third-party service involved:

- **Students** — names, contact details, level, joined date, goals
- **Attendance** — every attendance record with date, term, week and student
- **Class history** — all classes with turnout, status, theme and notes
- **Skill progression** — every tracked skill with its full date history

Each file is UTF-8 with a BOM and CRLF line endings, so it opens cleanly in
Excel and Numbers as well as in Sheets.

**Full database backup.** Supabase takes automatic daily backups on paid plans
(Dashboard → **Database** → **Backups**). To take one yourself:

```bash
# Whole database, schema and data
supabase db dump --db-url "$DATABASE_URL" -f backup.sql

# Data only, for restoring into a fresh project
supabase db dump --db-url "$DATABASE_URL" --data-only -f data.sql
```

Find `DATABASE_URL` under **Project Settings → Database → Connection string**.
Restore with `psql "$DATABASE_URL" -f backup.sql`.

**Storage files** are not in a database dump. Back them up separately:

```bash
supabase storage cp --recursive ss://student-media ./media-backup
```

---

## Security model

This is private teaching data about real people, so the boundary is the
database, not the UI.

- **Row Level Security is enabled *and forced* on every table** in `public`,
  with explicit per-command policies. Every owner-scoped table uses the same
  predicate, `owner_id = auth.uid()`.
- **`anon` is granted nothing.** An unauthenticated request with a valid anon
  key reads zero rows from every table.
- **`owner_id` is stamped by a trigger** from the session, so a client cannot
  insert a row into another instructor's data even by sending a forged id.
- **Storage is private**, keyed by owner id, and served only through short-lived
  signed URLs.
- **The service-role key is never imported** by any page, route or action — only
  by the local seed script, which refuses to run in a browser.
- **The session is verified with `getUser()`**, not `getSession()`, so a
  tampered cookie cannot fake an identity.
- **Middleware route protection is a convenience, not the boundary.** A request
  that slipped past it would still read nothing.
- Every mutation re-validates its input with Zod on the server, whatever the
  form already checked.
- Login and password-reset responses are deliberately vague, so neither
  enumerates which email addresses have accounts.
- `?next=` and auth-callback redirects accept same-origin relative paths only,
  rejecting protocol-relative forms (`//host`, `/\host`) and smuggled schemes.
- A media metadata row can only claim a storage path under the caller's own
  prefix, so a forged path is refused at write time as well as at read time.

All of this is tested — see below.

---

## Testing

```bash
npm test              # unit + component tests (128 tests, no setup needed)
npm run test:sql      # migrations + RLS + workflow against real PostgreSQL
npm run typecheck     # strict TypeScript, including database-type guards
npm run lint
```

**`npm test`** covers weekly date generation (including the worked example from
the brief, leap days and year boundaries), term rescheduling, attendance maths,
planned-vs-actual diffing, skill-status handling, CSV escaping, redirect safety,
validation schemas, and component behaviour — form accessibility, empty states,
the mobile bottom bar, and one-tap attendance.

It also asserts **WCAG AA contrast straight from the design tokens** in
`src/app/globals.css`, in both themes: body, muted and subtle text on every
surface; each status colour on its own soft fill and on plain surfaces; the
accent and the primary button label; and a 3:1 focus ring. Badge text is 12px,
so the 4.5:1 normal-text threshold applies rather than 3:1. This matters
because the browser audit below can only reach the screens that render without
a backend — status badges live behind authentication.

**`npm run test:a11y`** runs axe-core against a running build (sign-in flow and
the offline page) across phone and desktop widths in light and dark. Start the
app first, then point `BASE` at it. CI does both automatically.

**`npm run test:sql`** spins up a throwaway PostgreSQL database, applies a small
Supabase shim plus every migration, and runs 63 assertions:

- cross-instructor isolation on select, insert, update and delete
- anonymous access denied on tables and on private storage objects
- `owner_id` cannot be forged
- RLS enabled with at least one policy on *every* public table
- six weekly classes from a 6-week Wednesday term, matching the brief exactly
- regeneration is idempotent and never clobbers an edited or taught class
- enrolment fans the roster onto every class
- the planned lesson survives recording the actual one
- progression dates stamp correctly and back-fill
- related trick edges mirror, prerequisites stay directed, self-links rejected
- search finds students, tricks, exercises, terms and classes by partial text
- archiving a student preserves their history; referenced library items cannot
  be hard-deleted
- a drop-in added to one class survives later enrolment changes in that term
- copying a lesson onto a non-empty plan appends in order instead of colliding
- a completed class keeps its original completion time when edited later

It needs PostgreSQL 15+ server binaries (`apt install postgresql-16`, or the
Supabase CLI's bundled Postgres) but **no credentials and no Docker**.

**CI.** `.github/workflows/ci.yml` runs typecheck, lint, the unit tests, the SQL
suites (against a PostgreSQL service container) and a production build on every
push and pull request. No credentials are involved — the SQL suites use a
throwaway database and the build uses placeholder public values.

**`npm run test:integration`** runs the same security guarantees against a live
Supabase project. It is skipped unless `TEST_SUPABASE_URL`,
`TEST_SUPABASE_ANON_KEY` and `TEST_SUPABASE_SERVICE_ROLE_KEY` are set. Point
them at a local `supabase start` instance — never at production.

---

## Project layout

```
docs/                    PLAN.md (phases, assumptions), SCHEMA.md, DEPLOYMENT.md
supabase/
  migrations/            forward-only, numbered SQL migrations
  config.toml            local Supabase configuration
scripts/seed-demo.ts     realistic demo data (service role, local only)
src/
  app/
    (auth)/              login, forgot-password, update-password
    (app)/               dashboard, calendar, classes, students, terms, tricks,
                         exercises, templates, progress, search, settings
    auth/                callback and signout route handlers
    offline/             cached shell page for a failed navigation
  actions/               server actions, one module per domain
  components/            ui/ kit, nav/, and one folder per domain
  lib/
    supabase/            browser / server / middleware / admin clients
    domain/              pure business logic — unit tested, no I/O
    queries/             server-only read helpers
    validation/          Zod schemas shared by forms and actions
  types/database.ts      hand-maintained DB types (+ compile-time guards)
tests/
  unit/                  always runs
  integration/           gated on live Supabase credentials
  sql/                   migrations + RLS + workflow suites, and their runner
```

Business logic lives in `lib/domain` as pure functions, presentation in
`components/`, and I/O in `actions/` and `lib/queries`.

---

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full walkthrough
(Supabase project, migrations, storage, Vercel, custom domain, and the
production checklist).

---

## Not in V1

Deliberately excluded: payments, online booking, invoicing, student
marketplace, public or social feeds, public student profiles, student chat,
class discovery, subscription billing, marketing automation, AI-generated
lessons, multi-business SaaS features, and native iOS/Android apps.

The architecture does not preclude them — every table is owner-scoped and
normalised — but none of them is built, and none should be added without a
reason drawn from actual teaching.
