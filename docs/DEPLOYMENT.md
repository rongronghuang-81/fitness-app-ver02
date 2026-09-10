# Deployment

Pole Studio runs on **Supabase** (database, auth, storage) and **Vercel**
(the Next.js app). Both have free tiers that comfortably fit one instructor.

---

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) → **New project**.
2. Pick a region close to you — **Southeast Asia (Singapore)** for a Singapore
   instructor. Region affects every request's latency, and it cannot be changed
   later.
3. Set a strong database password and store it in your password manager.
4. Wait for provisioning (a minute or two).

Collect these from **Project Settings → API**:

| Value | Used as |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` — **server/local only** |

> The `anon` key is safe in the browser *only* because Row Level Security is
> enabled on every table. Never disable RLS. Never put the `service_role` key
> into a `NEXT_PUBLIC_*` variable or into Vercel's client-exposed environment.

---

## 2. Apply the migrations

```bash
npm install -g supabase          # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>   # from the project URL

supabase db push                 # applies supabase/migrations in order
```

This creates every table, index, constraint, trigger, function, RLS policy, the
private `student-media` storage bucket and its policies.

Verify:

```bash
supabase db lint
```

The last migration contains a guard that fails loudly if any table in `public`
ships without RLS enabled, so a successful push is itself a check.

To confirm the policies by hand, open **Database → Policies** in the Dashboard.
Every table should list four owner-scoped policies (`profiles` has two, and
`skill_statuses` one read-only policy).

---

## 3. Configure authentication

Under **Authentication → Providers → Email**:

- **Enable email provider** — on
- **Confirm email** — on for production
- **Enable sign-ups** — **off**. This app is private; you create the single
  account yourself (see the README).

Under **Authentication → URL Configuration**:

- **Site URL** — `https://your-domain.com`
- **Redirect URLs** — add `https://your-domain.com/auth/callback`
  (and `http://localhost:3000/auth/callback` while developing)

Under **Authentication → Email Templates**, configure SMTP if you want password
reset to actually deliver. Supabase's built-in sender is heavily rate-limited
and unsuitable for production.

---

## 4. Check the storage bucket

Migration `…0800_storage.sql` creates `student-media` already. Confirm under
**Storage**:

- Bucket `student-media` exists and is **not** public
- File size limit: 500 MB
- Four policies (select / insert / update / delete), each scoped to
  `(storage.foldername(name))[1] = auth.uid()::text`

If the bucket shows as public, stop and fix it — that would expose student media.

---

## 5. Deploy to Vercel

1. Push this repository to GitHub.
2. At [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Framework preset: **Next.js** (detected automatically). No build-command
   changes are needed.
4. Add environment variables under **Settings → Environment Variables**:

   | Name | Value | Environments |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your project URL | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key | Production, Preview, Development |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` | Production |

   Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel. The application never
   reads it; only the local seed script does.

5. **Deploy.**

### Custom domain

**Settings → Domains** → add your domain and follow the DNS instructions. Then
update `NEXT_PUBLIC_SITE_URL`, and Supabase's **Site URL** and **Redirect URLs**,
to match — otherwise password-reset links will point at the wrong host.

---

## 6. Create your account

Dashboard → **Authentication → Users → Add user → Create new user**. Enter your
email and a strong password and tick **Auto Confirm User**.

Triggers create your profile and seed your starter levels and categories
automatically. Sign in at `https://your-domain.com/login`.

---

## 7. Install it on your phone

**iPhone (Safari):** open the site → Share → **Add to Home Screen**.
**Android (Chrome):** open the site → menu → **Install app** (or the prompt).

It then launches full-screen with its own icon. The service worker caches the
app shell, so it opens and navigates on a weak studio connection; live data
still needs the network, and a failed navigation shows the offline page rather
than a browser error.

---

## Production checklist

- [ ] `enable_signup` is **off** in Supabase Auth
- [ ] Email confirmation on, SMTP configured
- [ ] Site URL and redirect URLs match the deployed domain
- [ ] `student-media` bucket is **private**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **not** set in Vercel
- [ ] Every table shows RLS enabled in Database → Policies
- [ ] Signed out in a private window, `https://your-domain.com/dashboard`
      redirects to `/login`
- [ ] Daily backups enabled (Database → Backups), or a scheduled `supabase db dump`
- [ ] A test upload appears in the gallery and is unreachable when signed out

---

## Upgrading later

Migrations are forward-only and numbered. To change the schema:

```bash
supabase migration new describe_the_change
# edit the generated file in supabase/migrations/
supabase db reset      # verify locally, from scratch
npm run test:sql       # re-run the RLS and workflow suites
supabase db push       # apply to production
```

Never edit an already-applied migration, and never change the production schema
by hand in the Dashboard — the migration history is what makes a rebuild
reproducible.

When you change the schema, also update `src/types/database.ts` and re-run
`npm run typecheck`. Compare against generated types with:

```bash
supabase gen types typescript --local
```

---

## Troubleshooting

**"Missing environment variable NEXT_PUBLIC_SUPABASE_URL"** — the variable is
absent from the deployment environment. Add it in Vercel and redeploy;
environment changes do not apply to existing builds.

**Signed in, but every page is empty** — RLS is doing its job and the rows do
not belong to you. Check that `owner_id` on your data matches your user id.

**Password-reset emails never arrive** — SMTP is not configured, or the redirect
URL is not on the allow list.

**Media shows as a broken image** — signed URLs expire after 30 minutes; reload
the page. If it persists, confirm the storage policies applied.

**Local `supabase start` fails** — Docker is not running, or ports 54321–54323
are in use.
