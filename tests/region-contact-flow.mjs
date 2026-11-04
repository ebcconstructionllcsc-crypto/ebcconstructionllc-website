import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const counties=fs.readdirSync('.').filter(x=>/-county-(sc|nc|ga)\.html$/.test(x));
assert.equal(counties.length,23);
const sitemap=fs.readFileSync('sitemap.xml','utf8'),deployment=fs.readFileSync('scripts/prepare-pages.mjs','utf8');
const hub=new JSDOM(fs.readFileSync('service-areas.html','utf8')).window.document;
const analytics=fs.readFileSync('assets/app.js','utf8').split('const menuButton')[0];
for(const f of counties){
 const dom=new JSDOM(fs.readFileSync(f,'utf8'),{url:'https://ebcconstructionllc.com/'+f+'?private=PRIVATE',runScripts:'outside-only'}),w=dom.window,d=w.document;
 assert.equal(d.querySelectorAll('h1').length,1,f);
 assert.equal(d.querySelector('link[rel=canonical]').href,'https://ebcconstructionllc.com/'+f);
 assert.ok(!d.querySelector('meta[name=robots][content*=noindex]'),f);
 assert.ok(sitemap.includes('/'+f+'</loc>')&&deployment.includes(f),f);
 assert.ok(hub.querySelector(`a[href="${f}"]`),f);
 for(const e of d.querySelectorAll('a[href],img[src]')){const p=(e.getAttribute('src')||e.getAttribute('href')).split(/[?#]/)[0];if(p&&!/^(https?:|tel:|sms:|mailto:)/.test(p))assert.ok(fs.existsSync(p),f+': '+p);}
 const estimate=d.querySelector('a[href*="area="][href*="interest=concrete-walkways"]');assert.ok(estimate,f);
 const contact=new JSDOM(fs.readFileSync('contact.html','utf8'),{url:estimate.href,runScripts:'outside-only'}),c=contact.window;
 c.eval(fs.readFileSync('assets/contact-enhancements.js','utf8'));c.eval(fs.readFileSync('assets/project-context.js','utf8'));
 assert.equal(c.document.querySelector('#service').value,'Concrete / Concreto');
 const field=c.document.querySelector('#project');assert.match(field.value,/Sidewalks & steps/);assert.match(field.value,/Project location:/);assert.ok(field.value.toLowerCase().includes(f.split('-')[0]));
 c.document.documentElement.lang='es';c.dispatchEvent(new c.Event('ebc:languagechange'));assert.match(field.value,/Ubicación del proyecto:/);
 field.value='My dimensions and address';c.document.documentElement.lang='en';c.dispatchEvent(new c.Event('ebc:languagechange'));assert.equal(field.value,'My dimensions and address');
 w.eval(analytics);d.addEventListener('click',e=>e.preventDefault());d.querySelector('a[href="tel:+18648673397"]').click();assert.equal(Array.from(w.dataLayer.at(-1))[1],'click_to_call');assert.ok(!JSON.stringify(w.dataLayer).includes('PRIVATE'));
 contact.window.close();dom.window.close();
}
for(const f of fs.readdirSync('.').filter(x=>x.endsWith('.html'))){
 const dom=new JSDOM(fs.readFileSync(f,'utf8')),d=dom.window.document;
 for(const a of d.querySelectorAll('a[href="tel:+18644502954"]'))assert.equal(a.nextElementSibling?.getAttribute('href'),'tel:+18648673397',f+': adjacent team contact');
 const bar=d.querySelector('.mobile-actions');assert.equal(bar.querySelectorAll('a').length,4,f+': mobile bar');assert.equal(bar.querySelector('a[href="tel:+18644502954"]').textContent,'Edgar');assert.equal(bar.querySelector('a[href="tel:+18648673397"]').textContent,'Noemí');
 for(const s of d.querySelectorAll('script,style'))s.remove();assert.ok(!/english (and|or) spanish|inglés (y|o) español|bilingual|bilingüe/i.test(d.documentElement.outerHTML),f+': no staff language claims');dom.window.close();
}
for(const query of ['?area=PRIVATE','?area=__proto__','?area=constructor']){
 const dom=new JSDOM('<textarea id="project"></textarea>',{url:'https://ebcconstructionllc.com/contact.html'+query,runScripts:'outside-only'});dom.window.eval(fs.readFileSync('assets/project-context.js','utf8'));assert.equal(dom.window.document.querySelector('#project').value,'');dom.window.close();
}
console.log('Regional paths: 23 indexable counties, linked and deployable; service/location context, customer edits, private analytics and paired phone contacts passed.');
