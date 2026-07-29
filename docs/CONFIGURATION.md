# Configuration strategy

EBC Construction LLC is currently deployed as a static GitHub Pages site. Browser code cannot safely hold private server credentials, so configuration is divided into public and private values.

## Public browser configuration

The following values may be present in browser JavaScript:

- the Supabase project URL;
- the Supabase publishable/anonymous key;
- public business contact information;
- public map and social-media URLs.

The publishable Supabase key is not a secret. Security must come from row-level security policies, storage policies, authentication, and input validation—not from hiding this key.

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

## Supabase requirements

Before production use:

1. Run `supabase/schema.sql` once in the Supabase SQL editor.
2. Run `supabase/site-media-migration.sql` once.
3. Create staff accounts in Supabase Authentication.
4. Confirm row-level security is enabled for every private table.
5. Confirm the `project-files` bucket is private.
6. Test anonymous estimate submission separately from authenticated staff access.
7. Review policies whenever a new table, storage path, or customer-facing portal is added.

## Deployment rule

No deployment should proceed when `npm test` fails. The verification suite checks static references, JavaScript syntax, authentication guards, obvious credential exposure, and critical Supabase policy assumptions.
