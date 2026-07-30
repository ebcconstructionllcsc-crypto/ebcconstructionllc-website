# Supabase migration ledger

**Owner:** EBC Software, coordinated with EBC Manager

**Technical approval:** Rictor

**Production state:** **UNVERIFIED**

**Environment confirmation:** **`main` / PRODUCTION; Free Plan; no platform backups**

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
| `supabase/staff-security-migration.sql` | Included | 1 | Existing core tables and an existing Supabase Auth user | Atomically defines the shared trigger function, bootstraps the first admin, and replaces broad authenticated access with approved-staff policies and audit controls. It rolls back unless an active admin exists. |
| `supabase/site-media-migration.sql` | 4 | 3 | Staff functions, audit function, `project-files` bucket | Adds website media and public read policy for the `website/` folder. Designed for replay after staff hardening. |
| `supabase/quotes-migration.sql` | 5 | 4 | Core CRM tables, staff and audit functions | Adds quotes, immutable revisions, RLS, triggers, and indexes. |
| `supabase/public-intake-hardening.sql` | 6 | 5 | Leads, project files, and `project-files` bucket | Replaces anonymous direct lead inserts with a validated idempotent RPC and tightens upload metadata and extensions. |
| `supabase/render-migration.sql` | Included in schema | 6 | Projects, staff and audit functions, Storage | Existing-project upgrade for private render jobs and buckets. Edge Function deployment and billable image generation are separate release steps. |
| `supabase/invoice-migration.sql` | Included in schema | 7 | Staff and audit functions | Existing-project upgrade for private invoices. Its shared `set_updated_at()` definition must retain `search_path = public`. |

Steps 2 and 3 for a new project are operational actions: create the first Supabase Authentication user, then run the administrator bootstrap statement at the bottom of `schema.sql`.

For an existing project, replace `YOUR_ADMIN_EMAIL` in `staff-security-migration.sql` before its first run. The migration performs the bootstrap inside an explicit transaction and aborts rather than leaving a hardened environment without an active admin.

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

1. Run `supabase/production-preflight.sql` and retain its metadata-only output.
2. Capture a recoverable backup and confirm the maintenance window.
3. Create or identify the intended administrator in Supabase Authentication.
4. Replace `YOUR_ADMIN_EMAIL` in `supabase/staff-security-migration.sql` and run the complete transaction.
5. Verify that the active administrator can sign in and that an unapproved authenticated user is rejected.
6. Run `supabase/site-media-migration.sql`.
7. Run `supabase/quotes-migration.sql`.
8. Run `supabase/public-intake-hardening.sql`.
9. Run `supabase/render-migration.sql`.
10. Run `supabase/invoice-migration.sql`.
11. Run the verification matrix below.
12. Deploy `generate-render` only through a separate approved release after its secret names, JWT verification, origin restrictions, daily limit, and external billing are confirmed.

Stop immediately on a SQL error, missing dependency, unexpected existing policy, failed bootstrap, or loss of approved-staff access. Do not continue down the list hoping a later migration repairs the environment.

## Read-only preflight evidence

Run `supabase/production-preflight.sql` from the Supabase SQL Editor. Every executable statement in that file is read-only and returns schema, RLS, policy, function, trigger, bucket, migration-history, and grant metadata without selecting customer rows.

For an iPhone operator, run the table/RLS and expected-column statements first, then run `supabase/production-preflight-mobile.sql`. The mobile follow-up is one read-only CTE query that consolidates the remaining policy expressions, functions, triggers, buckets, migration-history state, and grants into one result table.

### Public API probe observed on 2026-07-30

The website and repository consistently identify project ref `agczzdjxnytjzgprvcxq`. An owner-supplied Supabase Dashboard screenshot confirms that the selected `main` environment is labeled **PRODUCTION**.

- The Dashboard identifies the organization/project as **Free Plan**.
- Database Backups states: `Free Plan does not include project backups`.
- No scheduled backup or platform restore point is available for the production project.
- Zero-row REST probes returned **present** for `leads`, `clients`, `projects`, and `project_files`.
- Zero-row REST probes returned **missing** for `staff_profiles`, `audit_log`, `site_media`, `quotes`, `quote_versions`, `render_jobs`, and `invoices`.
- The `leads.submission_token` probe returned `column leads.submission_token does not exist`, so public intake hardening has not been applied.
- Storage metadata probes returned `Bucket not found` for `project-files`, `render-inputs`, and `project-renders`.
- The `generate-render` Edge Function preflight returned HTTP 404.
- The public REST catalog correctly required a secret API key, so policy definitions, migration history, administrator status, backups, and exact RLS state remain unverified.
- No customer rows were requested, no credentials were copied, and no database or storage mutation was attempted.

**Interim verdict:** this is a partial existing-project state without a platform backup. Do not run `schema.sql`, purchase an upgrade, or execute any production migration from this PR. Continue only after the authenticated SQL preflight and a recoverable manual logical backup of the existing production data.

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
| 2026-07-30T03:58:58Z | `main` / PRODUCTION | Owner verification of Database Backups page | `1975289` | Edgar / Rictor | Free Plan; no project backups; no writes | Direction Técnica screenshot and Issue #9 | Require manual logical backup before any migration |
| 2026-07-30T03:43:49Z | Configured project `agczzdjxnytjzgprvcxq`; production role unconfirmed | Public zero-row schema, bucket, auth-settings, and function probes | `71e51d4` | Rictor | Partial existing state; no writes | Issue #9 | Require administrative preflight and backup; do not migrate |
| — | Production unverified | No migrations executed by this PR | — | — | Blocked | Issue #9 | Await backup, environment inventory, and Rictor approval |

## Rollback policy

These migrations add tables, functions, triggers, policies, grants, indexes, and storage configuration. A generic reverse script could destroy records or reopen access, so this repository does not prescribe automatic `drop table` rollback.

Use one of these controlled paths:

1. restore the verified pre-migration backup;
2. apply a reviewed forward fix that restores the captured policies and behavior;
3. stop application traffic and escalate when neither path is proven.

Never delete production tables, buckets, files, users, quotes, invoices, leads, or audit records as an improvised rollback.
