import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const contactPath = path.join(root, 'contact.html');
const packagePath = path.join(root, 'package.json');

let html = fs.readFileSync(contactPath, 'utf8');

if (!html.includes('assets/direct-estimate-submit.css')) {
  const stylesheetAnchor = '<link rel="stylesheet" href="assets/phase-two.css">';
  if (!html.includes(stylesheetAnchor)) throw new Error('phase-two stylesheet anchor not found');
  html = html.replace(
    stylesheetAnchor,
    `${stylesheetAnchor}<link rel="stylesheet" href="assets/direct-estimate-submit.css">`
  );
}

if (!html.includes('assets/direct-estimate-submit.js')) {
  const scriptAnchor = '<script src="assets/contact-enhancements.js" defer></script>';
  if (!html.includes(scriptAnchor)) throw new Error('contact enhancements script anchor not found');
  html = html.replace(
    scriptAnchor,
    `${scriptAnchor}<script src="assets/direct-estimate-submit.js" defer></script>`
  );
}

fs.writeFileSync(contactPath, html);

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const directTest = 'node tests/direct-estimate-submit-check.mjs';
if (!packageJson.scripts['test:public-intake'].includes(directTest)) {
  packageJson.scripts['test:public-intake'] += ` && ${directTest}`;
}
const directSyntax = 'node --check assets/direct-estimate-submit.js';
if (!packageJson.scripts['test:syntax'].includes(directSyntax)) {
  packageJson.scripts['test:syntax'] = `${directSyntax} && ${packageJson.scripts['test:syntax']}`;
}
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log('Direct estimate submission wired into contact.html and verification scripts.');
