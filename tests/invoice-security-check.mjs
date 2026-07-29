import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/invoice-migration.sql'), 'utf8');
const client = fs.readFileSync(path.join(root, 'app/invoice.js'), 'utf8');

assert.match(migration, /alter table public\.invoices enable row level security/);
assert.match(migration, /revoke all on public\.invoices from anon/);
assert.match(migration, /user_id = auth\.uid\(\)/g);
assert.match(migration, /public\.is_active_staff\(\)/);
assert.match(migration, /create trigger invoices_write_audit/);
assert.match(migration, /unique \(user_id, invoice_number\)/);
assert.match(migration, /payment_schedule numeric\[\]/);
assert.doesNotMatch(migration, /routing_number|account_number|card_number/i);
assert.doesNotMatch(client, /\b(?:routing|account|card)[_-]?(?:number|no)\b/i);
assert.match(client, /validPaymentUrl/);
assert.match(client, /payment_methods/);
assert.match(client, /\.from\('staff_profiles'\)/);

console.log('Invoice security checks passed.');
