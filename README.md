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
- bilingual quote and conceptual-plan builder;
- configurable 30% / 45% / 25% payment schedule;
- private jobsite files;
- public website photo and video management.

## Verification

Use Node.js 20 or newer, then run:

```bash
npm test
```

The command performs:

- static HTML, selector, and local-file checks;
- security regression checks for credentials, authentication guards, storage rules, and critical RLS assumptions;
- JavaScript syntax checks for the private manager, quote builder, and plan tool.

GitHub Actions runs the same verification for pushes and pull requests targeting `main`.

## Configuration and security

- Configuration strategy: [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md)
- Prioritized technical-debt report: [`docs/TECHNICAL-DEBT.md`](docs/TECHNICAL-DEBT.md)
- Security policy: [`SECURITY.md`](SECURITY.md)

Never place Supabase service-role keys, database passwords, payment secrets, signing secrets, email credentials, or webhook secrets in browser code.

## Supabase setup

Run the SQL files in the Supabase SQL editor as documented:

1. `supabase/schema.sql`
2. `supabase/site-media-migration.sql`

After migrations, create authorized staff users in Supabase Authentication and verify all row-level security and storage policies before production use.
