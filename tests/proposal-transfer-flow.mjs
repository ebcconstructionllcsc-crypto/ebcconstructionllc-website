import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/quote.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'http://terminal.local/app/quote.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;

window.document.querySelector('#client-name').value = 'Proposal Transfer Client';
window.document.querySelector('#project-address').value = '100 Transfer Rd';
window.document.querySelector('#quote-number').value = 'EBC-TRANSFER-001';
window.document.querySelector('#payment-link').value = 'https://payments.example/private';
window.document.querySelector('#payment-instructions').value = 'Sensitive payment instructions';

const items = window.document.querySelector('#items');
items.innerHTML = `
  <div class="item-row" data-takeoff-key="slab">
    <input class="desc" value="Reinforced concrete slab">
    <input class="qty" value="720">
    <select class="unit"><option value="sq ft" selected>sq ft</option></select>
    <input class="rate" value="18.75">
  </div>`;

const renderSection = window.document.querySelector('#render-editor-section');
const renderImage = window.document.querySelector('#render-editor-thumb');
renderSection.hidden = false;
renderImage.src = 'data:image/png;base64,transfer-render';

window.eval(fs.readFileSync(path.join(root, 'app/proposal-link.js'), 'utf8'));

const button = window.document.querySelector('#create-proposal-btn');
assert.ok(button, 'The quote builder should expose a professional proposal button.');
assert.match(button.textContent, /propuesta profesional/i);

const transfer = window.EbcProposalTransfer.storeTransfer();
const stored = JSON.parse(window.sessionStorage.getItem('ebc-proposal-from-quote'));

assert.equal(transfer.transferVersion, 1);
assert.equal(stored.fields['client-name'], 'Proposal Transfer Client');
assert.equal(stored.fields['project-address'], '100 Transfer Rd');
assert.equal(stored.items.length, 1);
assert.equal(stored.items[0].key, 'slab');
assert.equal(stored.items[0].qty, 720);
assert.equal(stored.items[0].rate, 18.75);
assert.match(stored.quoteRender.image, /^data:image\/png/);
assert.equal('payment-link' in stored.fields, false);
assert.equal('payment-instructions' in stored.fields, false);
assert.equal(window.localStorage.getItem('ebc-proposal-from-quote'), null);

console.log('Quote-to-proposal transfer flow passed.');