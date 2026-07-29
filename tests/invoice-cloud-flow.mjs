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
let updatedRecord = null;
let updatedId = '';
const stored = {
  id: '11111111-1111-4111-8111-111111111111',
  invoice_number: 'EBC-INV-CLOUD',
  quote_number: 'EBC-Q-1',
  invoice_date: '2026-07-29',
  due_date: '2026-08-05',
  status: 'Sent',
  language: 'en',
  client_name: 'Cloud Client',
  client_phone: '',
  client_email: '',
  project_address: '300 Cloud Rd',
  project_total: 10000,
  payment_schedule: [50, 0, 50],
  payment_phase: 'initial',
  phase_percent: 50,
  amount_due: 5000,
  amount_paid: 0,
  description: 'Initial payment',
  payment_methods: ['ach', 'check'],
  payment_link: null,
  payment_instructions: 'ACH instructions',
  notes: '',
  created_at: '2026-07-29T12:00:00Z'
};

function query() {
  let operation = 'select';
  return {
    select() { return this; },
    order() { return this; },
    limit() { return Promise.resolve({ data: [stored], error: null }); },
    update(record) { operation = 'update'; updatedRecord = record; return this; },
    insert(record) { operation = 'insert'; updatedRecord = record; return this; },
    eq(_field, value) { updatedId = value; return this; },
    single() {
      assert.ok(['update', 'insert'].includes(operation));
      return Promise.resolve({ data: { id: stored.id }, error: null });
    }
  };
}

window.alert = () => {};
window.confirm = () => true;
window.print = () => {};
window.scrollTo = () => {};
window.navigator.clipboard = { async writeText() {} };
window.supabase = {
  createClient: () => ({
    auth: { async getSession() { return { data: { session: {} }, error: null }; } },
    from: () => query()
  })
};

for (const script of ['invoice-core.js', 'invoice.js']) {
  window.eval(fs.readFileSync(path.join(root, `app/${script}`), 'utf8'));
}
await new Promise(resolve => setTimeout(resolve, 0));

const historyButton = window.document.querySelector('[data-invoice-id]');
assert.ok(historyButton);
assert.match(historyButton.textContent, /EBC-INV-CLOUD/);
historyButton.click();
assert.equal(window.document.querySelector('#client-name').value, 'Cloud Client');
assert.equal(window.document.querySelector('#amount-due').value, '5000');
const phase = window.document.querySelector('#payment-phase');
assert.equal(phase.querySelector('option[value="progress"]').disabled, true);
phase.value = 'final';
phase.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(window.document.querySelector('#phase-percent').value, '50');
assert.equal(window.document.querySelector('#amount-due').value, '5000.00');

window.document.querySelector('#amount-paid').value = '1000';
window.document.querySelector('#save-btn').click();
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(updatedId, stored.id);
assert.equal(updatedRecord.amount_paid, 1000);
assert.deepEqual(updatedRecord.payment_schedule, [50, 0, 50]);
assert.equal(window.document.querySelector('#invoice-status-message').textContent, 'Invoice guardado en la nube.');

console.log('Invoice cloud flow passed.');
