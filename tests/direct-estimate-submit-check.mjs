import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/direct-estimate-submit.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/direct-estimate-submit.css'), 'utf8');
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

if (!html.includes('assets/direct-estimate-submit.css')) {
  fail('contact.html does not load the direct estimate styles');
}
if (!html.includes('assets/direct-estimate-submit.js')) {
  fail('contact.html does not load the direct estimate controller');
}

const enhancementsIndex = html.indexOf('assets/contact-enhancements.js');
const directIndex = html.indexOf('assets/direct-estimate-submit.js');
if (enhancementsIndex < 0 || directIndex < enhancementsIndex) {
  fail('the direct estimate controller must load after the existing review controller');
}

const requiredScriptPatterns = [
  ['official Edge Function endpoint', /https:\/\/agczzdjxnytjzgprvcxq\.supabase\.co\/functions\/v1\/submit-estimate/],
  ['direct delivery mode', /submissionMode\s*=\s*'direct'/],
  ['multipart payload', /new FormData\(\)/],
  ['direct POST request', /fetch\(ENDPOINT,[\s\S]*method:\s*'POST'/],
  ['photo attachment loop', /for \(const file of \[\.\.\.photosInput\.files\]\)/],
  ['manager confirmation reference', /Request received in EBC Manager/],
  ['Spanish manager confirmation', /Solicitud recibida en EBC Manager/],
  ['single direct send button', /direct-estimate-submit/],
  ['request timeout', /REQUEST_TIMEOUT_MS/]
];

for (const [label, pattern] of requiredScriptPatterns) {
  if (!pattern.test(script)) fail(`direct estimate controller is missing ${label}`);
}

for (const field of ['name', 'phone', 'email', 'address', 'service', 'preferred_timing', 'project', 'locale', 'photos']) {
  if (!script.includes(`'${field}'`)) fail(`direct estimate payload is missing ${field}`);
}

if (/sb_secret_|service_role\s*[:=]/i.test(script)) {
  fail('direct estimate browser code contains a private credential');
}
if (!/#direct-estimate-status/.test(css) || !/#direct-estimate-submit/.test(css)) {
  fail('direct estimate status and button styles are incomplete');
}
if (!/data-state="success"/.test(css) || !/data-state="error"/.test(css)) {
  fail('direct estimate styles are missing success or error states');
}

if (failures) process.exit(1);
console.log('Direct estimate submission checks passed.');
