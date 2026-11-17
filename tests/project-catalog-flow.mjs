import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { START, END, readStories, renderProjectCatalog, replaceProjectCatalog, syncProjectGallery } from '../scripts/sync-project-gallery.mjs';

const news = fs.readFileSync('news.html', 'utf8');
const html = fs.readFileSync('projects.html', 'utf8');
const stories = readStories(news);
const script = fs.readFileSync('assets/project-catalog.js', 'utf8');
const legacy = fs.readFileSync('assets/portfolio.js', 'utf8');
const document = new JSDOM(html).window.document;
const cards = [...document.querySelectorAll('[data-catalog-story]')];
assert.equal(syncProjectGallery({ check: true }), false, 'The committed catalog matches its source');
assert.deepEqual(cards.map(card => card.dataset.catalogStory), stories.map(story => story.id), 'Every journal story, including archive stories, has one project card');
assert.equal(new Set(cards.map(card => card.dataset.catalogStory)).size, stories.length);
assert.ok(document.querySelector('[data-catalog-filters]').hidden, 'Filters are hidden until usable');
assert.ok(cards.every(card => !card.hidden), 'All project cards work without JavaScript');
assert.equal(document.querySelector('.portfolio-hero-actions a').getAttribute('href'), '#project-updates');
assert.equal(document.querySelector('#new-work h2').dataset.es, 'Archivo de videos', 'Historical videos are preserved and labeled as an archive');

for (const [index, story] of stories.entries()) {
  const card = cards[index];
  assert.equal(card.dataset.catalogService, story.service);
  assert.equal(card.querySelector('a').getAttribute('href'), `news.html?project=${story.id}`, 'A native link opens the complete existing project');
  const image = card.querySelector('img');
  assert.equal(image.getAttribute('src'), story.cover, 'The project uses its own cover');
  assert.ok(fs.existsSync(story.cover));
  assert.equal(image.getAttribute('loading'), 'lazy');
  for (const lang of ['en', 'es']) {
    assert.equal(card.querySelector('h3').getAttribute(`data-${lang}`), story.title[lang]);
    assert.equal(image.getAttribute(`data-${lang}-alt`), story.title[lang]);
    assert.ok(card.querySelector('.project-catalog-service').getAttribute(`data-${lang}`));
    const photos = story.media.filter(media => media.type === 'image').length;
    const videos = story.media.filter(media => media.type === 'video' || media.type === 'social').length;
    const text = card.querySelector('.project-catalog-media').getAttribute(`data-${lang}`);
    assert.deepEqual([...text.matchAll(/\d+/g)].map(match => Number(match[0])), [photos, videos].filter(Boolean), 'Photo and video totals come from the same project');
    if (photos) assert.match(text, lang === 'es' ? /foto/ : /photo/);
  }
}

function setup(source = html, hash = '', withLegacy = true) {
  const dom = new JSDOM(source, { url: `https://ebcconstructionllc.com/projects.html${hash}`, runScripts: 'outside-only' });
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLMediaElement.prototype.pause = () => {};
  w.HTMLMediaElement.prototype.load = () => {};
  if (withLegacy) w.eval(legacy);
  w.eval(script);
  return dom;
}
const visible = d => [...d.querySelectorAll('[data-catalog-story]')].filter(card => !card.hidden).map(card => card.dataset.catalogStory);
const expected = (list, service) => list.filter(story => service === 'all' || story.service === service).map(story => story.id);
const dom = setup(), d = dom.window.document;
assert.deepEqual(visible(d), stories.map(story => story.id), 'Projects opens with all project categories');
assert.equal(d.querySelector('[data-catalog-filters]').hidden, false);
const phaseState = () => [...d.querySelectorAll('[data-phase]')].map(phase => [phase.dataset.phase, phase.hidden]);
const originalPhases = phaseState();
assert.ok(originalPhases.some(([phase, hidden]) => phase === 'welding' && hidden), 'The legacy gallery keeps its concrete default');
for (const button of d.querySelectorAll('[data-catalog-filter]')) {
  button.click();
  const service = button.dataset.catalogFilter;
  const matching = expected(stories, service);
  assert.deepEqual(visible(d), matching, `${service}: matching project cards`);
  assert.equal(d.querySelector('[data-catalog-count]').textContent, `${matching.length} ${matching.length === 1 ? 'project' : 'projects'}`);
  assert.equal(d.querySelector('[data-catalog-empty]').hidden, matching.length > 0);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(d.querySelectorAll('[data-catalog-filter][aria-pressed="true"]').length, 1);
  assert.deepEqual(phaseState(), originalPhases, 'Catalog filters do not alter the legacy photo filters');
  assert.equal(dom.window.location.hash, '', 'Filtering does not jump to an unrelated legacy section');
}
d.querySelector('[data-catalog-filter="decks"]').click();
dom.window.document.documentElement.lang = 'es';
dom.window.dispatchEvent(new dom.window.Event('ebc:languagechange'));
const decks = expected(stories, 'decks').length;
assert.equal(d.querySelector('[data-catalog-count]').textContent, `${decks} ${decks === 1 ? 'proyecto' : 'proyectos'}`);
assert.deepEqual(visible(d), expected(stories, 'decks'), 'Changing language preserves the selection');
dom.window.location.hash = '#welding';
dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
assert.deepEqual(visible(d), expected(stories, 'welding'), 'Hash changes follow the welding service');
dom.window.close();

