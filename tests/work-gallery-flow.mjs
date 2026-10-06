import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(fs.readFileSync('projects.html', 'utf8'), {
  url: 'https://ebcconstructionllc.com/projects.html#retaining-walls', runScripts: 'outside-only'
});
const { window } = dom;
const doc = window.document;
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLMediaElement.prototype.pause = () => {};
window.HTMLMediaElement.prototype.load = () => {};
window.eval(fs.readFileSync('assets/portfolio.js', 'utf8'));
const walls = doc.querySelector('#retaining-walls');
assert.ok(!walls.hidden);
assert.equal(doc.querySelector('[data-filter="retaining-walls"]').getAttribute('aria-pressed'), 'true');
assert.equal(walls.querySelectorAll('[data-media-type="image"]').length, 4);
assert.equal(walls.querySelectorAll('[data-media-type="video"]').length, 1);
assert.equal(walls.previousElementSibling.id, 'slab-steps');
assert.equal(walls.nextElementSibling.dataset.phase, 'preparation');
assert.equal(doc.querySelector('#phase-retaining-walls').dataset.es, 'Muros de contención');
assert.equal(doc.querySelectorAll('#sidewalks .portfolio-card').length, 12);
assert.equal(doc.querySelectorAll('#slab-steps [data-media-type="image"]').length, 7);
assert.equal(doc.querySelectorAll('#slab-steps [data-media-type="video"]').length, 1);

const collection = doc.querySelector('#preparation-media');
assert.equal(collection.closest('[data-phase]').dataset.phase, 'preparation');
assert.equal(collection.querySelectorAll('[data-media-type="image"]').length, 5);
assert.equal(collection.querySelectorAll('[data-media-type="video"]').length, 4);
assert.equal(collection.querySelector('.work-gallery-track').tabIndex, 0);
assert.ok(collection.querySelector('[data-gallery-prev]').dataset.esAriaLabel);
assert.ok(collection.querySelector('[data-gallery-next]').dataset.esAriaLabel);
for (const card of [...walls.querySelectorAll('.portfolio-card'), ...collection.querySelectorAll('.portfolio-card')]) {
  for (const path of [card.dataset.fullSrc, card.dataset.videoSrc, card.dataset.videoPoster, card.querySelector('img').getAttribute('src')].filter(Boolean)) {
    assert.ok(fs.existsSync(path), `Missing media: ${path}`);
    assert.ok(fs.statSync(path).size > 0);
  }
  assert.equal(card.querySelector('img').getAttribute('loading'), 'lazy');
  if (card.dataset.mediaType === 'video') {
    card.click();
    const player = doc.querySelector('#portfolio-lightbox-video');
    assert.equal(player.muted, card.dataset.audio !== 'on');
    assert.equal(player.autoplay, false);
    assert.equal(player.controls, true);
  }
}
doc.querySelector('[data-filter="preparation"]').click();
assert.ok(walls.hidden);
assert.ok(!collection.closest('[data-phase]').hidden);
window.location.hash = '#retaining-walls';
window.dispatchEvent(new window.HashChangeEvent('hashchange'));
assert.ok(!walls.hidden);
doc.querySelector('[data-filter="all"]').click();
assert.ok([...doc.querySelectorAll('[data-phase]')].every(section => !section.hidden));

// The privacy-safe public variants carry neither EXIF nor XMP chunks.
for (const folder of ['assets/images/retaining-walls-20261006', 'assets/images/preparation-20261006']) {
  for (const file of fs.readdirSync(folder).filter(name => name.endsWith('.webp'))) {
    const bytes = fs.readFileSync(`${folder}/${file}`);
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const type = bytes.toString('ascii', offset, offset + 4);
      assert.ok(!['EXIF', 'XMP '].includes(type), `Metadata in ${file}`);
      const size = bytes.readUInt32LE(offset + 4);
      offset += 8 + size + (size % 2);
    }
  }
}
dom.window.close();
console.log('Work galleries: bilingual filters, deep links, 4+1 walls, 5+4 preparation, real media, audio policy, privacy metadata and unchanged approved counts passed.');
