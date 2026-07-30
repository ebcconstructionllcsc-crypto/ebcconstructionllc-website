import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
const appScript = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const enhancementsScript = fs.readFileSync(path.join(root, 'assets/contact-enhancements.js'), 'utf8');

function setup({ language = 'en', query = '' } = {}) {
  const dom = new JSDOM(html, {
    url: `https://example.test/contact.html${query}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;
  const sharedPayloads = [];
  const copiedText = [];
  let injectedScripts = 0;
  const appendToHead = window.document.head.appendChild.bind(window.document.head);

  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
  };
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  Object.defineProperty(window.navigator, 'canShare', {
    configurable: true,
    value: payload => Array.isArray(payload?.files)
  });
  Object.defineProperty(window.navigator, 'share', {
    configurable: true,
    value: async payload => {
      sharedPayloads.push(payload);
    }
  });
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async value => {
        copiedText.push(value);
      }
    }
  });
  window.document.head.appendChild = node => {
    if (node.tagName === 'SCRIPT') injectedScripts += 1;
    return appendToHead(node);
  };
  window.localStorage.setItem('ebc-lang', language);
  window.eval(appScript);
  window.eval(enhancementsScript);

  return {
    window,
    document: window.document,
    sharedPayloads,
    copiedText,
    injectedScriptCount: () => injectedScripts
  };
}

function fillRequiredFields(document) {
  document.querySelector('#name').value = 'Edgar Sample';
  document.querySelector('#phone').value = '8645550100';
  document.querySelector('#email').value = 'sample@example.com';
  document.querySelector('#address').value = '123 Main Street, Greer, SC';
  document.querySelector('#service').value = 'Concrete / Concreto';
  document.querySelector('#timeline').value = 'Next month';
  document.querySelector('#project').value = 'Concrete driveway, approximately 1,200 square feet.';
}

function setFiles(input, files) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files
  });
}

function submit(window, form) {
  form.dispatchEvent(new window.Event('submit', {
    bubbles: true,
    cancelable: true
  }));
}

async function flush() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

{
  const { window, document, sharedPayloads, copiedText, injectedScriptCount } = setup();
  const form = document.querySelector('#estimate-form');
  const photos = document.querySelector('#photos');
  const photo = new window.File(
    [new Uint8Array(2048)],
    'driveway-before.jpg',
    { type: 'image/jpeg' }
  );

  assert.equal(form.dataset.submissionMode, 'local-share');
  fillRequiredFields(document);
  setFiles(photos, [photo]);
  photos.dispatchEvent(new window.Event('change', { bubbles: true }));
  submit(window, form);

  const review = document.querySelector('#estimate-review');
  assert.equal(review.hidden, false, 'valid details should reveal the local review');
  assert.match(review.textContent, /Edgar Sample/);
  assert.match(review.textContent, /Concrete driveway/);
  assert.match(review.textContent, /driveway-before\.jpg/);
  assert.match(document.querySelector('.form-status').textContent, /has not been sent/i);
  assert.match(document.querySelector('#text-request').href, /^sms:\+18644502954/);
  assert.match(decodeURIComponent(document.querySelector('#text-request').href), /Edgar Sample/);
  assert.match(document.querySelector('#email-request').href, /^mailto:ebcconstructionllcsc@gmail\.com/);
  assert.equal(document.querySelector('#share-request').hidden, false);

  document.querySelector('#share-request').click();
  await flush();
  assert.equal(sharedPayloads.length, 1);
  assert.equal(sharedPayloads[0].files.length, 1);
  assert.equal(sharedPayloads[0].files[0].name, 'driveway-before.jpg');
  assert.match(sharedPayloads[0].text, /1,200 square feet/);

  document.querySelector('#copy-request').click();
  await flush();
  assert.equal(copiedText.length, 1);
  assert.match(copiedText[0], /123 Main Street/);
  assert.equal(injectedScriptCount(), 0, 'local sharing must not load a network database client');
  assert.doesNotMatch(
    Object.values(window.localStorage).join(' '),
    /Edgar Sample|Concrete driveway/,
    'request details must not be persisted in localStorage'
  );
}

{
  const { window, document, injectedScriptCount } = setup();
  const form = document.querySelector('#estimate-form');
  const photos = document.querySelector('#photos');
  const unsupported = new window.File(
    [new Uint8Array(128)],
    'scope.pdf',
    { type: 'application/pdf' }
  );

  fillRequiredFields(document);
  setFiles(photos, [unsupported]);
  submit(window, form);

  assert.equal(document.querySelector('#estimate-review').hidden, true);
  assert.match(document.querySelector('.form-status').textContent, /not a supported image/i);
  assert.equal(injectedScriptCount(), 0);
}

{
  const { window, document } = setup({ language: 'es' });
  const form = document.querySelector('#estimate-form');

  fillRequiredFields(document);
  setFiles(document.querySelector('#photos'), []);
  submit(window, form);

  assert.equal(document.documentElement.lang, 'es');
  assert.match(document.querySelector('#estimate-review-title').textContent, /todavía no se ha enviado/i);
  assert.match(document.querySelector('.form-status').textContent, /todavía no se ha enviado/i);
}

{
  const { document } = setup({ query: '?service=grading' });
  assert.equal(
    document.querySelector('#service').value,
    'Grading & Excavation / Nivelación y Excavación',
    'service CTAs should preselect the matching estimate service'
  );
}

{
  const { window, document } = setup();
  let searchAborted = false;

  window.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => {
      searchAborted = true;
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });

  fillRequiredFields(document);
  const address = document.querySelector('#address');
  address.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 350));

  submit(window, document.querySelector('#estimate-form'));
  await flush();

  assert.equal(searchAborted, true, 'submitting the review should cancel an unfinished address search');
  assert.equal(document.querySelector('#address-results').hidden, true);
  assert.equal(document.querySelector('#address').getAttribute('aria-expanded'), 'false');
}

console.log('Public intake sharing flow passed.');
