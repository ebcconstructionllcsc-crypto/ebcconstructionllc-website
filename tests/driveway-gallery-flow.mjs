import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(fs.readFileSync('projects.html', 'utf8'), {
  url: 'https://ebcconstructionllc.com/projects.html#driveways', runScripts: 'outside-only'
});
const { window } = dom;
const doc = window.document;
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLMediaElement.prototype.pause = () => {};
window.HTMLMediaElement.prototype.load = () => {};
window.eval(fs.readFileSync('assets/portfolio.js', 'utf8'));
const gallery = doc.querySelector('#driveways');
assert.equal(doc.querySelectorAll('[data-category="driveways"][data-media-type="image"]').length, 29);
assert.equal(gallery.querySelectorAll('[data-media-type="video"]').length, 2);
assert.ok(!gallery.hidden);
assert.ok(doc.querySelector('[data-phase="preparation"]').hidden);
for (const element of gallery.querySelectorAll('img, [data-full-src], [data-video-src]')) {
  for (const attribute of ['src', 'data-full-src', 'data-video-src', 'data-video-poster']) {
    const path = element.getAttribute(attribute);
    if (path) {
      assert.ok(fs.existsSync(path), `Missing media: ${path}`);
      assert.ok(fs.statSync(path).size > 0, `Empty media: ${path}`);
    }
  }
}
gallery.querySelector('[data-media-type="image"]').click();
const first = doc.querySelector('#portfolio-lightbox-image').src;
doc.querySelector('.portfolio-lightbox-navigation button:last-child').click();
assert.notEqual(doc.querySelector('#portfolio-lightbox-image').src, first);
gallery.querySelector('[data-media-type="video"]').click();
assert.ok(doc.querySelector('#portfolio-lightbox-video').src.endsWith('.mp4'));
assert.equal(doc.querySelector('#portfolio-lightbox-video').muted, false);
doc.querySelector('[data-filter="sidewalks"]').click();
assert.ok(gallery.hidden, 'Sidewalk filter excludes driveways');
assert.ok(!doc.querySelector('[data-phase="sidewalks"]').hidden);
assert.equal(doc.querySelectorAll('#sidewalks .portfolio-card').length, 12, 'Only the sidewalk wording changes; no photos are added');
assert.match(doc.querySelector('#phase-sidewalks').dataset.es, /concreto decorativo/);
assert.equal(doc.querySelector('[data-phase="finish"], [data-phase="decorative"], [data-filter="finish"], [data-filter="decorative"]'), null, 'Removed collections do not leave empty filters');
doc.querySelector('[data-filter="preparation"]').click();
assert.ok(gallery.hidden);
doc.querySelector('[data-filter="all"]').click();
assert.ok([...doc.querySelectorAll('[data-phase]')].every(section => !section.hidden));
dom.window.close();
console.log('Driveway gallery: 29 photos, 2 videos, deep link, filters and next-photo controls passed.');
