import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/portfolio.js'), 'utf8');
const cssPath = path.join(root, 'assets/backyard-transformation.css');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
let failures = 0;
const fail = message => { failures += 1; console.error(`FAIL: ${message}`); };

if (!fs.existsSync(cssPath)) fail('visualization gallery stylesheet is missing');
if (!/backyard-transformation\.css/.test(script)) fail('portfolio script does not load the visualization stylesheet');
if (!/\.visualize-gallery\b/.test(css)) fail('visualization stylesheet is missing gallery rules');
if (!/replacePlanningBoard\(\)/.test(script)) fail('legacy planning board replacement is not initialized');
if (!/planningBoard\.replaceWith\(visualizationMedia\)/.test(script)) fail('legacy planning board is not replaced');
if (/injectProjectTransformations|class=\"project-transformations\"/.test(script)) fail('obsolete standalone transformation section remains');
if (/injectProjectStories|class=\"project-stories\"/.test(script)) fail('edited story videos are still duplicated in a separate section');

if (!/See your space's potential before construction begins\./.test(script)) fail('English visualization headline is missing');
if (!/Mira el potencial de tu espacio antes de construir\./.test(script)) fail('Spanish visualization headline is missing');
if ((script.match(/data-visualization-photo=\"/g) || []).length !== 6) fail('visualization section must expose exactly six replacement photos');
if ((script.match(/data-visualization-story=\"/g) || []).length !== 2) fail('visualization section must expose exactly two optional edited stories');
if ((script.match(/data-audio=\"on\"/g) || []).length !== 2) fail('only the two edited stories may enable sound');
if (!/Process videos remain silent/.test(script) || !/Los videos de proceso permanecen silenciosos/.test(script)) {
  fail('visualization section is missing the bilingual sound disclosure');
}

for (const required of [
  'Existing condition',
  'Condición actual',
  'Visual concept',
  'Concepto visual',
  'Reference result',
  'Resultado de referencia'
]) {
  if (!script.includes(required)) fail(`visualization story label is missing: ${required}`);
}

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
  if (!fs.existsSync(file)) fail(`visualization photo is missing: ${name}`);
  if (fs.existsSync(file) && fs.statSync(file).size > 300_000) fail(`visualization photo is too large: ${name}`);
}

if (failures) process.exit(1);
console.log('Visualization gallery checks passed.');