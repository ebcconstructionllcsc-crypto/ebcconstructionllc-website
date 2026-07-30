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

assert.match(renderMigration, /existing EBC project/i);
assert.match(invoiceMigration, /existing EBC project/i);
assert.match(ledger, /\*\*Production state:\*\* \*\*UNVERIFIED\*\*/);
assert.match(ledger, /Do not execute production SQL/i);

console.log('Supabase migration ledger checks passed.');
