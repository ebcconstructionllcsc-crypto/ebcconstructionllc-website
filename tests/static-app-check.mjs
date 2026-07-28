import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const pairs = [
  { html: 'app/index.html', scripts: ['app/app.js'] },
  { html: 'app/quote.html', scripts: ['app/quote.js', 'app/plan.js'] }
];

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

for (const pair of pairs) {
  const html = fs.readFileSync(path.join(root, pair.html), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) fail(`${pair.html} contains duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);

  const idSet = new Set(ids);
  for (const scriptPath of pair.scripts) {
    const script = fs.readFileSync(path.join(root, scriptPath), 'utf8');
    const selectors = [...script.matchAll(/\$\(['"]#([a-zA-Z0-9_-]+)['"]\)/g)].map(match => match[1]);
    for (const selector of new Set(selectors)) {
      if (!idSet.has(selector)) fail(`${scriptPath} references missing #${selector} in ${pair.html}`);
    }
  }

  const localReferences = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(reference => !/^(?:https?:|tel:|sms:|mailto:|#)/.test(reference));
  for (const reference of localReferences) {
    const cleanReference = reference.split(/[?#]/)[0];
    const target = path.resolve(path.dirname(path.join(root, pair.html)), cleanReference);
    if (!fs.existsSync(target)) fail(`${pair.html} references missing local file ${reference}`);
  }
}

const quoteHtml = fs.readFileSync(path.join(root, 'app/quote.html'), 'utf8');
if (!/<div id="quote-app" hidden>/.test(quoteHtml)) fail('The quote builder is not hidden during authentication.');
if (!quoteHtml.includes('id="auth-check"')) fail('The quote builder is missing its authentication status view.');

if (failures) process.exit(1);
console.log('Static app checks passed.');
