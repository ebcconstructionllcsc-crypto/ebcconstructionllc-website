import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const edge = fs.readFileSync(path.join(root, 'supabase/functions/generate-render/index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/render-migration.sql'), 'utf8');
const config = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
const client = fs.readFileSync(path.join(root, 'app/render.js'), 'utf8');

assert.match(edge, /Deno\.env\.get\('OPENAI_API_KEY'\)/);
assert.match(edge, /auth\.getUser\(\)/);
assert.match(edge, /\.from\('staff_profiles'\)/);
assert.match(edge, /idempotency_key/);
assert.match(edge, /matchesImageSignature/);
assert.match(edge, /RENDER_DAILY_LIMIT/);
assert.match(edge, /createSignedUrl/);
assert.match(edge, /output_storage_failed/);
assert.doesNotMatch(edge, /data:image\/jpeg;base64/);
assert.ok(edge.indexOf("eq('idempotency_key'") < edge.indexOf('RENDER_DAILY_LIMIT'));
assert.ok(edge.indexOf("status: 'processing'") < edge.indexOf("fetch('https://api.openai.com"));

assert.match(migration, /unique \(user_id, idempotency_key\)/);
assert.match(migration, /revoke all on public\.render_jobs from anon, authenticated/);
assert.match(migration, /\(storage\.foldername\(name\)\)\[1\]=auth\.uid\(\)::text/g);
assert.match(migration, /public=false/);
assert.match(migration, /public\.is_active_staff\(\)/);
assert.match(migration, /create trigger render_jobs_write_audit/);
assert.match(config, /verify_jwt = true/);
assert.match(client, /\.from\('staff_profiles'\)/);

console.log('Render security checks passed.');
