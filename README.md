# EBC Construction LLC Website

Official public website and private operations application for EBC Construction LLC.

## Public website

The repository contains the bilingual marketing site for concrete, grading, excavation, pavers, landscaping, and remodeling services. Public pages are designed for GitHub Pages and connect validated estimate submissions and original project photos directly to Supabase.

Public estimate requests use an idempotent database function. A retry cannot silently create duplicate leads, public uploads are restricted to conservative image types and sizes, and attachment failure does not discard the customer request.

Project media must use original EBC photographs and videos. Do not replace source media, apply filters, overwrite originals, or introduce AI-styled edits.

## Private application

The private application is served from `/app/` and uses Supabase authentication and row-level security. It currently includes:

- estimate requests and customer attachments;
- clients and project tracking;
- project scheduling;
- a searchable quote center with status updates, accepted-value reporting, duplication, and direct reopening in the builder;
- bilingual, cloud-backed quotes with revision history and local recovery;
- conceptual 2D/3D plan previews and touch-friendly freeform concrete takeoffs;
- concrete, perimeter, order quantity, waste, and gravel-base calculations transferred into quote line items;
- private AI construction renders from real jobsite photos and contractor-marked work areas;
- selectable 50% / 50% same-day and 30% / 45% / 25% multi-stage payment schedules;
- bilingual phase invoices with balance tracking, ACH, Chase Zelle, check, cash, and optional official Chase QuickAccept links;
- a no-financing/no-open-credit policy without storing bank account or routing numbers;
- private jobsite files;
- public website photo and video management.

Private CRM and storage access is granted only to users listed as active in `public.staff_profiles`. A Supabase Authentication account by itself is not sufficient.

## Verification

Use Node.js 20 or newer, then run:

```bash
npm test
```

The command performs:

- static checks across every public page and the private application;
- security regression checks for credentials, authentication guards, validated public intake, approved-staff policies, storage rules, audit logging, quote versioning, and critical RLS assumptions;
- dedicated quote-center workflow and preservation checks;
- JavaScript syntax checks for the public website, private manager, quote center, quote builder, and plan tool.

GitHub Actions runs the same verification for pushes and pull requests targeting `main`.

## Configuration and security

- Configuration strategy: [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md)
- Supabase migration ledger: [`docs/SUPABASE_MIGRATION_LEDGER.md`](docs/SUPABASE_MIGRATION_LEDGER.md)
- Prioritized technical-debt report: [`docs/TECHNICAL-DEBT.md`](docs/TECHNICAL-DEBT.md)
- Security policy: [`SECURITY.md`](SECURITY.md)

Never place Supabase service-role keys, database passwords, payment secrets, signing secrets, email credentials, or webhook secrets in browser code.

## Supabase setup

### New Supabase project

Run these files in the SQL editor:

1. `supabase/schema.sql`
2. Create the first Supabase Authentication user.
3. Run the administrator bootstrap statement documented at the bottom of `supabase/schema.sql`.
4. `supabase/site-media-migration.sql`
5. `supabase/quotes-migration.sql`
6. `supabase/public-intake-hardening.sql`

The current consolidated `supabase/schema.sql` already creates the render and invoice objects. Do not run `render-migration.sql` or `invoice-migration.sql` again for a new project created from that schema.

### Existing EBC Supabase project

Run:

1. Run the read-only `supabase/production-preflight.sql` and capture its output without customer records.
2. Confirm a recoverable backup and create or identify the intended administrator in Supabase Authentication.
3. Replace `YOUR_ADMIN_EMAIL` in `supabase/staff-security-migration.sql`, then run that entire file. Its explicit transaction bootstraps the administrator and rolls back if the access gate is not satisfied.
4. Run `supabase/site-media-migration.sql` again; it is idempotent and applies the hardened media policies and audit trigger.
5. Run `supabase/quotes-migration.sql` to enable cloud-backed quotes and immutable revision history.
6. Run `supabase/public-intake-hardening.sql` to enable validated, deduplicated estimate requests and strict public photo rules.
7. Run `supabase/render-migration.sql` to enable private render jobs and storage.
8. Run `supabase/invoice-migration.sql` to enable private invoice history.

Record every production step and its evidence in [`docs/SUPABASE_MIGRATION_LEDGER.md`](docs/SUPABASE_MIGRATION_LEDGER.md). Do not infer that a migration ran because its file exists in GitHub.

**Important:** never remove the migration transaction or bypass its active-administrator assertion. Until an active administrator exists in `public.staff_profiles`, authenticated users must not receive access to private CRM records or project files.

The quote builder keeps a local recovery copy, but Supabase is the authoritative source after a quote is saved. Each meaningful cloud update creates a numbered immutable snapshot in `quote_versions`.

After migration, verify anonymous estimate submission, duplicate-request retry behavior, partial attachment failure, approved staff access, rejected non-staff access, private-file signed URLs, website media visibility, quote create/update/history behavior, quote-center status changes, and audit-log creation before production use.

## Activate the private render service

The browser never receives the OpenAI API key. Source photos, masks, and outputs use private Supabase buckets scoped to the signed-in user's folder.

1. Add `OPENAI_API_KEY` as a Supabase Edge Function secret.
2. Optionally set `RENDER_DAILY_LIMIT` and `RENDER_ALLOWED_ORIGINS`.
3. Deploy `supabase/functions/generate-render` with JWT verification enabled.
4. Generate one low-quality test render before using final quality regularly.

OpenAI API billing is separate from a ChatGPT subscription. The function uses `gpt-image-2`, blocks duplicate requests with an idempotency key, records request status, and does not automatically retry a render that may already have been billed.
