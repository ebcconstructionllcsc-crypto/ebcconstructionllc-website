import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const analytics = fs.readFileSync('assets/app.js', 'utf8').split('const menuButton')[0];
const direct = fs.readFileSync('assets/direct-estimate-submit.js', 'utf8');
const html = fs.readFileSync('contact.html', 'utf8');
function setup(url) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  dom.window.eval(analytics);
  return dom;
}
const dom = setup('https://ebcconstructionllc.com/contact.html?email=private@example.com#secret');
const { window } = dom;
const commands = () => window.dataLayer.map(item => Array.from(item));
assert.equal(window.document.querySelectorAll('script[src*="googletagmanager"]').length, 1);
assert.equal(commands()[1][2].page_location, 'https://ebcconstructionllc.com/contact.html');
window.document.querySelector('a[href^="tel:"]').click();
assert.equal(commands().at(-1)[1], 'click_to_call');
const form = window.document.querySelector('#estimate-form');
form.checkValidity = () => true;
form.querySelector('#name').value = 'PRIVATE-CUSTOMER-NAME';
form.dispatchEvent(new window.Event('input', { bubbles: true }));
form.dispatchEvent(new window.Event('input', { bubbles: true }));
assert.equal(commands().filter(item => item[1] === 'estimate_start').length, 1);
form.dispatchEvent(new window.Event('submit', { bubbles: true }));
assert.equal(commands().at(-1)[1], 'estimate_review');
form.checkValidity = () => false;
form.dispatchEvent(new window.Event('submit', { bubbles: true }));
assert.equal(commands().filter(item => item[1] === 'estimate_review').length, 1, 'invalid forms are not reviewed requests');
form.checkValidity = () => true;
window.document.querySelector('a[href="contact.html"]').click();
assert.equal(commands().at(-1)[1], 'click_estimate');
const trackedBefore = commands().filter(item => item[1] === 'click_estimate').length;
for (const href of ['contact.html?service=welding#estimate-form', '/contact.html?service=concrete', 'https://ebcconstructionllc.com/contact.html#estimate-form', 'https://example.test/contact.html?service=welding', '#contact-us']) {
  const link = window.document.createElement('a');
  link.href = href;
  link.addEventListener('click', event => event.preventDefault());
  window.document.body.append(link);
  link.click();
}
assert.equal(commands().filter(item => item[1] === 'click_estimate').length, trackedBefore + 3, 'count local estimate links with service queries, excluding external sites');
assert.ok(!JSON.stringify(commands()).includes('PRIVATE-CUSTOMER-NAME'));

window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia = () => ({ matches: true });
window.eval(direct);
window.fetch = async () => ({ ok: false, status: 500, json: async () => ({ ok: false }) });
const button = window.document.querySelector('#direct-estimate-submit');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
button.click();
await tick();
assert.equal(commands().filter(item => item[1] === 'generate_lead').length, 0);
window.fetch = async () => ({ ok: true, json: async () => ({ ok: true, reference: 'PRIVATE-REFERENCE' }) });
button.click();
await tick();
button.click();
await tick();
assert.equal(commands().filter(item => item[1] === 'generate_lead').length, 1);
assert.ok(!JSON.stringify(commands()).includes('PRIVATE-REFERENCE'));
assert.ok(!JSON.stringify(commands()).includes('private@example.com'));
for (const url of ['https://ebcconstructionllc.com/app/index.html', 'http://localhost/contact.html']) {
  const excluded = setup(url);
  assert.equal(excluded.window.dataLayer, undefined);
  excluded.window.close();
}
dom.window.close();
console.log('Analytics: safe public pageviews, contact clicks, failures excluded, successful lead counted once.');
