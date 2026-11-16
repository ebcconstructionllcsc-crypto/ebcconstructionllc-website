import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('news.html', 'utf8');
const controller = fs.readFileSync('assets/news-gallery.js', 'utf8');
const dom = new JSDOM(html, { url: 'https://ebcconstructionllc.com/news.html', runScripts: 'outside-only' });
const w = dom.window, d = w.document;
const data = JSON.parse(d.querySelector('#news-media-data').textContent);
const cards = [...d.querySelectorAll('[data-story]')];
const byId = new Map(data.map(story => [story.id, story]));
const services = [...d.querySelectorAll('[data-news-service]')].map(button => button.dataset.newsService);
const types = [...d.querySelectorAll('[data-news-type]')].map(button => button.dataset.newsType);

// Publishing another verified story must not require changing a fixed item count.
assert.ok(data.length > 0, 'The journal has stories');
assert.equal(byId.size, data.length, 'Story IDs are unique');
assert.ok(cards.length > 0, 'The journal has visible cards');
assert.equal(new Set(cards.map(card => card.dataset.story)).size, cards.length, 'Card IDs are unique');
const bilingual = (value, label) => {
  for (const language of ['en', 'es']) {
    assert.equal(typeof value?.[language], 'string', `${label} has ${language} text`);
    assert.ok(value[language].trim(), `${label} has nonempty ${language} text`);
  }
};
const assetExists = source => {
  assert.equal(typeof source, 'string');
  assert.ok(source.length, 'Media has a source');
  if (source.startsWith('https:')) assert.equal(new URL(source).protocol, 'https:');
  else assert.ok(fs.existsSync(source), `Missing local media: ${source}`);
};
const imagesFor = story => new Set([
  story.cover,
  ...story.media.flatMap(media => [media.type === 'image' ? media.src : null, media.poster].filter(Boolean))
]);
for (const story of data) {
  assert.match(story.id, /^[a-z0-9-]+$/, 'Story IDs remain safe deep-link identifiers');
  assert.ok(story.service !== 'all' && services.includes(story.service), `Known service: ${story.id}`);
  bilingual(story.title, `${story.id} title`);
  bilingual(story.description, `${story.id} description`);
  assert.ok(Array.isArray(story.media) && story.media.length, `Media for ${story.id}`);
  assetExists(story.cover);
  for (const media of story.media) {
    assert.ok(['image', 'video', 'social'].includes(media.type), `Known media type: ${story.id}`);
    bilingual(media.caption, `${story.id} caption`);
    assetExists(media.src);
    if (media.poster) assetExists(media.poster);
  }
}
for (const card of cards) {
  const story = byId.get(card.dataset.story);
  assert.ok(story, `Card resolves to story: ${card.dataset.story}`);
  for (const link of card.querySelectorAll('[data-open-story]')) {
    assert.equal(link.dataset.openStory, story.id, 'A card opens its own project');
  }
  const image = card.querySelector('img');
  assert.ok(image, `Card image for ${story.id}`);
  assert.ok(imagesFor(story).has(image.getAttribute('src')), `Card image belongs to ${story.id}`);
}
for (const trigger of d.querySelectorAll('[data-open-story]')) {
  assert.ok(byId.has(trigger.dataset.openStory), 'Every gallery trigger resolves to a story');
}

// Archive stories can remain accessible by deep link without a journal card.
// Homepage previews must still resolve to the same project and its media.
const home = new JSDOM(fs.readFileSync('index.html', 'utf8'));
const previews = home.window.document.querySelectorAll('[aria-labelledby="latest-work-title"] a[href*="?project="]');
assert.ok(previews.length, 'Homepage has latest-work previews');
for (const preview of previews) {
  const url = new URL(preview.getAttribute('href'), 'https://ebcconstructionllc.com/');
  assert.equal(url.pathname, '/news.html');
  const story = byId.get(url.searchParams.get('project'));
  assert.ok(story, 'Homepage preview resolves to a journal story');
  assert.ok(imagesFor(story).has(preview.querySelector('img')?.getAttribute('src')), 'Homepage preview uses that project’s media');
}
home.window.close();