for (const [hash, service] of [['#concrete', 'concrete'], ['#driveways', 'concrete'], ['#retaining-walls', 'walls'], ['#landscaping', 'landscaping'], ['#decks', 'decks'], ['#welding', 'welding'], ['#project-updates', 'all']]) {
  const page = setup(html, hash);
  assert.deepEqual(visible(page.window.document), expected(stories, service), `${hash}: correct catalog on entry`);
  page.window.close();
}

// A newly added story is included automatically without editing the catalog code.
const added = { ...structuredClone(stories.find(story => story.service === 'decks')), id: 'catalog-addition-fixture' };
const expanded = [...stories, added];
const expansion = setup(replaceProjectCatalog(html, expanded), '#decks', false);
assert.deepEqual(visible(expansion.window.document), expected(expanded, 'decks'));
expansion.window.close();
const noWelding = stories.filter(story => story.service !== 'welding');
const empty = setup(replaceProjectCatalog(html, noWelding), '#welding', false);
assert.deepEqual(visible(empty.window.document), []);
assert.equal(empty.window.document.querySelector('[data-catalog-empty]').hidden, false);
assert.equal(empty.window.document.querySelector('[data-catalog-count]').textContent, '0 projects');
empty.window.close();

// Escaped source text remains text in both visible content and attributes.
const unsafeText = 'Road "A" & <img src=x onerror=alert(1)> </script>';
const escaped = structuredClone(stories[0]);
escaped.title = { en: unsafeText, es: unsafeText };
const escapedDom = new JSDOM(renderProjectCatalog([escaped]));
assert.equal(escapedDom.window.document.querySelector('h3').textContent, unsafeText);
assert.equal(escapedDom.window.document.querySelector('h3').dataset.es, unsafeText);
assert.equal(escapedDom.window.document.querySelector('img').alt, unsafeText);
assert.equal(escapedDom.window.document.querySelectorAll('img').length, 1);
assert.equal(escapedDom.window.document.querySelector('script,[onerror]'), null);
escapedDom.window.close();
assert.throws(() => renderProjectCatalog([stories[0], stories[0]]), /duplicate story ID/);
assert.throws(() => renderProjectCatalog([{ ...stories[0], cover: 'javascript:alert(1)' }]), /local project cover/);
assert.throws(() => renderProjectCatalog([{ ...stories[0], cover: 'assets/images/../private.jpg' }]), /local project cover/);
assert.throws(() => renderProjectCatalog([{ ...stories[0], title: { en: 'Only English' } }]), /Missing es title/);
assert.throws(() => replaceProjectCatalog(`${START}${START}${END}`, stories), /exactly one bounded/);
assert.throws(() => readStories(''), /exactly one/);

// Sync is bounded, idempotent, supports deployment artifact paths and never
// rewrites stale files when invoked with --check semantics.
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ebc-project-catalog-'));
try {
  const sourcePath = path.join(temporary, 'news.html'), targetPath = path.join(temporary, 'projects.html');
  const shell = `before\n${START}\nold\n${END}\nafter`;
  fs.writeFileSync(sourcePath, news);
  fs.writeFileSync(targetPath, shell);
  assert.throws(() => syncProjectGallery({ sourcePath, targetPath, check: true }), /out of date/);
  assert.equal(fs.readFileSync(targetPath, 'utf8'), shell, 'Checking does not modify a stale catalog');
  assert.equal(syncProjectGallery({ sourcePath, targetPath }), true);
  const result = fs.readFileSync(targetPath, 'utf8');
  assert.ok(result.startsWith('before\n') && result.endsWith('\nafter'), 'Surrounding page content is preserved');
  assert.equal(syncProjectGallery({ sourcePath, targetPath }), false);
  assert.equal(syncProjectGallery({ sourcePath, targetPath, check: true }), false);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
console.log('Project catalog: complete journal coverage, original covers, bilingual counts, filters and deep links, no-JS navigation, escaping and bounded idempotent sync passed.');
