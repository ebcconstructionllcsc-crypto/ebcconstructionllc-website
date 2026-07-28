# EBC Construction LLC Website

Official website and private operations application for EBC Construction LLC.

## Private application

The application is served from `/app/` and uses Supabase authentication and row-level security.
It includes:

- estimate requests and customer attachments;
- clients and project tracking;
- project schedule;
- bilingual quote and concept-plan builder;
- configurable 30% / 45% / 25% payment schedule;
- private jobsite files;
- public website photo and video management.

## Verification

Run the static application checks and JavaScript syntax checks before publishing:

```bash
node tests/static-app-check.mjs
node --check app/app.js
node --check app/quote.js
node --check app/plan.js
```
