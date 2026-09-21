# EBC Construction LLC Website

Official public website and private operations application for EBC Construction LLC.

## Public website

The repository contains the bilingual marketing site for EBC's concrete, grading, and excavation services. Public pages are designed for GitHub Pages and use original EBC project media.

The public estimate form reviews the request on-device first, then delivers the approved details and selected photos directly to the active EBC OS intake. The website posts only to the secured `submit-website-lead` Edge Function for the official domain. Leads are stored in the private EBC OS database, uploaded photos use the private `website-leads` bucket, and the browser never receives a service-role key.

The direct intake requires explicit consent to contact, validates required fields and image limits, restricts allowed origins, and returns an EBC confirmation reference after a successful save.

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
- a browser-level public-intake sharing flow covering request review, photo sharing, text/email fallbacks, Spanish content, invalid files, and service preselection;
- security regression checks for credentials, authentication guards, validated public intake, approved-staff policies, storage rules, audit logging, quote versioning, and critical RLS assumptions;
- dedicated quote-center workflow and preservation checks;
- JavaScript syntax checks for the public website, private manager, quote center, quote builder, and plan tool.

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
6. `supabase/public-intake-hardening.sql`
7. `supabase/render-migration.sql`
8. `supabase/invoice-migration.sql`

### Existing EBC Supabase project

Run:

1. `supabase/staff-security-migration.sql`
2. Bootstrap the first administrator using the statement at the bottom of that migration.
3. Run `supabase/site-media-migration.sql` again; it is idempotent and applies the hardened media policies and audit trigger.
4. Run `supabase/quotes-migration.sql` to enable cloud-backed quotes and immutable revision history.
5. Run `supabase/public-intake-hardening.sql` to enable validated, deduplicated estimate requests and strict public photo rules.
6. Run `supabase/render-migration.sql` to enable private render jobs and storage.
7. Run `supabase/invoice-migration.sql` to enable private invoice history.

**Important:** complete the first-administrator bootstrap in the same maintenance session. Until an active administrator exists in `public.staff_profiles`, authenticated users will not have access to private CRM records or project files.

The quote builder keeps a local recovery copy, but Supabase is the authoritative source after a quote is saved. Each meaningful cloud update creates a numbered immutable snapshot in `quote_versions`.

For production intake changes, verify the official-domain origin restriction, required contact consent, successful website lead creation, attachment metadata, private storage behavior, staff access, and the confirmation response before publication.

## Activate the private render service

The browser never receives the OpenAI API key. Source photos, masks, and outputs use private Supabase buckets scoped to the signed-in user's folder.

1. Add `OPENAI_API_KEY` as a Supabase Edge Function secret.
2. Optionally set `RENDER_DAILY_LIMIT` and `RENDER_ALLOWED_ORIGINS`.
3. Deploy `supabase/functions/generate-render` with JWT verification enabled.
4. Generate one low-quality test render before using final quality regularly.

OpenAI API billing is separate from a ChatGPT subscription. The function uses `gpt-image-2`, blocks duplicate requests with an idempotency key, records request status, and does not automatically retry a render that may already have been billed.
