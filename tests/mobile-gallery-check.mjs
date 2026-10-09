import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('assets/public-quality.css', 'utf8');
assert.match(css, /\.portfolio-phases\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\)/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.portfolio-page \.portfolio-grid > \.portfolio-card \{ grid-column: auto/);
assert.match(css, /data-media-type="image"\] img\s*\{[^}]*height: auto;[^}]*transform: none/s);
assert.match(css, /data-media-type="image"\] \.portfolio-caption\s*\{\s*position: static/);
assert.match(css, /grid-auto-columns: minmax\(0,1fr\)/);
for (const page of ['index','projects','services','about','contact','reviews']) {
  assert.ok(fs.readFileSync(`${page}.html`,'utf8').includes('assets/public-quality.css?v=20261009-mobile'), `${page} must refresh cached mobile styles`);
}
console.log('Mobile gallery: bounded grids, uncropped natural-ratio photos, readable captions and equal contact actions.');
