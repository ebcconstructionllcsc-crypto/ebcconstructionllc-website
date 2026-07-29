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

window.HTMLCanvasElement.prototype.getContext = () => ({
  beginPath() {}, clearRect() {}, closePath() {}, fill() {}, fillRect() {},
  fillText() {}, lineTo() {}, moveTo() {}, arc() {}, stroke() {},
  setLineDash() {}, measureText() { return { width: 10 }; }
});
window.alert = () => {};
window.confirm = () => true;
window.print = () => {};
window.supabase = {
  createClient() {
    return {
      auth: {
        async getSession() {
          return { data: { session: { user: { id: 'test' } } }, error: null };
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
window.sessionStorage.setItem('ebc-quote-render', JSON.stringify({
  image: 'data:image/jpeg;base64,dGVzdA==',
  jobId: 'test-job',
  conceptual: true
}));

for (const script of ['quote.js', 'plan-math.js', 'plan.js']) {
  window.eval(fs.readFileSync(path.join(root, `app/${script}`), 'utf8'));
}
await new Promise(resolve => setTimeout(resolve, 0));

assert.equal(window.document.querySelector('#quote-render-section').hidden, false);
assert.equal(window.document.querySelector('#render-editor-section').hidden, false);
assert.match(window.document.querySelector('#p-render-disclaimer').textContent, /AI-generated conceptual/i);
assert.equal(window.sessionStorage.getItem('ebc-quote-render'), null);

window.document.querySelector('#remove-render').click();
assert.equal(window.document.querySelector('#quote-render-section').hidden, true);
assert.equal(window.document.querySelector('#p-render-image').hasAttribute('src'), false);

console.log('Quote render flow passed.');
