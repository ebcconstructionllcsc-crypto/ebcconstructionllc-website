import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules'].includes(entry.name)) return [];
      return walk(absolute);
    }
    return [absolute];
  });
}

const runtimeFiles = walk(root).filter(file => {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  return /^(?:app|assets|supabase)\//.test(relative) && /\.(?:html|js|sql)$/.test(relative);
});

const forbiddenSecrets = [
  { pattern: /sb_secret_[a-zA-Z0-9_-]+/g, label: 'Supabase secret key' },
  { pattern: /SUPABASE_SERVICE_ROLE(?:_KEY)?/g, label: 'Supabase service-role environment variable' },
  { pattern: /service_role\s*[:=]\s*['"][^'"]+['"]/gi, label: 'hard-coded service-role credential' }
];

for (const file of runtimeFiles) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const content = fs.readFileSync(file, 'utf8');
  for (const secret of forbiddenSecrets) {
    if (secret.pattern.test(content)) fail(`${relative} contains a ${secret.label}`);
    secret.pattern.lastIndex = 0;
  }
}

const schema = read('supabase/schema.sql');
const mediaMigration = read('supabase/site-media-migration.sql');

const requiredSchemaRules = [
  ['private project-files bucket', /values\s*\(\s*'project-files'\s*,\s*'project-files'\s*,\s*false/i],
  ['RLS on leads', /alter table public\.leads enable row level security/i],
  ['RLS on clients', /alter table public\.clients enable row level security/i],
  ['RLS on projects', /alter table public\.projects enable row level security/i],
  ['RLS on project files', /alter table public\.project_files enable row level security/i],
  ['restricted anonymous lead creation', /for insert to anon with check \(source = 'website'\)/i],
  ['restricted incoming upload folder', /bucket_id='project-files' and \(storage\.foldername\(name\)\)\[1\]='incoming'/i]
];

for (const [label, pattern] of requiredSchemaRules) {
  if (!pattern.test(schema)) fail(`supabase/schema.sql is missing ${label}`);
}

if (!/alter table public\.site_media enable row level security/i.test(mediaMigration)) {
  fail('supabase/site-media-migration.sql is missing RLS on site_media');
}
if (!/bucket_id = 'project-files' and \(storage\.foldername\(name\)\)\[1\] = 'website'/i.test(mediaMigration)) {
  fail('site media public reads are not restricted to the website folder');
}

const quoteHtml = read('app/quote.html');
const quoteScript = read('app/quote.js');
if (!quoteHtml.includes('id="auth-check"') || !quoteHtml.includes('id="quote-app" hidden')) {
  fail('quote builder must remain hidden until authentication succeeds');
}
if (!/quoteDb\.auth\.getSession\(\)/.test(quoteScript)) {
  fail('quote builder does not verify the Supabase session');
}

if (failures) process.exit(1);
console.log('Security checks passed.');
