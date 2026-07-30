import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const readme = read('README.md');
const configuration = read('docs/CONFIGURATION.md');
const ledger = read('docs/SUPABASE_MIGRATION_LEDGER.md');
const schema = read('supabase/schema.sql');
const staffSecurityMigration = read('supabase/staff-security-migration.sql');
const productionPreflight = read('supabase/production-preflight.sql');
const renderMigration = read('supabase/render-migration.sql');
const invoiceMigration = read('supabase/invoice-migration.sql');

const newProjectSection = readme.match(
  /### New Supabase project([\s\S]*?)### Existing EBC Supabase project/
)?.[1];
const existingProjectSection = readme.match(
  /### Existing EBC Supabase project([\s\S]*?)\*\*Important:/
)?.[1];

assert.ok(newProjectSection, 'README must define the new-project migration path');
assert.ok(existingProjectSection, 'README must define the existing-project migration path');
assert.match(readme, /docs\/SUPABASE_MIGRATION_LEDGER\.md/);
assert.match(configuration, /SUPABASE_MIGRATION_LEDGER\.md/);

assert.match(schema, /create table if not exists public\.render_jobs/i);
assert.match(schema, /create table if not exists public\.invoices/i);
assert.doesNotMatch(newProjectSection, /`supabase\/render-migration\.sql`/);
assert.doesNotMatch(newProjectSection, /`supabase\/invoice-migration\.sql`/);

for (const migration of [
  'staff-security-migration.sql',
  'site-media-migration.sql',
  'quotes-migration.sql',
  'public-intake-hardening.sql',
  'render-migration.sql',
  'invoice-migration.sql'
]) {
  assert.match(existingProjectSection, new RegExp(migration.replace('.', '\\.')));
  assert.match(ledger, new RegExp(migration.replace('.', '\\.')));
}

for (const migration of [
  'staff-security-migration.sql',
  'site-media-migration.sql',
  'quotes-migration.sql',
  'public-intake-hardening.sql',
  'render-migration.sql',
  'invoice-migration.sql'
]) {
  const migrationSql = read(`supabase/${migration}`);
  assert.match(migrationSql, /^\s*begin;/im, `${migration} must start an explicit transaction`);
  assert.match(migrationSql, /^\s*commit;/im, `${migration} must commit its transaction`);
}

assert.match(renderMigration, /existing EBC project/i);
assert.match(invoiceMigration, /existing EBC project/i);
assert.match(ledger, /\*\*Production state:\*\* \*\*UNVERIFIED\*\*/);
assert.match(ledger, /Do not execute production SQL/i);
assert.match(ledger, /agczzdjxnytjzgprvcxq/);
assert.match(ledger, /submission_token.*does not exist/i);
assert.match(ledger, /Bucket not found.*project-files/i);

const compactStaffMigration = staffSecurityMigration.replace(/\s+/g, ' ');
assert.match(staffSecurityMigration, /^\s*begin;/im);
assert.match(staffSecurityMigration, /^\s*commit;/im);
assert.match(
  compactStaffMigration,
  /create or replace function public\.set_updated_at\(\).*set search_path = public.*as \$\$/i
);
assert.match(staffSecurityMigration, /YOUR_ADMIN_EMAIL/);
assert.match(staffSecurityMigration, /active_admin_required/i);
for (const table of [
  'staff_profiles',
  'leads',
  'clients',
  'projects',
  'project_files',
  'audit_log'
]) {
  assert.match(
    staffSecurityMigration,
    new RegExp(`alter table public\\.${table} enable row level security`, 'i')
  );
}
assert.match(
  compactStaffMigration,
  /insert into storage\.buckets.*'project-files'.*on conflict \(id\) do update.*public = false/i
);

const executablePreflight = productionPreflight
  .replace(/--.*$/gm, '')
  .split(';')
  .map(statement => statement.trim())
  .filter(Boolean);

assert.ok(executablePreflight.length >= 5, 'production preflight must cover the release gate');
for (const statement of executablePreflight) {
  assert.match(statement, /^(select|with)\b/i, 'production preflight must remain read-only');
}
assert.match(productionPreflight, /pg_policies/i);
assert.match(productionPreflight, /storage\.buckets/i);
assert.match(productionPreflight, /submission_token/i);
assert.match(productionPreflight, /set_updated_at/i);

console.log('Supabase migration ledger checks passed.');
