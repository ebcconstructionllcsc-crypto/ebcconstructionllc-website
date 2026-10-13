import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const script = fs.readFileSync('assets/portfolio.js', 'utf8');
function setup(hash = '') {
  const dom = new JSDOM(fs.readFileSync('projects.html', 'utf8'), {
    url: `https://ebcconstructionllc.com/projects.html${hash}`, runScripts: 'outside-only'
  });
  const { window } = dom;
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.load = () => {};
  window.document.querySelector('.topbar').getBoundingClientRect = () => ({ height: 142 });
  window.eval(script);
  return dom;
}

// A visitor opening a welding photo must never be taken to a concrete photo,
// even after explicitly selecting the all-services overview.
const dom = setup();
const doc = dom.window.document;
assert.equal(doc.documentElement.style.getPropertyValue('--portfolio-header-offset'), '150px', 'Sticky filters clear the actual header height');
doc.querySelector('.topbar').getBoundingClientRect = () => ({ height: 72 });
dom.window.dispatchEvent(new dom.window.Event('resize'));
assert.equal(doc.documentElement.style.getPropertyValue('--portfolio-header-offset'), '80px', 'Sticky offset follows the mobile header height');
doc.querySelector('[data-filter="all"]').click();
const weld = doc.querySelector('#welding [data-media-type="image"]');
weld.click();
doc.querySelector('.portfolio-lightbox-navigation button:last-child').click();
assert.ok(doc.querySelector('#portfolio-lightbox-image').src.endsWith(weld.dataset.fullSrc), 'Welding next-photo navigation must stay in welding');
doc.querySelector('.portfolio-lightbox-close').click();

for (const [filter, service] of [['concrete-work', 'concrete'], ['landscaping', 'landscaping'], ['welding', 'welding']]) {
  const button = doc.querySelector(`[data-filter="${filter}"]`);
  assert.ok(button, `${filter}: service selector exists`);
  button.click();
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  const visible = [...doc.querySelectorAll('[data-phase]')].filter(section => !section.hidden);
  assert.ok(visible.length > 0);
  assert.ok(visible.every(section => section.dataset.service === service), `${filter}: only its service is visible`);
  if (service !== 'concrete') {
    assert.equal(doc.querySelector('.featured-project-section').hidden, true);
    assert.equal(doc.querySelector('#recent-projects').hidden, true);
    assert.equal(doc.querySelector('.visualize-section').hidden, true);
  }
}
dom.window.close();

for (const [hash, service] of [['', 'concrete'], ['#concrete', 'concrete'], ['#landscaping', 'landscaping'], ['#welding', 'welding']]) {
  const page = setup(hash);
  const d = page.window.document;
  assert.ok([...d.querySelectorAll('[data-phase]')].filter(s=>!s.hidden).every(s=>s.dataset.service === service), `${hash}: correct service on entry`);
  assert.match(d.querySelector('.portfolio-hero').getAttribute('style'), service === 'welding' ? /workshop-welding/ : service === 'landscaping' ? /landscaping-20261013/ : /driveway/);
  assert.match(d.querySelector('.portfolio-hero').style.getPropertyValue('--portfolio-hero-photo'), /url\(['"]https:\/\/ebcconstructionllc\.com\/assets\/images\//, 'CSS custom-property URLs must be absolute to avoid assets/assets resolution');
  page.window.close();
}

const land = new JSDOM(fs.readFileSync('landscaping-pavers.html', 'utf8')).window.document;
const welding = new JSDOM(fs.readFileSync('welding.html', 'utf8')).window.document;
assert.ok(land.querySelector('a[href="projects.html#landscaping"]'));
assert.ok(welding.querySelector('a[href="projects.html#welding"]'));
assert.match(land.querySelector('.dedicated-hero').getAttribute('style'), /landscaping-20261013/);
for (const [document, allowed] of [[land, /landscaping-20261013|logo/], [welding, /welding-20261006|logo/]]) {
  for (const img of document.querySelectorAll('img[src]')) {
    assert.match(img.getAttribute('src'), allowed, 'Service page images belong to that service');
    assert.ok(fs.existsSync(img.getAttribute('src')));
  }
}
assert.ok(land.querySelector('[data-instgrm-permalink="https://www.instagram.com/reel/DeTNAeNg0uX/"]'));
assert.equal(doc.querySelector('#recent-projects [data-instgrm-permalink="https://www.instagram.com/reel/DeTNAeNg0uX/"]'), null);

for (const name of fs.readdirSync('assets/images/landscaping-20261013')) {
  const bytes = fs.readFileSync(`assets/images/landscaping-20261013/${name}`);
  assert.ok(bytes.length < 500_000, 'Optimized public photo stays under 500 KB');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    assert.ok(!['EXIF', 'XMP '].includes(bytes.toString('ascii', offset, offset + 4)), 'Private camera metadata is stripped');
    const size = bytes.readUInt32LE(offset + 4);
    offset += 8 + size + (size % 2);
  }
}

console.log('Service media: category isolation, same-service lightbox, direct links, backgrounds, and landscaping media passed.');
