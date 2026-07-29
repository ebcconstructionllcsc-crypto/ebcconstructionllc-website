# Prioritized technical-debt report

This report covers the current static public site, the private `/app/` manager, the quote/plan builder, and the Supabase schema. It is an implementation backlog, not a claim that the listed work is already complete.

## P0 — Security and data integrity

### Introduce explicit staff authorization

Current authenticated policies allow every signed-in user to manage every CRM table, project file, and website-media record. Add a staff profile/role model and make policies depend on approved EBC staff membership. Do this before adding customer accounts.

### Add abuse protection to public estimate submission

Anonymous visitors may create leads and upload files into the `incoming/` storage path. Add server-side validation, request throttling, bot protection, stricter file limits, and cleanup for abandoned uploads. Browser validation alone is not sufficient.

### Add immutable document versions

Quotes are currently saved only as a browser draft and PDFs are produced through the print dialog. Approved estimates, contracts, signatures, and invoices need immutable database versions, timestamps, author identity, and file hashes.

### Add audit logging

Create an append-only audit table for sensitive create, update, delete, status, payment, signature, publication, and file-access events.

## P1 — Reliability and maintainability

### Split the manager JavaScript into modules

`app/app.js` currently contains authentication, state, CRUD, rendering, uploads, scheduling, lead conversion, and website-media administration in one large global script. Separate API access, validation, state, views, components, and domain workflows.

### Centralize validation

Form schemas describe fields but do not provide one authoritative validation layer. Add reusable validation for names, phone numbers, email, dates, monetary values, payment percentages, project status transitions, file types, and file sizes.

### Add resilient application states

Add consistent loading, disabled, empty, retry, offline, session-expired, partial-failure, and destructive-action states. Avoid leaving controls active while writes are pending.

### Replace full-table refreshes

The manager reloads entire tables after most changes. Add pagination, incremental updates, selective refetching, and database indexes before record counts grow.

### Remove inline event handlers

Generated markup currently uses inline `onclick` handlers in several views. Replace them with delegated event listeners and data attributes to reduce global coupling and improve Content Security Policy compatibility.

### Add integration and browser smoke tests

Current tests validate static references and syntax. Add tests for login guards, CRUD flows, lead conversion, uploads, quote totals, payment validation, language switching, project scheduling, and mobile layouts.

## P1 — Core business workflows

### Persist quotes in Supabase

Move drafts from device-only `localStorage` into versioned quote records linked to leads, clients, and projects. Keep local recovery as a secondary safety mechanism.

### Build contract, invoice, and payment records

Approved quotes should create a contract workflow. Contracts should feed invoices and payment milestones while preserving the configured 30% / 45% / 25% option.

### Add project detail workspaces

Each project needs one workspace for scope, client, address, schedule, crew, notes, files, before/process/after media, costs, payments, change orders, warranty terms, and closeout documents.

### Add customer communication history

Store calls, texts, emails, notes, follow-up dates, and next actions rather than relying on free-form notes alone.

## P2 — Product quality and growth

### Complete bilingual application support

The public site supports English and Spanish, but much of the private manager interface is Spanish-only. Move all application strings into a shared bilingual dictionary with a persistent language preference.

### Improve the media workflow without editing originals

Store original uploads unchanged. Add project, service, phase, before/process/after, orientation, and featured metadata. Generate separate display thumbnails only when needed; never overwrite the source file.

### Add a customer portal

Customers should only see their own approved estimates, contracts, invoices, payment status, selected project updates, and shared files. This requires customer-specific RLS, expiring access, and careful authorization tests.

### Expand planning tools carefully

The existing 2D/3D plan preview is conceptual. Add measurements, labels, reusable shapes, area calculations, and export, while clearly separating sales visualization from engineering, architectural, survey, drainage, and permit documents.

## Delivery order

1. Staff authorization, abuse protection, audit log, and CI.
2. Modular application foundation and validation.
3. Persisted quotes and project workspaces.
4. Contracts, invoices, payments, signatures, and immutable PDFs.
5. Customer portal and notifications.
6. Enhanced media, 2D planning, and conceptual 3D previews.

Every change should be delivered in a focused pull request with tests, migration instructions, mobile verification, bilingual copy where applicable, and documented security implications.
