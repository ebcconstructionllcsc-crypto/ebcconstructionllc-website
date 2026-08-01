import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/portfolio.js'), 'utf8');
const cssPath = path.join(root, 'assets/backyard-transformation.css');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
let failures = 0;
const fail = message => { failures += 1; console.error(`FAIL: ${message}`); };

if (!fs.existsSync(cssPath)) fail('backyard transformation stylesheet is missing');
if (!/backyard-transformation\.css/.test(script)) fail('portfolio script does not load the transformation stylesheet');
if (!/\.project-transformations\b/.test(css)) fail('transformation stylesheet is missing its section rules');
if (!/A complete backyard transformation\./.test(script)) fail('English transformation heading is missing');
if (!/Una transformación completa del patio\./.test(script)) fail('Spanish transformation heading is missing');
if ((script.match(/data-project-transformation="true"/g) || []).length !== 6) fail('transformation section must expose exactly six project photos');
if (!/injectProjectTransformations\(\)/.test(script)) fail('transformation section is not initialized');
if (!/Block wall/.test(script) || !/Muro de block/.test(script)) fail('project scope is missing the finished block wall');
if (!/Concrete access/.test(script) || !/Acceso de concreto/.test(script)) fail('project scope is missing the concrete access');

const assets = [
  'wall-finished.svg',
  'driveway-finished.svg',
  'slab-finished.svg',
  'yard-before-tools.svg',
  'yard-before-shed.svg',
  'yard-before-fence.svg'
];
for (const name of assets) {
  const file = path.join(root, 'assets/images/portfolio/transformations/backyard', name);
  if (!fs.existsSync(file)) fail(`transformation photo is missing: ${name}`);
  if (fs.existsSync(file) && fs.statSync(file).size > 300_000) fail(`transformation photo is too large: ${name}`);
}

if (failures) process.exit(1);
console.log('Backyard transformation checks passed.');
