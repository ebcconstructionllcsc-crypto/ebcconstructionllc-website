import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/proposal.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'http://terminal.local/app/proposal.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => ({
  beginPath() {}, clearRect() {}, closePath() {}, fill() {}, fillRect() {}, fillText() {},
  lineTo() {}, moveTo() {}, arc() {}, stroke() {}
});
window.print = () => {};
window.sessionStorage.setItem('ebc-proposal-from-quote', JSON.stringify({
  transferVersion: 1,
  transferredAt: '2026-07-31T01:00:00.000Z',
  fields: {
    'quote-number': 'EBC-PRO-001',
    'quote-date': '2026-07-30',
    'valid-through': '2026-08-14',
    'quote-language': 'en',
    'client-name': 'Professional Client',
    'client-phone': '(864) 555-0100',
    'client-email': 'client@example.com',
    'project-address': '8 Test Dr, Greenville, SC 29605',
    'plan-shape': 'rectangle',
    'plan-a': '18',
    'plan-b': '40',
    thickness: '4',
    'plan-finish': 'Broom finish',
    discount: '1000',
    tax: '0',
    'payment-1': '30',
    'payment-2': '45',
    'payment-3': '25'
  },
  items: [
    { description: 'Reinforced floor slab', qty: 1, unit: 'lump sum', rate: 13500 },
    { description: 'Concrete entrance', qty: 1, unit: 'lump sum', rate: 17500 }
  ],
  quoteRender: {
    image: 'data:image/png;base64,proposal-render'
  }
}));

for (const script of ['proposal-core.js', 'proposal.js']) {
  window.eval(fs.readFileSync(path.join(root, `app/${script}`), 'utf8'));
}

assert.equal(window.document.querySelector('#proposal-app').hidden, false);
assert.equal(window.document.querySelector('#proposal-empty').hidden, true);
assert.equal(window.document.querySelector('#proposal-number').textContent, 'EBC-PRO-001');
assert.equal(window.document.querySelector('#proposal-client').textContent, 'Professional Client');
assert.equal(window.document.querySelector('#proposal-total').textContent, '$30,000.00');
assert.equal(window.document.querySelectorAll('.package-card').length, 2);
assert.equal(window.document.querySelectorAll('#proposal-pricing tr').length, 2);
assert.equal(window.document.querySelectorAll('#proposal-payments tr').length, 3);
assert.match(window.document.querySelector('#proposal-area').textContent, /720\.0/);
assert.match(window.document.querySelector('#proposal-acceptance').textContent, /separate construction agreement/i);
assert.ok(window.document.querySelector('#included-list').children.length >= 4);
assert.ok(window.document.querySelector('#exclusions-list').children.length >= 4);
assert.equal(window.document.querySelector('#render-page').hidden, false);
assert.match(window.document.querySelector('#proposal-render').src, /^data:image\/png/);

console.log('Professional proposal view checks passed.');