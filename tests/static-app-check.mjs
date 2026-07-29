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
  { html: 'app/index.html', scripts: ['app/app.js', 'app/quotes-center.js'] },
  { html: 'app/quote.html', scripts: ['app/quote.js', 'app/plan.js'] },
  { html: 'app/invoice.html', scripts: ['app/invoice.js'] },
  { html: 'app/render.html', scripts: ['app/render.js'] }
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

const managerHtml = fs.readFileSync(path.join(root, 'app/index.html'), 'utf8');
for (const requiredId of [
  'quotes',
  'quote-search',
  'quote-filter',
  'quote-list',
  'recent-quotes',
  'metric-quotes',
  'metric-quoted-value'
]) {
  if (!managerHtml.includes(`id="${requiredId}"`)) fail(`app/index.html is missing quote center #${requiredId}`);
}
if (!managerHtml.includes('src="quotes-center.js"')) fail('EBC Manager does not load quotes-center.js');

const quoteHtml = fs.readFileSync(path.join(root, 'app/quote.html'), 'utf8');
if (!/<div id="quote-app" hidden>/.test(quoteHtml)) fail('The quote builder is not hidden during authentication.');
if (!quoteHtml.includes('id="auth-check"')) fail('The quote builder is missing its authentication status view.');
if (!quoteHtml.includes('id="payment-template"')) fail('The quote builder is missing its payment schedule selector.');
if (!quoteHtml.includes('value="one-day"')) fail('The quote builder is missing its one-day 50/50 schedule.');

const renderHtml = fs.readFileSync(path.join(root, 'app/render.html'), 'utf8');
if (!/<div id="render-app" hidden>/.test(renderHtml)) fail('The render builder is not hidden during authentication.');
if (!renderHtml.includes('id="consent"')) fail('The render builder is missing its photo authorization confirmation.');
if (!renderHtml.includes('conceptual')) fail('The render builder is missing its conceptual visualization notice.');

const invoiceHtml = fs.readFileSync(path.join(root, 'app/invoice.html'), 'utf8');
if (!/<div id="invoice-app" hidden>/.test(invoiceHtml)) fail('The invoice builder is not hidden during authentication.');
if (!invoiceHtml.includes('id="p-no-financing"')) fail('The invoice is missing its no-financing policy.');
if (!invoiceHtml.includes('routing')) fail('The invoice editor is missing its bank-data safety warning.');
if (!invoiceHtml.includes('id="accept-zelle"')) fail('The invoice is missing its Chase Zelle payment option.');
if (!invoiceHtml.includes('Chase invoice / QuickAccept')) fail('The invoice is missing its Chase QuickAccept link option.');

const browserFiles = ['app/app.js', 'app/quote.js', 'app/plan.js', 'app/invoice.js', 'app/invoice-core.js', 'app/render.js', 'app/render-core.js'];
for (const browserFile of browserFiles) {
  const source = fs.readFileSync(path.join(root, browserFile), 'utf8');
  if (/OPENAI_API_KEY|sk-[a-zA-Z0-9_-]{20,}/.test(source)) {
    fail(`${browserFile} exposes an image API secret.`);
  }
  if (/\b\d{9}\b/.test(source) && browserFile.includes('invoice')) {
    fail(`${browserFile} may contain a routing or account number.`);
  }
}

if (failures) process.exit(1);
console.log('Static app checks passed.');
