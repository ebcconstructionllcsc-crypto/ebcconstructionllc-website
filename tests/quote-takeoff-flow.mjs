import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/quote.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'http://terminal.local/app/quote.html?preview=1',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
const alerts = [];

const context = {
  beginPath() {},
  clearRect() {},
  closePath() {},
  fill() {},
  fillRect() {},
  fillText() {},
  lineTo() {},
  moveTo() {},
  arc() {},
  stroke() {},
  setLineDash() {},
  measureText(text) {
    return { width: String(text).length * 7 };
  }
};

window.HTMLCanvasElement.prototype.getContext = () => context;
window.alert = message => alerts.push(message);
window.confirm = () => true;
window.print = () => {};
window.supabase = {
  createClient() {
    return {
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
    };
  }
};

for (const script of ['quote.js', 'plan-math.js', 'plan.js']) {
  window.eval(fs.readFileSync(path.join(root, `app/${script}`), 'utf8'));
}
await new Promise(resolve => setTimeout(resolve, 0));

assert.equal(window.document.querySelector('#quote-app').hidden, false);

const shape = window.document.querySelector('#plan-shape');
const points = window.document.querySelector('#plan-points');
const closed = window.document.querySelector('#plan-closed');
shape.value = 'freeform';
shape.dispatchEvent(new window.Event('input', { bubbles: true }));
points.value = JSON.stringify([
  { x: 0, y: 0 },
  { x: 30, y: 0 },
  { x: 30, y: 20 },
  { x: 0, y: 20 }
]);
closed.value = 'true';
points.dispatchEvent(new window.Event('input', { bubbles: true }));

assert.equal(window.document.querySelector('#area').textContent, '600.0 sq ft');
assert.equal(window.document.querySelector('#perimeter').textContent, '100.0 linear ft');
assert.equal(window.document.querySelector('#order-yards').textContent, '8.15 yd³');
assert.equal(window.document.querySelector('#base-yards').textContent, '8.15 yd³');

window.document.querySelector('#use-plan-area').click();
const takeoffRows = window.document.querySelectorAll('[data-takeoff-key]');
assert.equal(takeoffRows.length, 4);
assert.equal(
  window.document.querySelector('[data-takeoff-key="surface"] .qty').value,
  '600.0'
);
assert.equal(
  window.document.querySelector('[data-takeoff-key="concrete"] .qty').value,
  '8.15'
);
assert.ok(alerts.includes('Takeoff agregado. Ahora solo completa tus precios por unidad.'));

console.log('Quote takeoff flow passed.');
