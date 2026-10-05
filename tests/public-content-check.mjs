import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { preparePages } from '../scripts/prepare-pages.mjs';
const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ebc-public-')), 'site');
try {
  preparePages(output);
  for (const excluded of ['docs','tests','supabase','README.md','package.json','scripts']) assert.ok(!fs.existsSync(path.join(output,excluded)), excluded);
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (/\.(html|js|json|xml|txt|css|webmanifest)$/i.test(file)) {
        const source = fs.readFileSync(file, 'utf8');
        assert.ok(!/warrant(?:y|ies)|garant[ií]a|priceRange|\$\s*[1-9]|\b\d+(?:\.\d+)?\s*(?:per square foot|por pie cuadrado)/i.test(source), path.relative(output,file));
      }
      assert.ok(!/\.(pdf|docx?|xlsx?|csv|zip|sql)$/i.test(file), 'unexpected downloadable document: '+file);
    }
  }
  inspect(output);
  assert.ok(fs.existsSync(path.join(output,'app/quote.js')), 'manager remains available');
  assert.ok(fs.readFileSync('app/quote.js','utf8').includes("const defaultTerms = { en: '', es: '' }"));
  console.log('Public artifact: no commercial warranty/pricing content or development/server documents; manager available without embedded company terms.');
} finally { fs.rmSync(path.dirname(output), { recursive: true, force: true }); }
