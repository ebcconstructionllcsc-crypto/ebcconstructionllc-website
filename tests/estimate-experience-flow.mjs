import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = fs.readFileSync('contact.html', 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function setup(query = '') {
  const runtimeErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => runtimeErrors.push(error.message));
  const dom = new JSDOM(html, {
    url: `https://example.test/contact.html${query}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
  });
  const w = dom.window;
  const d = w.document;
  const form = d.querySelector('#estimate-form');
  const photos = d.querySelector('#photos');
  const requests = [];
  const createdURLs = [];
  const revokedURLs = [];
  let selection = [];
  let response = async () => { throw new Error('No mocked delivery was configured'); };

  w.matchMedia = query => ({ matches: query.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {} });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.URL.createObjectURL = () => {
    const url = `blob:https://example.test/photo-${createdURLs.length}`;
    createdURLs.push(url);
    return url;
  };
  w.URL.revokeObjectURL = url => revokedURLs.push(url);
  w.DataTransfer = class {
    constructor() {
      this.files = [];
      this.items = { add: file => this.files.push(file) };
    }
  };
  // JSDOM does not provide the browser file picker/DataTransfer integration.
  Object.defineProperty(photos, 'files', { configurable: true, get: () => selection, set: files => { selection = [...files]; } });
  Object.defineProperty(photos, 'value', { configurable: true, get: () => selection.length ? `C:\\fakepath\\${selection[0].name}` : '', set: value => { if (value === '') selection = []; } });
  w.fetch = async (url, options = {}) => {
    assert.equal(String(url), 'https://tcjtodjxxszhhmsvqtge.supabase.co/functions/v1/submit-website-lead', 'no unmocked network is allowed');
    assert.equal(options.method, 'POST');
    requests.push(options);
    return response(options);
  };

  // Execute the actual contact-page scripts in their production DOM order.
  for (const script of [...d.querySelectorAll('script[src^="assets/"]')]) {
    w.eval(fs.readFileSync(script.getAttribute('src').split('?')[0], 'utf8'));
  }
  const q = selector => d.querySelector(selector);
  const submit = () => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const change = (id, value, event = 'change') => {
    const field = d.getElementById(id);
    if (field.type === 'checkbox') field.checked = value;
    else field.value = value;
    field.dispatchEvent(new w.Event(event, { bubbles: true }));
  };
  const choosePhotos = files => {
    photos.files = files;
    photos.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const project = () => {
    change('service', 'Concrete / Concreto');
    change('address', '123 Example Street, Greer, SC');
    change('project', 'Private test project: a concrete patio.');
  };
  const contact = () => {
    change('name', 'Private Test Customer');
    change('phone', '8645550100');
    change('consent', true);
  };
  const review = async () => {
    project();
    q('[data-estimate-next]').click();
    contact();
    submit();
    await tick();
    assert.equal(form.dataset.currentStep, '2');
    assert.equal(q('#estimate-review').hidden, false);
  };
  const close = async () => {
    await tick();
    assert.deepEqual(runtimeErrors, [], 'the complete script stack must not raise runtime errors');
    dom.window.close();
  };
  return { dom, w, d, form, photos, q, submit, change, choosePhotos, project, contact, review, requests, createdURLs, revokedURLs, close, respond: handler => { response = handler; } };
}

// Without JavaScript, customer details cannot fall through into a query string.
{
  const dom = new JSDOM(html);
  const form = dom.window.document.querySelector('#estimate-form');
  assert.equal(form.method, 'post');
  assert.equal(form.querySelector('button[type="submit"]').disabled, true);
  assert.ok(dom.window.document.querySelector('noscript a[href="tel:+18644502954"]'));
  dom.window.close();
}

// The first step validates only project fields; Enter advances without reviewing
// or sending. Optional fields stay optional and hidden fields stay serializable.
{
  const t = setup();
  const { q, form, d } = t;
  assert.equal(form.dataset.currentStep, '0');
  assert.equal(q('[data-estimate-step="1"]').hidden, true);
  q('[data-estimate-next]').click();
  assert.equal(form.dataset.currentStep, '0');
  assert.equal(q('#estimate-errors').hidden, false);
  assert.equal(d.activeElement.id, 'estimate-errors');
  assert.equal(q('#service').getAttribute('aria-invalid'), 'true');
  assert.equal(q('#name').getAttribute('aria-invalid'), null, 'contact fields should not fail on step one');
  t.project();
  t.change('project', '   ');
  t.submit();
  assert.equal(form.dataset.currentStep, '0', 'whitespace is not a project description');
  t.change('project', 'Private test project: a concrete patio.');
  t.submit();
  assert.equal(form.dataset.currentStep, '1');
  assert.equal(q('#estimate-review').hidden, true);
  assert.equal(t.requests.length, 0);
  assert.equal(q('#address').disabled, false);
  assert.equal(new t.w.FormData(form).get('Address'), '123 Example Street, Greer, SC');

  t.contact();
  t.change('phone', 'letters only');
  t.change('email', 'not-an-email');
  t.change('consent', false);
  t.submit();
  assert.equal(form.dataset.currentStep, '1');
  assert.equal(q('#phone').getAttribute('aria-invalid'), 'true');
  assert.equal(q('#email').getAttribute('aria-invalid'), 'true');
  assert.equal(q('#consent').getAttribute('aria-invalid'), 'true');
  t.change('phone', '(864) 555-0100');
  t.change('email', '');
  t.change('consent', true);
  t.submit();
  await tick();
  assert.equal(form.dataset.currentStep, '2');
  assert.match(q('#estimate-review-details').textContent, /Private Test Customer/);
  assert.match(q('#estimate-review-details').textContent, /123 Example Street/);
  assert.equal(t.requests.length, 0, 'review never delivers a request');
  assert.doesNotMatch(JSON.stringify(Object.values(t.w.localStorage)), /Private Test|Example Street/);
  await t.close();
}

// Edit discards the prepared snapshot. A language switch must not resurrect it.
// Service option labels may translate, but their submitted values must not.
{
  const t = setup('?service=grading&interest=concrete-patios');
  assert.equal(t.q('#service').value, 'Grading & Excavation / Nivelación y Excavación');
  assert.match(t.q('#project').value, /I am interested in/);
  await t.review();
  const values = [...t.q('#service').options].map(option => option.value);
  t.q('#estimate-review-edit').click();
  assert.equal(t.form.dataset.currentStep, '1');
  assert.equal(t.q('#estimate-review').hidden, true);
  t.q('[data-lang-btn="es"]').click();
  await tick();
  assert.equal(t.q('#estimate-review').hidden, true, 'editing then translating must not reopen the old review');
  assert.equal(t.form.dataset.currentStep, '1');
  assert.deepEqual([...t.q('#service').options].map(option => option.value), values);
  assert.equal(t.q('#service').selectedOptions[0].textContent, 'Concreto');
  t.q('[data-estimate-back]').click();
  t.change('project', 'Descripción nueva conservada por el cliente.');
  t.q('[data-estimate-next]').click();
  t.submit();
  await tick();
  assert.match(t.q('#estimate-review-details').textContent, /Descripción nueva/);
  assert.doesNotMatch(t.q('#estimate-review-details').textContent, /Private test project/);
  assert.equal(t.requests.length, 0);

  // A change without input/change events still cannot bypass final validation.
  t.q('#address').value = '';
  t.q('#direct-estimate-submit').click();
  assert.equal(t.requests.length, 0);
  assert.equal(t.form.dataset.currentStep, '0');
  assert.equal(t.q('[data-estimate-step="0"]').hidden, false);
  assert.equal(t.q('#address').getAttribute('aria-invalid'), 'true');
  await t.close();
}

// Invalid files cannot advance. Previews render filenames as text, remain
// optional, and individual/removal-all controls update the actual selection.
{
  const t = setup();
  t.project();
  const jpg = name => new t.w.File(['image-test'], name, { type: 'image/jpeg' });
  for (const files of [
    [new t.w.File(['pdf-test'], 'scope.pdf', { type: 'application/pdf' })],
    Array.from({ length: 9 }, (_, i) => jpg(`photo-${i}.jpg`)),
    [Object.defineProperty(jpg('large.jpg'), 'size', { value: 16 * 1024 * 1024 })]
  ]) {
    t.choosePhotos(files);
    t.q('[data-estimate-next]').click();
    assert.equal(t.form.dataset.currentStep, '0');
    assert.equal(t.q('#photos').getAttribute('aria-invalid'), 'true');
    assert.ok(t.q('#estimate-photo-previews').children.length <= 8);
  }
  const maliciousName = '<img src=x onerror=alert(1)>.jpg';
  t.choosePhotos([jpg(maliciousName), jpg('keep.jpg')]);
  assert.equal(t.q('#photos').validationMessage, '');
  assert.equal(t.q('#estimate-photo-previews').children.length, 2);
  assert.equal(t.q('.estimate-photo-name').textContent, maliciousName);
  assert.equal(t.q('#estimate-photo-previews [onerror]'), null);
  const oldURLs = t.createdURLs.slice(-2);
  t.q('#estimate-photo-previews button').click();
  assert.deepEqual(t.photos.files.map(file => file.name), ['keep.jpg']);
  assert.equal(t.q('#estimate-photo-previews').children.length, 1);
  assert.ok(oldURLs.every(url => t.revokedURLs.includes(url)), 'replaced thumbnails release object URLs');
  t.q('[data-estimate-next]').click();
  t.contact();
  t.submit();
  await tick();
  assert.match(t.q('#estimate-review-photos').textContent, /keep.jpg/);
  t.q('#estimate-review-edit').click();
  t.q('[data-lang-btn="es"]').click();
  await tick();
  assert.deepEqual(t.photos.files.map(file => file.name), ['keep.jpg'], 'editing and translation preserve selected photos');
  t.q('[data-estimate-back]').click();
  t.q('#estimate-clear-photos').click();
  assert.equal(t.photos.files.length, 0);
  assert.equal(t.q('#estimate-photo-previews').children.length, 0);
  assert.equal(t.q('#estimate-clear-photos').hidden, true);
  assert.equal(t.requests.length, 0);
  await t.close();
}

// Sending locks both form fields and wizard controls. Failures preserve data;
// saved-but-unconfirmed and confirmed delivery both prevent duplicate sends.
for (const emailNotified of [false, true]) {
  const t = setup();
  const photo = new t.w.File(['image-test'], 'selected.jpg', { type: 'image/jpeg' });
  if (emailNotified) t.choosePhotos([photo]);
  await t.review();
  let finish;
  t.respond(() => new Promise(resolve => { finish = resolve; }));
  t.q('#direct-estimate-submit').click();
  await tick();
  assert.equal(t.requests.length, 1);
  assert.equal(t.requests[0].body.get('address'), '123 Example Street, Greer, SC');
  assert.equal(t.requests[0].body.get('email'), '');
  assert.equal(t.requests[0].body.get('preferred_timing'), '');
  assert.equal(t.requests[0].body.getAll('photos').length, emailNotified ? 1 : 0);
  if (emailNotified) assert.equal(t.requests[0].body.get('photos').name, 'selected.jpg');
  for (const selector of ['#name', '#photos', '[data-estimate-next]', '[data-estimate-back]', '#estimate-clear-photos', '#direct-estimate-submit', '#estimate-review-edit']) {
    assert.equal(t.q(selector).disabled, true, `${selector} must lock while sending`);
  }
  t.q('[data-estimate-back]').click();
  t.submit();
  assert.equal(t.form.dataset.currentStep, '2');
  assert.equal(t.requests.length, 1);
  finish({ ok: false, status: 503, json: async () => ({ error: 'EMAIL_NOT_CONFIGURED' }) });
  await tick();
  assert.equal(t.q('#direct-estimate-status').dataset.state, 'error');
  assert.equal(t.q('#estimate-contact-fallback').hidden, false);
  assert.equal(t.q('#name').disabled, false);
  assert.equal(t.q('[data-estimate-back]').disabled, false);
  assert.equal(t.q('#name').value, 'Private Test Customer');
  if (emailNotified) assert.equal(t.photos.files[0], photo, 'failure preserves the selected photo');
  const fallbackPhones = [...t.q('#estimate-contact-fallback').querySelectorAll('a[href^="tel:"]')].map(link => link.getAttribute('href'));
  assert.deepEqual(fallbackPhones, ['tel:+18644502954', 'tel:+18648673397']);
  t.q('[data-lang-btn="es"]').click();
  await tick();
  assert.equal(t.q('#direct-estimate-status').dataset.state, 'error');
  assert.match(t.q('#direct-estimate-status').textContent, /no está disponible/);

  let received = 0;
  t.w.addEventListener('ebc:leadreceived', () => received++);
  t.respond(async () => ({ ok: true, json: async () => ({ ok: true, reference: 'TEST-ONLY', emailNotified }) }));
  t.q('#direct-estimate-submit').click();
  await tick();
  assert.equal(t.requests.length, 2);
  assert.equal(t.q('#direct-estimate-status').dataset.state, emailNotified ? 'success' : 'warning');
  assert.equal(t.q('#estimate-contact-fallback').hidden, emailNotified);
  assert.equal(received, emailNotified ? 1 : 0);
  t.q('[data-lang-btn="en"]').click();
  await tick();
  assert.equal(t.q('#direct-estimate-status').dataset.state, emailNotified ? 'success' : 'warning');
  t.q('#direct-estimate-submit').click();
  t.q('[data-estimate-back]').click();
  t.submit();
  assert.equal(t.requests.length, 2, 'a saved request cannot be submitted twice');
  assert.equal(t.form.dataset.currentStep, '2');
  assert.equal(t.q('#name').disabled, true);
  assert.equal(t.q('[data-estimate-back]').disabled, true);
  for (const remove of t.q('#estimate-photo-previews').querySelectorAll('button')) {
    assert.equal(remove.disabled, true, 'translated photo controls remain disabled after delivery');
  }
  await t.close();
}

console.log('Estimate experience: progressive safety, step validation, optional fields, translated editing, photo previews/removal, preserved values, delivery locks and explicit confirmed/unconfirmed outcomes passed.');
