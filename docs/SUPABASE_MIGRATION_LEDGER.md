# Supabase migration ledger

**Owner:** EBC Software, coordinated with EBC Manager

**Technical approval:** Rictor

**Production state:** **UNVERIFIED**

**Issue:** #9 — certify Supabase migrations and security

This ledger is the canonical order for the SQL files currently stored in this repository. It separates the expected schema from the state actually observed in Supabase. A checked-in file is not evidence that production ran it.

## Release gate

Do not execute production SQL until all of these conditions are recorded:

- exact Supabase project and environment confirmed without copying credentials;
- recoverable backup or platform restore point confirmed;
- maintenance owner and window identified;
- current schema, policies, buckets, functions, and migration history captured;
- first administrator account identified;
- rollback decision and stop conditions approved by Rictor.

Do not paste access tokens, passwords, service-role keys, customer records, email addresses, or user UUIDs into this document or a GitHub issue.

## Canonical order

| SQL file | New project | Existing project | Required foundation | Purpose and replay note |
|---|---:|---:|---|---|
| `supabase/schema.sql` | 1 | Do not run as an upgrade | Empty/new Supabase project | Consolidated core CRM, staff authorization, audit, storage, render, and invoice objects. It is a new-project baseline, not a general existing-project migration. |
| `supabase/staff-security-migration.sql` | Included | 1 | Existing core tables and `set_updated_at()` | Replaces broad authenticated access with approved-staff policies and audit controls. Bootstrap the first admin in the same maintenance session. |
| `supabase/site-media-migration.sql` | 4 | 3 | Staff functions, audit function, `project-files` bucket | Adds website media and public read policy for the `website/` folder. Designed for replay after staff hardening. |
| `supabase/quotes-migration.sql` | 5 | 4 | Core CRM tables, staff and audit functions | Adds quotes, immutable revisions, RLS, triggers, and indexes. |
| `supabase/public-intake-hardening.sql` | 6 | 5 | Leads, project files, and `project-files` bucket | Replaces anonymous direct lead inserts with a validated idempotent RPC and tightens upload metadata and extensions. |
| `supabase/render-migration.sql` | Included in schema | 6 | Projects, staff and audit functions, Storage | Existing-project upgrade for private render jobs and buckets. Edge Function deployment and billable image generation are separate release steps. |
| `supabase/invoice-migration.sql` | Included in schema | 7 | Staff and audit functions | Existing-project upgrade for private invoices. Its shared `set_updated_at()` definition must retain `search_path = public`. |

Steps 2 and 3 for a new project are operational actions: create the first Supabase Authentication user, then run the administrator bootstrap statement at the bottom of `schema.sql`.

Step 2 for an existing project is the administrator bootstrap statement at the bottom of `staff-security-migration.sql`. Do not leave the hardened environment without an active admin.

## New-project runbook

1. Confirm that the target is empty and create a restore point if the platform already contains any objects.
2. Run `supabase/schema.sql`.
3. Create the first Authentication user.
4. Bootstrap that user as an active `admin`.
5. Run `supabase/site-media-migration.sql`.
6. Run `supabase/quotes-migration.sql`.
7. Run `supabase/public-intake-hardening.sql`.
8. Run the verification matrix below.

Do not run the separate render or invoice migrations after the current consolidated schema; those objects are already included.

## Existing-project runbook

1. Capture a recoverable backup and the current object/policy inventory.
2. Run `supabase/staff-security-migration.sql`.
3. Bootstrap the first active administrator in the same maintenance session.
4. Run `supabase/site-media-migration.sql`.
5. Run `supabase/quotes-migration.sql`.
6. Run `supabase/public-intake-hardening.sql`.
7. Run `supabase/render-migration.sql`.
8. Run `supabase/invoice-migration.sql`.
9. Run the verification matrix below.
10. Deploy `generate-render` only through a separate approved release after its secret names, JWT verification, origin restrictions, daily limit, and external billing are confirmed.

Stop immediately on a SQL error, missing dependency, unexpected existing policy, failed bootstrap, or loss of approved-staff access. Do not continue down the list hoping a later migration repairs the environment.

## Read-only preflight evidence

Capture results without customer data or identifiers:

```sql
select
  to_regclass('public.staff_profiles') as staff_profiles,
  to_regclass('public.leads') as leads,
  to_regclass('public.clients') as clients,
  to_regclass('public.projects') as projects,
  to_regclass('public.project_files') as project_files,
  to_regclass('public.audit_log') as audit_log,
  to_regclass('public.quotes') as quotes,
  to_regclass('public.quote_versions') as quote_versions,
  to_regclass('public.render_jobs') as render_jobs,
  to_regclass('public.invoices') as invoices;

select role, is_active, count(*) as staff_count
from public.staff_profiles
group by role, is_active
order by role, is_active;

select id, public, file_size_limit
from storage.buckets
where id in ('project-files', 'render-inputs', 'project-renders')
order by id;
```

If `staff_profiles` does not yet exist, skip the staff-count query and record that fact.

## Verification matrix

### Database and security

- [ ] Every private table has RLS enabled.
- [ ] A valid active admin can access the private CRM.
- [ ] An authenticated user absent from `staff_profiles` is rejected.
- [ ] Anonymous users cannot insert directly into `leads`.
- [ ] `submit_estimate_request` accepts a valid request and returns the same lead for the same submission token.
- [ ] Invalid service, size, or file metadata is rejected.
- [ ] `project-files`, `render-inputs`, and `project-renders` remain private.
- [ ] Private-file access uses signed URLs.
- [ ] Insert, update, and delete actions create append-only `audit_log` records.
- [ ] `set_updated_at()` reports `search_path=public` in `pg_proc.proconfig`.

### Business workflows

- [ ] A lead survives partial attachment failure.
- [ ] Website media exposes only active records and the approved `website/` path.
- [ ] Quote creation produces revision 1.
- [ ] A meaningful quote update increments the revision and creates an immutable snapshot.
- [ ] Quote-center status changes persist and are audited.
- [ ] Invoice access is limited to the active owning staff user.
- [ ] Render jobs and files are limited to the active owning staff user.
- [ ] One low-quality render is tested only after billing and rate limits are approved.

## Execution record

Fill one row per attempted production step. Leave the table unchanged until real evidence exists.

| UTC time | Environment | File/action | Git SHA | Operator | Result | Evidence reference | Rollback/next action |
|---|---|---|---|---|---|---|---|
| — | Production unverified | No migrations executed by this PR | — | — | Blocked | Issue #9 | Await backup, environment inventory, and Rictor approval |

## Rollback policy

These migrations add tables, functions, triggers, policies, grants, indexes, and storage configuration. A generic reverse script could destroy records or reopen access, so this repository does not prescribe automatic `drop table` rollback.

Use one of these controlled paths:

1. restore the verified pre-migration backup;
2. apply a reviewed forward fix that restores the captured policies and behavior;
3. stop application traffic and escalate when neither path is proven.

Never delete production tables, buckets, files, users, quotes, invoices, leads, or audit records as an improvised rollback.
