import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/invoice.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'http://terminal.local/app/invoice.html?preview=1',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
let copied = '';
window.alert = () => {};
window.confirm = () => true;
window.print = () => {};
window.navigator.clipboard = { async writeText(value) { copied = value; } };
window.supabase = { createClient: () => ({ auth: { async getSession() { return { data: { session: {} }, error: null }; } } }) };
window.sessionStorage.setItem('ebc-invoice-from-quote', JSON.stringify({
  quoteNumber: 'EBC-100',
  language: 'en',
  clientName: 'Test Client',
  clientPhone: '864-555-0100',
  clientEmail: 'client@example.com',
  projectAddress: '100 Main St',
  projectTotal: 10000,
  methods: ['ach', 'zelle', 'check'],
  paymentLink: '',
  paymentInstructions: 'Contact EBC for ACH instructions.',
  schedule: [50, 0, 50]
}));

for (const script of ['invoice-core.js', 'invoice.js']) {
  window.eval(fs.readFileSync(path.join(root, `app/${script}`), 'utf8'));
}
await new Promise(resolve => setTimeout(resolve, 0));

assert.equal(window.document.querySelector('#invoice-app').hidden, false);
assert.equal(window.document.querySelector('#amount-due').value, '5000.00');
assert.equal(window.document.querySelector('#balance').value, '5000.00');
assert.equal(window.document.querySelector('#p-balance').textContent, '$5,000.00');
const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);
assert.equal(window.document.querySelector('#due-date').value, localToday);
assert.match(window.document.querySelector('#notes').value, /remaining 50% is due immediately/i);
assert.match(window.document.querySelector('#p-payment-methods').textContent, /ACH/);
assert.match(window.document.querySelector('#p-payment-methods').textContent, /Zelle/);
assert.doesNotMatch(window.document.querySelector('#p-payment-methods').textContent, /Cash/);
assert.match(window.document.querySelector('#p-no-financing').textContent, /does not offer financing/i);

const phase = window.document.querySelector('#payment-phase');
phase.value = 'final';
phase.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(window.document.querySelector('#phase-percent').value, '50');
assert.equal(window.document.querySelector('#amount-due').value, '5000.00');

window.document.querySelector('#accept-online').checked = true;
window.document.querySelector('#payment-link').value = 'https://secure.chase.com/invoice-100';
window.document.querySelector('#payment-link').dispatchEvent(new window.Event('input', { bubbles: true }));
assert.equal(window.document.querySelector('#p-payment-link').hidden, false);
assert.equal(window.document.querySelector('#p-payment-link').href, 'https://secure.chase.com/invoice-100');

window.document.querySelector('#copy-message-btn').click();
await new Promise(resolve => setTimeout(resolve, 0));
assert.match(copied, /EBC Construction LLC invoice/);
assert.match(copied, /\$5,000\.00/);
assert.match(copied, /Chase invoice|QuickAccept/i);
assert.match(copied, /does not offer financing/i);

console.log('Invoice UI flow passed.');
