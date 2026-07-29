# EBC Construction LLC Website

Official public website and private operations application for EBC Construction LLC.

## Public website

The repository contains the bilingual marketing site for concrete, grading, excavation, pavers, landscaping, and remodeling services. Public pages are designed for GitHub Pages and connect estimate submissions to Supabase.

Project media must use original EBC photographs and videos. Do not replace source media, apply filters, overwrite originals, or introduce AI-styled edits.

## Private application

The private application is served from `/app/` and uses Supabase authentication and row-level security. It currently includes:

- estimate requests and customer attachments;
- clients and project tracking;
- project scheduling;
- bilingual, cloud-backed quotes with revision history and local recovery;
- conceptual 2D/3D plan previews;
- configurable 30% / 45% / 25% payment schedule;
- private jobsite files;
- public website photo and video management.

Private CRM and storage access is granted only to users listed as active in `public.staff_profiles`. A Supabase Authentication account by itself is not sufficient.

## Verification

Use Node.js 20 or newer, then run:

```bash
npm test
```

The command performs:

- static HTML, selector, and local-file checks;
- security regression checks for credentials, authentication guards, approved-staff policies, storage rules, audit logging, quote versioning, and critical RLS assumptions;
- JavaScript syntax checks for the private manager, quote builder, and plan tool.

GitHub Actions runs the same verification for pushes and pull requests targeting `main`.

## Configuration and security

- Configuration strategy: [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md)
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

### Existing EBC Supabase project

Run:

1. `supabase/staff-security-migration.sql`
2. Bootstrap the first administrator using the statement at the bottom of that migration.
3. Run `supabase/site-media-migration.sql` again; it is idempotent and applies the hardened media policies and audit trigger.
4. Run `supabase/quotes-migration.sql` to enable cloud-backed quotes and immutable revision history.

**Important:** complete the first-administrator bootstrap in the same maintenance session. Until an active administrator exists in `public.staff_profiles`, authenticated users will not have access to private CRM records or project files.

The quote builder keeps a local recovery copy, but Supabase is the authoritative source after a quote is saved. Each meaningful cloud update creates a numbered immutable snapshot in `quote_versions`.

After migration, verify anonymous estimate submission, approved staff access, rejected non-staff access, private-file signed URLs, website media visibility, quote create/update/history behavior, and audit-log creation before production use.
