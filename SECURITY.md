# Security policy

## Supported deployment

The supported production deployment is the current `main` branch together with the Supabase schema and migrations documented in this repository.

## Reporting a vulnerability

Do not open a public GitHub issue containing customer data, credentials, private file URLs, database records, or reproduction steps that expose another person's information.

Report suspected vulnerabilities privately to:

- ebcconstructionllcsc@gmail.com

Include the affected page or workflow, the expected behavior, the observed behavior, and the minimum information needed to reproduce the problem. Remove customer names, addresses, phone numbers, photographs, contracts, invoices, signatures, and access tokens whenever possible.

## Credential rules

- Supabase publishable/anonymous browser keys are public identifiers and must be protected by row-level security.
- Supabase service-role or secret keys must never appear in browser code or the repository.
- Database passwords, email credentials, signing secrets, payment secrets, and webhook secrets belong only in trusted server-side secret storage.
- Rotate any private credential immediately if it is exposed.

## Data-access rules

- Every private table and storage bucket must use row-level security or an equivalent server-side authorization boundary.
- Public estimate submission must be limited to creating a lead and uploading permitted files into the designated incoming path.
- Customer-facing access must be scoped to the authenticated customer's own records.
- Signed documents and accepted commercial terms must be versioned and immutable.
- Original project photos and videos must not be overwritten by generated previews or edited derivatives.

## Required verification

Run `npm test` before publishing. Security-sensitive changes must include policy or migration review, tests, rollback instructions, and confirmation that no service-role credential is used in browser code.
