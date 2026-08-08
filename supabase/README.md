# Database

Plain-SQL migrations under `migrations/`, applied in filename order. No
Supabase CLI project is linked in this sandbox (no network access to the
Supabase CLI's registry), so they're written to be pasted into the Supabase
SQL editor in order, or applied with `supabase db push` once you link a
project locally.

## Applying to a fresh Supabase project

1. Create the project at supabase.com (or self-host).
2. SQL Editor → run each file in `migrations/` in order (0001 → 0008).
3. Run `seed.sql` for placeholder barbers/services/hours you can edit from
   `/giris` afterwards.
4. Enable the **pg_cron** extension if you want reminders driven from
   Postgres instead of (or in addition to) the Vercel Cron job already
   wired up at `/api/cron/reminders` — see that route's comments.

## Verified locally

These migrations were applied and exercised against a real local
PostgreSQL 16 instance during development (schema, RLS grants/policies,
and — critically — the concurrent double-booking scenario: two
`create_appointment()` calls fired at the same barber/time/duration at
once, one committed, the other received `23P01 conflicting key value
violates exclusion constraint`, and no partial rows were left behind by
the losing transaction). See the project's commit history / PR
description for the transcript.
