import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const files=fs.readdirSync('.').filter(f=>/^(project-|concrete-).*\.html$/.test(f));
assert.equal(files.length,10);
const home=new JSDOM(fs.readFileSync('index.html','utf8')).window.document;
assert.equal(home.querySelectorAll('main > section').length,7);
assert.equal(home.querySelectorAll('#project-updates .signature-card').length,6);
for(const file of files){
 const d=new JSDOM(fs.readFileSync(file,'utf8')).window.document;
 assert.equal(d.querySelectorAll('h1').length,1,file);
 assert.ok(d.querySelector('h1').dataset.es,file);
 assert.equal(d.querySelector('link[rel=canonical]').href,`https://ebcconstructionllc.com/${file}`);
 assert.ok(fs.readFileSync('sitemap.xml','utf8').includes('/'+file));
 assert.ok(fs.readFileSync('scripts/prepare-pages.mjs','utf8').includes(file),'new pages must ship');
 for(const el of d.querySelectorAll('[src],a[href]')){
  const path=(el.getAttribute('src')||el.getAttribute('href')).split(/[?#]/)[0];
  if(path&&!/^(https?:|mailto:|tel:|sms:)/.test(path))assert.ok(fs.existsSync(path),file+': '+path);
 }
 for(const v of d.querySelectorAll('video')){assert.equal(v.preload,'none');assert.ok(v.controls);assert.equal(v.autoplay,false);}
}
const script=fs.readFileSync('assets/project-context.js','utf8');
for(const query of ['project=driveway','interest=concrete-patios','project=__proto__','project=%3Cscript%3E']){
 const dom=new JSDOM('<html lang="en"><textarea id="project"></textarea></html>',{url:'https://ebcconstructionllc.com/contact.html?'+query,runScripts:'outside-only'});
 const w=dom.window,field=w.document.querySelector('#project');w.eval(script);
 if(query.includes('__proto__')||query.includes('%3C'))assert.equal(field.value,'');
 else {assert.match(field.value,/I am interested/);w.document.documentElement.lang='es';w.dispatchEvent(new w.Event('ebc:languagechange'));assert.match(field.value,/Me interesa/);field.value='Customer edited details';w.document.documentElement.lang='en';w.dispatchEvent(new w.Event('ebc:languagechange'));assert.equal(field.value,'Customer edited details');}
 dom.window.close();
}
const analytics=fs.readFileSync('assets/app.js','utf8').split('const menuButton')[0];
for(const path of ['project-curved-driveway.html','concrete-patios.html','news.html']){
 const dom=new JSDOM('<a href="project-curved-driveway.html?private=secret">Project</a><a href="concrete-patios.html?private=secret">Service</a>',{url:'https://ebcconstructionllc.com/'+path+'?private=secret',runScripts:'outside-only'});
 const w=dom.window;w.eval(analytics);w.document.addEventListener('click',e=>e.preventDefault());for(const a of w.document.querySelectorAll('a'))a.click();
 const commands=w.dataLayer.map(x=>Array.from(x));assert.equal(commands.at(-2)[1],'view_project_click');assert.equal(commands.at(-1)[1],'view_service_click');assert.ok(!JSON.stringify(commands).includes('secret'));dom.window.close();
}
console.log('Signature pages: deploy inclusion, local assets, original photo navigation, bilingual context preserving edits, and private-data-free analytics passed.');
