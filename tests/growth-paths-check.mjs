import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const analytics=fs.readFileSync('assets/app.js','utf8').split('const menuButton')[0];
for(const [page,service,interest] of [['retaining-walls.html','Landscaping / Paisajismo','retaining-walls'],['builders-contractors.html','Concrete / Concreto','builders-contractors'],['concrete.html','Concrete / Concreto',null]]){
 const dom=new JSDOM(fs.readFileSync(page,'utf8'),{url:'https://ebcconstructionllc.com/'+page+'?private=PRIVATE',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 assert.equal(d.querySelectorAll('h1').length,1);
 assert.equal(d.querySelector('link[rel=canonical]').href,'https://ebcconstructionllc.com/'+page);
 assert.ok(fs.readFileSync('sitemap.xml','utf8').includes('/'+page));
 assert.ok(fs.readFileSync('scripts/prepare-pages.mjs','utf8').includes(page));
 for(const el of d.querySelectorAll('a[href],img[src]')){const path=(el.getAttribute('src')||el.getAttribute('href')).split(/[?#]/)[0];if(path&&!/^(https?:|mailto:|tel:|sms:)/.test(path))assert.ok(fs.existsSync(path),page+': '+path);}
 w.eval(analytics);d.addEventListener('click',e=>e.preventDefault());
 d.querySelector('a[href^="tel:"]').click();assert.equal(Array.from(w.dataLayer.at(-1))[1],'click_to_call');
 const estimate=d.querySelector('a[href^="contact.html?service="]');estimate.click();assert.equal(Array.from(w.dataLayer.at(-1))[1],'click_estimate');
 assert.ok(!JSON.stringify(w.dataLayer).includes('PRIVATE'));
 if(interest){
  const contact=new JSDOM(fs.readFileSync('contact.html','utf8'),{url:estimate.href,runScripts:'outside-only'});
  const c=contact.window;c.eval(fs.readFileSync('assets/contact-enhancements.js','utf8'));c.eval(fs.readFileSync('assets/project-context.js','utf8'));
  assert.equal(c.document.querySelector('#service').value,service);
  const field=c.document.querySelector('#project');assert.match(field.value,/I am interested in/);
  c.document.documentElement.lang='es';c.dispatchEvent(new c.Event('ebc:languagechange'));assert.match(field.value,/Me interesa/);
  field.value='My project details';c.document.documentElement.lang='en';c.dispatchEvent(new c.Event('ebc:languagechange'));assert.equal(field.value,'My project details');
  contact.window.close();
 }
 dom.window.close();
}
for(const f of fs.readdirSync('.').filter(x=>x.endsWith('.html'))){
 const dom=new JSDOM(fs.readFileSync(f,'utf8'));const d=dom.window.document;
 for(const s of d.querySelectorAll('script,style'))s.remove();
 assert.ok(!/\\u[0-9a-f]{4}/i.test(d.documentElement.outerHTML),f+': literal Unicode escape in public copy');
 dom.window.close();
}
console.log('Growth paths: deployed pages, valid links, call/estimate analytics without personal data, bilingual service context and editable customer details passed.');
