import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'app/quotes-center.js'), 'utf8');
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

for (const id of [
  'quotes',
  'quote-summary',
  'quote-search',
  'quote-filter',
  'quote-list',
  'recent-quotes',
  'metric-quotes',
  'metric-quoted-value'
]) {
  if (!html.includes(`id="${id}"`)) fail(`EBC Manager is missing #${id}`);
}

const requiredBehaviors = [
  ['cloud quote query', /\.from\('quotes'\)\s*\.select/],
  ['status update', /\.from\('quotes'\)\.update\(\{ status \}\)/],
  ['quote builder handoff', /localStorage\.setItem\('ebc-quote-draft'/],
  ['saved quote opening', /window\.openSavedQuote/],
  ['quote duplication', /window\.duplicateSavedQuote/],
  ['search and status filtering', /filteredQuotes\(\)/],
  ['missing migration handling', /quotes-migration\.sql/],
  ['accepted value reporting', /quote-value-accepted/]
];

for (const [label, pattern] of requiredBehaviors) {
  if (!pattern.test(script)) fail(`Quote center is missing ${label}`);
}

if (/\.from\('quotes'\)\.delete\(/.test(script)) {
  fail('Quote center must not delete business quotes from the browser');
}

if (!/quoteId:\s*duplicate \? null : quote\.id/.test(script)) {
  fail('Duplicated quotes may overwrite the source quote');
}

if (!/revision/.test(script)) {
  fail('Quote center does not expose quote revision history context');
}

if (failures) process.exit(1);
console.log('Quote center checks passed.');
