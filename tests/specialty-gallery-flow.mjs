import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(fs.readFileSync('projects.html', 'utf8'), {
  url: 'https://ebcconstructionllc.com/projects.html#california-style', runScripts: 'outside-only'
});
const { window } = dom;
const doc = window.document;
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLMediaElement.prototype.pause = () => {};
window.HTMLMediaElement.prototype.load = () => {};
window.eval(fs.readFileSync('assets/portfolio.js', 'utf8'));
const specialty = doc.querySelector('#california-style');
const photos = [...specialty.querySelectorAll('[data-media-type="image"]')];
assert.equal(photos.length, 17);
assert.equal(specialty.querySelectorAll('[data-media-type="video"]').length, 6);
assert.ok(!specialty.hidden);
assert.ok(doc.querySelector('#driveways').hidden);
const paths = [...doc.querySelectorAll('.portfolio-phases [data-full-src]')].map(e => e.dataset.fullSrc);
assert.equal(new Set(paths).size, paths.length, 'No duplicate photo cards');
for (const card of specialty.querySelectorAll('.portfolio-card')) {
  for (const path of [card.dataset.fullSrc, card.dataset.videoSrc, card.dataset.videoPoster].filter(Boolean)) {
    assert.ok(fs.statSync(path).size > 0, `Missing or empty media: ${path}`);
  }
}
photos.at(-1).click();
doc.querySelector('.portfolio-lightbox-navigation button:last-child').click();
assert.ok(doc.querySelector('#portfolio-lightbox-image').src.endsWith(photos[0].dataset.fullSrc), 'Navigation stays in the selected specialty');
doc.querySelector('[data-filter="driveways"]').click();
assert.ok(!specialty.hidden, 'Specialty driveways stay accessible under driveways');
assert.equal(doc.querySelectorAll('[data-category="driveways"][data-media-type="image"]:not([hidden])').length, 29);
assert.ok([...specialty.querySelectorAll('[data-category="finish"]')].every(c => c.hidden));
doc.querySelector('[data-filter="all"]').click();
assert.ok([...doc.querySelectorAll('.portfolio-phases .portfolio-card')].every(c => !c.hidden));
dom.window.close();
console.log('Specialty: 17 photos, 6 videos, no duplicates, category filters and photo navigation passed.');
