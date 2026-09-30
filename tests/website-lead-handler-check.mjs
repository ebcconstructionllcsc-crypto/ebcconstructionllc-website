import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const source = fs.readFileSync(new URL('../supabase/functions/submit-website-lead/index.ts', import.meta.url), 'utf8');
const executable = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ''));
let checks = 0;

async function submit(overrides = {}, options = {}) {
  const saved = [];
  const uploaded = [];
  const files = [];
  const leadId = '12345678-1234-4234-8234-123456789abc';
  let handler;
  const db = {
    from(table) {
      return {
        select() { return this; },
        eq() { return this; },
        gte() { return Promise.resolve({ count: 0, error: null }); },
        order() { return this; },
        limit() { return Promise.resolve({ data: [{ id: 'test-owner' }], error: null }); },
        insert(row) {
          if (table === 'leads') {
            // The production leads.id column is NOT NULL with no database default.
            assert.match(row.id || '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'Every website lead needs its own generated UUID');
            saved.push(row);
            return { select: () => ({ single: async () => ({ data: { id: leadId }, error: null }) }) };
          }
          if (table === 'lead_files') files.push(row);
          return Promise.resolve({ error: null });
        },
        upsert: async () => ({ error: null })
      };
    },
    storage: { from: () => ({
      upload: async (path, file) => { uploaded.push({ path, size: file.size }); return { error: null }; }
    }) }
  };
  vm.runInNewContext(executable, {
    Deno: { env: { get: () => undefined }, serve: fn => { handler = fn; } },
    createClient: () => db,
    Request, Response, FormData, File, URLSearchParams, TextEncoder, crypto,
    console, fetch: () => { throw new Error('Tests must not send notifications'); }
  });
  const form = new FormData();
  const values = {
    name: 'Intake regression test', phone: '8645550100',
    email: 'ebcconstructionllcsc@gmail.com', address: 'TEST ONLY',
    service: 'Concrete / Concreto', project: 'TEST ONLY — no customer request',
    consent_to_contact: 'true', ...overrides
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  for (const photo of options.photos || []) form.append('photos', photo);
  const req = new Request('https://example.test/submit-website-lead', {
    method: 'POST', headers: { origin: options.origin || 'https://ebcconstructionllc.com' }, body: form
  });
  const response = await handler(req);
  return { status: response.status, body: await response.json(), saved, uploaded, files };
}

for (const email of ['ebcconstructionllcsc@gmail.com', 'sam.smith+patio@example.com', 'USER@EXAMPLE.COM', '']) {
  const result = await submit({ email });
  assert.equal(result.status, 201, 'A valid or optional email must allow delivery: ' + email);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.reference, 'EBC-12345678');
  assert.equal(result.saved.length, 1);
  assert.equal(result.saved[0].email, email ? email.toLowerCase() : null);
  checks++;
}

for (const email of ['sam smith@example.com', 'sam@example', 'sam@@example.com']) {
  const result = await submit({ email });
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'INVALID_EMAIL');
  assert.equal(result.saved.length, 0);
  checks++;
}

const missingConsent = await submit({ consent_to_contact: 'false' });
assert.equal(missingConsent.body.error, 'CONTACT_CONSENT_REQUIRED');
assert.equal(missingConsent.saved.length, 0);
checks++;

const wrongOrigin = await submit({}, { origin: 'https://untrusted.example' });
assert.equal(wrongOrigin.status, 403);
assert.equal(wrongOrigin.saved.length, 0);
checks++;

const photo = new File([new Uint8Array([137,80,78,71])], 'test.png', { type: 'image/png' });
const withPhoto = await submit({}, { photos: [photo] });
assert.equal(withPhoto.status, 201);
assert.equal(withPhoto.body.photos, 1);
assert.equal(withPhoto.uploaded.length, 1);
assert.equal(withPhoto.files[0].lead_id, '12345678-1234-4234-8234-123456789abc');
checks++;

const invalidPhoto = await submit({}, { photos: [new File(['bad'], 'test.txt', { type: 'text/plain' })] });
assert.equal(invalidPhoto.body.error, 'INVALID_FILE');
assert.equal(invalidPhoto.saved.length, 0);
checks++;

console.log('Website lead handler: ' + checks + ' contract checks passed.');
