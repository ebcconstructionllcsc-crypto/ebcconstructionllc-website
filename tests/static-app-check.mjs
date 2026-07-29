import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const pages = [
  { html: 'index.html', scripts: ['assets/app.js'] },
  { html: 'services.html', scripts: ['assets/app.js'] },
  { html: 'projects.html', scripts: ['assets/app.js'] },
  { html: 'about.html', scripts: ['assets/app.js'] },
  { html: 'contact.html', scripts: ['assets/app.js'] },
  { html: 'app/index.html', scripts: ['app/app.js'] },
  { html: 'app/quote.html', scripts: ['app/quote.js', 'app/plan.js'] }
];

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

for (const page of pages) {
  const htmlPath = path.join(root, page.html);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) fail(`${page.html} contains duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);

  const idSet = new Set(ids);
  for (const scriptPath of page.scripts) {
    const script = fs.readFileSync(path.join(root, scriptPath), 'utf8');
    const selectors = [...script.matchAll(/\$\(['"]#([a-zA-Z0-9_-]+)['"]\)/g)].map(match => match[1]);
    for (const selector of new Set(selectors)) {
      if (!idSet.has(selector) && page.html.startsWith('app/')) {
        fail(`${scriptPath} references missing #${selector} in ${page.html}`);
      }
    }
  }

  const localReferences = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(reference => !/^(?:https?:|tel:|sms:|mailto:|#)/.test(reference));

  for (const reference of localReferences) {
    const cleanReference = reference.split(/[?#]/)[0];
    if (!cleanReference) continue;
    const target = path.resolve(path.dirname(htmlPath), cleanReference);
    if (!fs.existsSync(target)) fail(`${page.html} references missing local file ${reference}`);
  }
}

const contactHtml = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
for (const requiredId of ['estimate-form', 'name', 'phone', 'address', 'service', 'project', 'photos']) {
  if (!contactHtml.includes(`id="${requiredId}"`)) fail(`contact.html is missing #${requiredId}`);
}
if (/formsubmit\.co/i.test(contactHtml)) fail('contact.html still sends customer information to FormSubmit');
if (!/aria-live="polite"/.test(contactHtml)) fail('contact.html is missing an accessible live submission status');

const quoteHtml = fs.readFileSync(path.join(root, 'app/quote.html'), 'utf8');
if (!/<div id="quote-app" hidden>/.test(quoteHtml)) fail('The quote builder is not hidden during authentication.');
if (!quoteHtml.includes('id="auth-check"')) fail('The quote builder is missing its authentication status view.');

if (failures) process.exit(1);
console.log('Static app checks passed.');
