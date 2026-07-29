# Configuration strategy

EBC Construction LLC is currently deployed as a static GitHub Pages site. Browser code cannot safely hold private server credentials, so configuration is divided into public and private values.

## Public browser configuration

The following values may be present in browser JavaScript:

- the Supabase project URL;
- the Supabase publishable/anonymous key;
- public business contact information;
- public map and social-media URLs.

The publishable Supabase key is not a secret. Security must come from row-level security policies, storage policies, authentication, approved staff membership, and input validation—not from hiding this key.

Current browser clients are initialized in:

- `app/app.js`;
- `app/quote.js`;
- the public estimate/contact workflow.

A future refactor should centralize the project URL and publishable key in one small runtime configuration file so they are not duplicated. That refactor must preserve GitHub Pages compatibility and must not introduce a build step unless the deployment workflow is updated at the same time.

## Private configuration

Never commit or expose any of the following in HTML, JavaScript, screenshots, documentation examples, or client-side storage:

- Supabase service-role or secret keys;
- database passwords;
- SMTP credentials;
- signing secrets;
- payment-provider private keys;
- webhook secrets.

Private values belong in Supabase Edge Function secrets or GitHub Actions secrets and may only be used by trusted server-side code.

## Staff authorization

A Supabase Authentication user is not automatically an EBC staff member. Private CRM, quote, and storage policies require an active record in `public.staff_profiles`.

Roles:

- `admin`: may manage staff profiles and use all staff workflows;
- `staff`: may use approved operational workflows but cannot manage staff membership.

The first administrator must be bootstrapped from the Supabase SQL editor. Do not leave a production project with an empty `staff_profiles` table after applying the hardened policies, because all private staff access will be denied until the first active administrator exists.

## Quote storage and recovery

Cloud-saved quotes live in `public.quotes`. Each meaningful update creates a numbered snapshot in `public.quote_versions`. The revision table is readable by active staff but cannot be modified directly from the browser.

The quote builder also writes a recovery draft to browser `localStorage`. This protects against accidental refreshes and temporary connectivity problems, but it is not the authoritative business record. After a cloud save succeeds, Supabase and its revision history are the source of truth.

Do not store signatures, private credentials, payment-card information, or other secrets in the local recovery draft.

## Supabase requirements

### New project

1. Run `supabase/schema.sql`.
2. Create the first user in Supabase Authentication.
3. Run the administrator bootstrap statement at the bottom of `schema.sql`.
4. Run `supabase/site-media-migration.sql`.
5. Run `supabase/quotes-migration.sql`.
6. Verify anonymous estimate submission, approved staff access, quote saving, and quote revision creation independently.

### Existing project

1. Run `supabase/staff-security-migration.sql`.
2. Bootstrap the first administrator during the same maintenance session.
3. Run `supabase/site-media-migration.sql` again to apply staff-only media policies and auditing.
4. Run `supabase/quotes-migration.sql`.
5. Confirm row-level security is enabled for every private table.
6. Confirm the `project-files` bucket is private.
7. Confirm non-staff authenticated users cannot read CRM data, quotes, quote revisions, or private files.
8. Confirm inserts, updates, and deletes create `audit_log` records.
9. Confirm meaningful quote updates increase `revision` and create matching immutable `quote_versions` rows.

Review policies whenever a new table, storage path, role, document type, or customer-facing portal is added.

## Deployment rule

No deployment should proceed when `npm test` fails. The verification suite checks static references, JavaScript syntax, authentication guards, obvious credential exposure, approved-staff policies, audit requirements, quote versioning, and critical Supabase storage assumptions.
