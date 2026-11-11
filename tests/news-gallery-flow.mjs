import assert from 'node:assert/strict';import fs from 'node:fs';import {JSDOM} from 'jsdom';
const dom=new JSDOM(fs.readFileSync('news.html','utf8'),{url:'https://ebcconstructionllc.com/news.html',runScripts:'outside-only'});const w=dom.window,d=w.document;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};let stopped=0;w.HTMLMediaElement.prototype.pause=()=>stopped++;w.HTMLMediaElement.prototype.load=()=>{};
w.eval(fs.readFileSync('assets/news-gallery.js','utf8'));
const data=JSON.parse(d.querySelector('#news-media-data').textContent);assert.equal(data.length,14);assert.equal(new Set(data.map(s=>s.id)).size,14);
for(const s of data)for(const m of s.media){assert.ok(m.caption.en&&m.caption.es);if(!m.src.startsWith('https:'))assert.ok(fs.existsSync(m.src),m.src);if(m.poster)assert.ok(fs.existsSync(m.poster),m.poster)}
const click=sel=>d.querySelector(sel).click();const visible=()=>[...d.querySelectorAll('[data-story]')].filter(x=>!x.hidden).map(x=>x.dataset.story);
click('[data-news-service="landscaping"]');assert.deepEqual(visible(),['sod']);click('[data-news-type="video"]');assert.deepEqual(visible(),['sod']);
click('[data-story="sod"] [data-open-story]');assert.ok(d.querySelector('dialog').open);assert.match(d.querySelector('.journal-stage video').src,/sod.mp4$/);assert.equal(d.querySelectorAll('.journal-thumbnails button').length,4);
click('[data-viewer-next]');assert.match(d.querySelector('.journal-stage img').src,/sod-1.webp$/);assert.ok(stopped>0);
d.querySelector('dialog').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.match(d.querySelector('.journal-stage img').src,/sod-2.webp$/);
w.document.documentElement.lang='es';w.dispatchEvent(new w.Event('ebc:languagechange'));assert.match(d.querySelector('#news-viewer-title').textContent,/Instalación de pasto en patio/);click('[data-viewer-close]');assert.equal(d.querySelector('dialog').open,false);assert.equal(d.querySelector('.journal-stage').children.length,0);
click('[data-news-service="walls"]');assert.deepEqual(visible(),['poolside-wall-20261108']);assert.equal(d.querySelector('[data-news-empty]').hidden,true);click('[data-reset-news]');assert.equal(visible().length,10);
click('[data-news-service="concrete"]');click('[data-news-type="video"]');assert.deepEqual(visible(),['backyard-concrete-20261108','backyard-slab-20261108','driveway']);click('[data-story="backyard-concrete-20261108"] [data-open-story]');assert.ok(d.querySelector('.journal-source'));assert.match(d.querySelector('.journal-source').href,/956085537295033/);
dom.window.close();console.log('Journal: service/media intersections, native video, social fallback, same-project navigation, localization, keyboard and asset integrity passed.');

// A project link from a service page opens that exact project, not the generic gallery.
const linked = new JSDOM(fs.readFileSync('news.html','utf8'), {url:'https://ebcconstructionllc.com/news.html?project=sod#landscaping',runScripts:'outside-only'});
linked.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
linked.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new linked.window.Event('close'))};
linked.window.HTMLMediaElement.prototype.pause=()=>{};linked.window.HTMLMediaElement.prototype.load=()=>{};
linked.window.eval(fs.readFileSync('assets/news-gallery.js','utf8'));
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
