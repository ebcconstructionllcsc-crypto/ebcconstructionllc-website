import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/render.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'https://ebcconstructionllcsc-crypto.github.io/ebcconstructionllc-website/app/render.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
const uploads = [];
let invokedRequest = null;

const context = {
  beginPath() {}, clearRect() {}, drawImage() {}, fillRect() {}, lineTo() {}, moveTo() {},
  stroke() {}, set fillStyle(_value) {}, set globalCompositeOperation(_value) {},
  set lineWidth(_value) {}, set lineCap(_value) {}, set lineJoin(_value) {}
};
window.HTMLCanvasElement.prototype.getContext = () => context;
window.HTMLCanvasElement.prototype.toBlob = callback => callback(new window.Blob(['png'], { type: 'image/png' }));
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,dGVzdA==';
window.createImageBitmap = async () => ({ width: 1600, height: 1200, close() {} });
window.confirm = () => true;
Object.defineProperty(window.crypto, 'randomUUID', {
  value: () => '22222222-2222-4222-8222-222222222222'
});

function tableQuery(table) {
  return {
    select() { return this; },
    eq() { return this; },
    not() { return this; },
    order() {
      if (table === 'projects') return Promise.resolve({ data: [], error: null });
      return this;
    },
    limit() { return Promise.resolve({ data: [], error: null }); },
    maybeSingle() {
      return Promise.resolve({
        data: table === 'staff_profiles' ? { is_active: true } : null,
        error: null
      });
    }
  };
}

window.supabase = {
  createClient() {
    return {
      auth: {
        async getSession() {
          return {
            data: { session: { user: { id: '11111111-1111-4111-8111-111111111111' } } },
            error: null
          };
        }
      },
      from: tableQuery,
      storage: {
        from() {
          return {
            async upload(storagePath) {
              uploads.push(storagePath);
              return { error: null };
            },
            async createSignedUrl() {
              return { data: { signedUrl: 'https://storage.example/render.jpg' }, error: null };
            }
          };
        }
      },
      functions: {
        async invoke(_name, options) {
          invokedRequest = options.body;
          return {
            data: {
              data: {
                jobId: 'job-1',
                url: 'https://storage.example/render.jpg',
                quality: 'low'
              }
            },
            error: null
          };
        }
      }
    };
  }
};

for (const script of ['render-core.js', 'render.js']) {
  window.eval(fs.readFileSync(path.join(root, `app/${script}`), 'utf8'));
}
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(window.document.querySelector('#render-app').hidden, false);
assert.match(window.document.querySelector('#render-history').textContent, /Todavía no hay renders/);

const fileInput = window.document.querySelector('#source-file');
Object.defineProperty(fileInput, 'files', {
  value: [new window.File(['photo'], 'jobsite.jpg', { type: 'image/jpeg' })]
});
fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(window.document.querySelector('#marking-section').hidden, false);
assert.equal(window.document.querySelector('#generate-btn').disabled, false);

window.document.querySelector('#scope').value = 'Extend the driveway twelve feet to the right side.';
window.document.querySelector('#consent').checked = true;
window.document.querySelector('#render-form').dispatchEvent(new window.Event('submit', {
  bubbles: true,
  cancelable: true
}));
await new Promise(resolve => setTimeout(resolve, 10));

assert.equal(uploads.length, 1);
assert.match(uploads[0], /11111111-1111-4111-8111-111111111111\/22222222-2222-4222-8222-222222222222\/source\.png/);
assert.equal(invokedRequest.maskPath, '');
assert.equal(invokedRequest.scope, 'Extend the driveway twelve feet to the right side.');
assert.equal(window.document.querySelector('#render-result').hidden, false);
assert.equal(window.document.querySelector('#after-image').src, 'https://storage.example/render.jpg');

console.log('Render UI flow passed.');
