import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/quote.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'http://terminal.local/app/quote.html?preview=1',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: new VirtualConsole()
});
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => ({
  beginPath() {}, clearRect() {}, closePath() {}, fill() {}, fillRect() {}, fillText() {},
  lineTo() {}, moveTo() {}, arc() {}, stroke() {}, setLineDash() {},
  measureText() { return { width: 10 }; }
});
window.alert = () => {};
window.confirm = () => true;
window.print = () => {};
window.supabase = {
  createClient: () => ({
    auth: {
      async getSession() {
        return { data: { session: { user: { id: 'test-user' } } }, error: null };
      }
    },
    from(table) {
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        order() { return chain; },
        async limit() { return { data: [], error: null }; },
        async maybeSingle() {
          return { data: table === 'staff_profiles' ? { is_active: true } : null, error: null };
        }
      };
      return chain;
    }
  })
};

for (const script of ['quote.js', 'plan-math.js', 'plan.js']) {
  window.eval(fs.readFileSync(path.join(root, `app/${script}`), 'utf8'));
}
await new Promise(resolve => setTimeout(resolve, 0));

window.document.querySelector('#client-name').value = 'Invoice Client';
window.document.querySelector('#project-address').value = '200 Project Rd';
const firstRow = window.document.querySelector('.item-row');
firstRow.querySelector('.qty').value = '1';
firstRow.querySelector('.rate').value = '19250';
firstRow.querySelector('.rate').dispatchEvent(new window.Event('input', { bubbles: true }));

const paymentTemplate = window.document.querySelector('#payment-template');
assert.equal(paymentTemplate.value, 'standard');
paymentTemplate.value = 'one-day';
paymentTemplate.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(window.document.querySelector('#payment-1').value, '50');
assert.equal(window.document.querySelector('#payment-2').value, '0');
assert.equal(window.document.querySelector('#payment-3').value, '50');
assert.match(window.document.querySelector('#p-payment-1-label').textContent, /contract signing/i);
assert.match(window.document.querySelector('#p-payment-3-label').textContent, /same-day completion/i);
window.document.querySelector('#create-invoice-btn').click();

const payload = JSON.parse(window.sessionStorage.getItem('ebc-invoice-from-quote'));
assert.equal(payload.clientName, 'Invoice Client');
assert.equal(payload.projectAddress, '200 Project Rd');
assert.equal(payload.projectTotal, 19250);
assert.deepEqual(payload.schedule, [50, 0, 50]);
assert.deepEqual(payload.methods, ['ach', 'zelle', 'check', 'cash']);
assert.match(window.document.querySelector('#p-no-financing').textContent, /does not offer financing/i);
assert.match(window.document.querySelector('#p-payment-methods').textContent, /Zelle/);
assert.equal(window.document.querySelector('#accept-online').checked, false);

console.log('Quote-to-invoice flow passed.');
