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

function compact(content) {
  return content.replace(/\s+/g, ' ').trim();
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
const schemaOneLine = compact(schema);
const mediaMigration = read('supabase/site-media-migration.sql');
const mediaOneLine = compact(mediaMigration);
const staffMigration = read('supabase/staff-security-migration.sql');
const staffOneLine = compact(staffMigration);
const quotesMigration = read('supabase/quotes-migration.sql');
const quotesOneLine = compact(quotesMigration);
const intakeMigration = read('supabase/public-intake-hardening.sql');
const intakeOneLine = compact(intakeMigration);

const requiredSchemaRules = [
  ['staff profile table', /create table if not exists public\.staff_profiles/i],
  ['append-only audit table', /create table if not exists public\.audit_log/i],
  ['approved-staff authorization function', /create or replace function public\.is_active_staff/i],
  ['private project-files bucket', /values \( 'project-files', 'project-files', false,/i],
  ['RLS on staff profiles', /alter table public\.staff_profiles enable row level security/i],
  ['RLS on leads', /alter table public\.leads enable row level security/i],
  ['RLS on clients', /alter table public\.clients enable row level security/i],
  ['RLS on projects', /alter table public\.projects enable row level security/i],
  ['RLS on project files', /alter table public\.project_files enable row level security/i],
  ['RLS on audit log', /alter table public\.audit_log enable row level security/i],
  ['restricted anonymous lead creation', /for insert to anon with check \(source = 'website'\)/i],
  ['restricted incoming upload folder', /bucket_id = 'project-files' and \(storage\.foldername\(name\)\)\[1\] = 'incoming'/i],
  ['staff-only lead management', /active staff manage leads.*using \(public\.is_active_staff\(\)\)/i],
  ['staff-only client management', /active staff manage clients.*using \(public\.is_active_staff\(\)\)/i],
  ['staff-only project management', /active staff manage projects.*using \(public\.is_active_staff\(\)\)/i],
  ['staff-only project-file management', /active staff manage files.*using \(public\.is_active_staff\(\)\)/i],
  ['audit trigger on leads', /create trigger leads_write_audit/i],
  ['audit trigger on clients', /create trigger clients_write_audit/i],
  ['audit trigger on projects', /create trigger projects_write_audit/i],
  ['audit trigger on project files', /create trigger project_files_write_audit/i]
];

for (const [label, pattern] of requiredSchemaRules) {
  if (!pattern.test(schemaOneLine)) fail(`supabase/schema.sql is missing ${label}`);
}

if (/for all to authenticated using \(true\)/i.test(schemaOneLine)) {
  fail('supabase/schema.sql contains a broad authenticated manage-all policy');
}

if (!/alter table public\.site_media enable row level security/i.test(mediaOneLine)) {
  fail('supabase/site-media-migration.sql is missing RLS on site_media');
}
if (!/active staff manage site media.*using \(public\.is_active_staff\(\)\)/i.test(mediaOneLine)) {
  fail('site media management is not restricted to approved staff');
}
if (!/create trigger site_media_write_audit/i.test(mediaOneLine)) {
  fail('site media changes are not audited');
}
if (!/bucket_id = 'project-files' and \(storage\.foldername\(name\)\)\[1\] = 'website'/i.test(mediaOneLine)) {
  fail('site media public reads are not restricted to the website folder');
}
if (/for all to authenticated using \(true\)/i.test(mediaOneLine)) {
  fail('site media contains a broad authenticated manage-all policy');
}

if (!/REQUIRED: bootstrap the first administrator/i.test(staffMigration)) {
  fail('staff-security-migration.sql is missing first-admin bootstrap instructions');
}
if (!/public\.is_active_staff\(\)/i.test(staffOneLine)) {
  fail('staff-security-migration.sql does not enforce approved-staff access');
}

const requiredQuoteRules = [
  ['quotes table', /create table if not exists public\.quotes/i],
  ['immutable quote versions table', /create table if not exists public\.quote_versions/i],
  ['quote revision preparation trigger', /create trigger quotes_prepare_write/i],
  ['quote revision archive trigger', /create trigger quotes_archive_revision/i],
  ['quote audit trigger', /create trigger quotes_write_audit/i],
  ['RLS on quotes', /alter table public\.quotes enable row level security/i],
  ['RLS on quote versions', /alter table public\.quote_versions enable row level security/i],
  ['staff-only quote management', /active staff manage quotes.*using \(public\.is_active_staff\(\)\)/i],
  ['staff-only quote-version access', /active staff read quote versions.*using \(public\.is_active_staff\(\)\)/i],
  ['unique quote revisions', /unique \(quote_id, revision\)/i]
];

for (const [label, pattern] of requiredQuoteRules) {
  if (!pattern.test(quotesOneLine)) fail(`supabase/quotes-migration.sql is missing ${label}`);
}

if (/for all to authenticated using \(true\)/i.test(quotesOneLine)) {
  fail('quotes migration contains a broad authenticated manage-all policy');
}

const requiredIntakeRules = [
  ['idempotent submission token', /add column if not exists submission_token uuid/i],
  ['unique submission token index', /create unique index if not exists leads_submission_token_uidx/i],
  ['validated estimate RPC', /create or replace function public\.submit_estimate_request/i],
  ['security-definer estimate RPC', /security definer/i],
  ['public RPC execute grant', /grant execute on function public\.submit_estimate_request.*to anon, authenticated/i],
  ['direct anonymous lead insert removal', /drop policy if exists "public can create leads"/i],
  ['anonymous lead insert revoke', /revoke insert on public\.leads from anon/i],
  ['lead-folder metadata binding', /storage_path like 'incoming\/' \|\| lead_id::text \|\| '\/%'/i],
  ['public attachment size limit', /size_bytes between 1 and 15728640/i],
  ['public image-only metadata types', /mime_type in \( 'image\/jpeg'.*'image\/avif'/i],
  ['public image-only storage extensions', /lower\(storage\.extension\(name\)\) in \('jpg','jpeg','png','webp','heic','heif','avif'\)/i]
];

for (const [label, pattern] of requiredIntakeRules) {
  if (!pattern.test(intakeOneLine)) fail(`supabase/public-intake-hardening.sql is missing ${label}`);
}

const publicScript = read('assets/app.js');
const contactHtml = read('contact.html');
if (/formsubmit\.co/i.test(contactHtml)) {
  fail('contact.html still exposes customer submissions to an external form service');
}
if (!/data-submission-mode="local-share"/.test(contactHtml)) {
  fail('public estimate delivery is not locked to the local sharing flow');
}
if (/supabase\.co|createClient\(|\.rpc\('submit_estimate_request'|project-files/.test(publicScript)) {
  fail('public estimate runtime still connects to the uncertified production intake');
}
if (!/MAX_FILES\s*=\s*8/.test(publicScript) || !/MAX_FILE_BYTES\s*=\s*15 \* 1024 \* 1024/.test(publicScript)) {
  fail('public estimate workflow is missing conservative attachment limits');
}
if (!/navigator\.share/.test(publicScript) || !/navigator\.canShare/.test(publicScript)) {
  fail('public estimate workflow is missing device-local request and photo sharing');
}
if (!/sms:\$\{EBC_PHONE\}/.test(publicScript) || !/mailto:\$\{EBC_EMAIL\}/.test(publicScript)) {
  fail('public estimate workflow is missing prepared text and email fallbacks');
}
if (!/Your request has not been sent yet/.test(publicScript)) {
  fail('public estimate workflow does not clearly disclose the unsent state');
}

const quoteHtml = read('app/quote.html');
const quoteScript = read('app/quote.js');
if (!quoteHtml.includes('id="auth-check"') || !quoteHtml.includes('id="quote-app" hidden')) {
  fail('quote builder must remain hidden until authentication succeeds');
}
for (const id of ['saved-quotes', 'load-quote', 'save-status']) {
  if (!quoteHtml.includes(`id="${id}"`)) fail(`quote builder is missing cloud control #${id}`);
}
if (!/quoteDb\.auth\.getSession\(\)/.test(quoteScript)) {
  fail('quote builder does not verify the Supabase session');
}
if (!/\.from\('staff_profiles'\)/.test(quoteScript)) {
  fail('quote builder does not verify approved staff membership');
}
if (!/\.from\('quotes'\)/.test(quoteScript)) {
  fail('quote builder does not persist quotes in Supabase');
}
if (!/localStorage\.setItem\('ebc-quote-draft'/.test(quoteScript)) {
  fail('quote builder is missing local recovery storage');
}
if (!/validateQuote\(\)/.test(quoteScript)) {
  fail('quote builder is missing validation before save or print');
}

if (failures) process.exit(1);
console.log('Security checks passed.');