w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
let stopped = 0;
w.HTMLMediaElement.prototype.pause = () => stopped++;
w.HTMLMediaElement.prototype.load = () => {};
w.eval(controller);
const click = selector => d.querySelector(selector).click();
const visible = () => cards.filter(card => !card.hidden).map(card => card.dataset.story);
const expected = (service, type) => cards.filter(card => {
  const story = byId.get(card.dataset.story);
  const availableTypes = new Set(story.media.map(media => media.type === 'social' ? 'video' : media.type));
  return (service === 'all' || story.service === service) && (type === 'all' || availableTypes.has(type));
}).map(card => card.dataset.story);

// Check every service/media intersection, including newly published stories.
for (const service of services) {
  click(`[data-news-service="${service}"]`);
  for (const type of types) {
    click(`[data-news-type="${type}"]`);
    const matches = expected(service, type);
    assert.deepEqual(visible(), matches, `${service}/${type} shows only matching projects`);
    assert.equal(d.querySelector('[data-news-empty]').hidden, matches.length > 0);
    assert.equal(d.querySelector('[data-news-count]').textContent, `${matches.length} ${matches.length === 1 ? 'project' : 'projects'}`);
  }
}
click('[data-reset-news]');
assert.deepEqual(visible(), cards.map(card => card.dataset.story), 'Reset restores all journal cards');

click('[data-news-service="landscaping"]');
click('[data-news-type="video"]');
click('[data-story="sod"] [data-open-story]');
assert.ok(d.querySelector('dialog').open);
assert.match(d.querySelector('.journal-stage video').src, /sod.mp4$/);
assert.equal(d.querySelectorAll('.journal-thumbnails button').length, byId.get('sod').media.length);
click('[data-viewer-next]');
assert.match(d.querySelector('.journal-stage img').src, /sod-1.webp$/);
assert.ok(stopped > 0);
d.querySelector('dialog').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
assert.match(d.querySelector('.journal-stage img').src, /sod-2.webp$/);
w.document.documentElement.lang = 'es';
w.dispatchEvent(new w.Event('ebc:languagechange'));
assert.match(d.querySelector('#news-viewer-title').textContent, /Instalación de pasto en patio/);
click('[data-viewer-close]');
assert.equal(d.querySelector('dialog').open, false);
assert.equal(d.querySelector('.journal-stage').children.length, 0);
click('[data-news-service="walls"]');
assert.deepEqual(visible(), expected('walls', 'video'));
click('[data-reset-news]');
assert.deepEqual(visible(), cards.map(card => card.dataset.story));
click('[data-news-service="concrete"]');
click('[data-news-type="video"]');
assert.deepEqual(visible(), expected('concrete', 'video'));
click('[data-story="backyard-concrete-20261108"] [data-open-story]');
assert.ok(d.querySelector('.journal-source'));
assert.match(d.querySelector('.journal-source').href, /956085537295033/);
dom.window.close();
console.log('Journal: story/card integrity, homepage previews, service/media intersections, video, localization, keyboard and assets passed.');

// A project link from a service page opens that exact project, not the generic gallery.
const linked = new JSDOM(html, {url:'https://ebcconstructionllc.com/news.html?project=sod#landscaping',runScripts:'outside-only'});
linked.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
linked.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new linked.window.Event('close'))};
linked.window.HTMLMediaElement.prototype.pause=()=>{};linked.window.HTMLMediaElement.prototype.load=()=>{};
linked.window.eval(controller);
const ld=linked.window.document;
assert.equal(ld.querySelector('dialog').open,true);
assert.match(ld.querySelector('.journal-stage img').src,/sod-1.webp$/);
assert.equal(ld.querySelector('.journal-feature').hidden,true,'Concrete feature is hidden in landscaping');
assert.match(ld.querySelector('[data-viewer-estimate]').href,/service=landscaping$/);
ld.querySelector('[data-viewer-close]').click();
assert.equal(new URL(linked.window.location.href).searchParams.has('project'),false);
assert.equal(ld.activeElement.dataset.openStory,'sod');
linked.window.close();
console.log('Journal project links, matching-service estimate and focus recovery passed.');
