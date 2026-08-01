import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const pagePath = path.join(root, 'projects/ap18-floor/index.html');
const scriptPath = path.join(root, 'projects/ap18-floor/app.js');
const stylePath = path.join(root, 'projects/ap18-floor/styles.css');

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`FAIL: ${message}`);
};

for (const filePath of [pagePath, scriptPath, stylePath]) {
  if (!fs.existsSync(filePath)) fail(`Missing project viewer file: ${path.relative(root, filePath)}`);
}

if (!failures) {
  const html = fs.readFileSync(pagePath, 'utf8');
  const script = fs.readFileSync(scriptPath, 'utf8');
  const css = fs.readFileSync(stylePath, 'utf8');

  for (const requiredText of [
    'Piso de concreto de 24 × 40 pies',
    '960 ft²',
    '$12,568.50',
    '$4,398.98',
    '$5,655.83',
    '$2,513.69',
    'Representación conceptual'
  ]) {
    if (!html.includes(requiredText)) fail(`Project viewer is missing required content: ${requiredText}`);
  }

  for (const requiredId of [
    'comparison-slider',
    'after-image',
    'divider',
    'handle',
    'world',
    'rotation',
    'tilt',
    'zoom',
    'show-slab',
    'show-rebar',
    'show-base'
  ]) {
    if (!html.includes(`id="${requiredId}"`)) fail(`Project viewer is missing #${requiredId}`);
  }

  if (!/@media \(max-width: 620px\)/.test(css)) fail('Project viewer is missing its narrow-phone layout.');
  if (!/touch-action:\s*pan-y/.test(css)) fail('Before/after control does not preserve vertical touch scrolling.');

  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/projects/ap18-floor/' });
  dom.window.eval(script);

  const slider = dom.window.document.getElementById('comparison-slider');
  slider.value = '72';
  slider.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  if (dom.window.document.getElementById('after-image').style.clipPath !== 'inset(0 28% 0 0)') {
    fail('Before/after slider does not update the proposed-image reveal.');
  }
  if (dom.window.document.getElementById('divider').style.left !== '72%') {
    fail('Before/after slider does not move its divider.');
  }

  const rotation = dom.window.document.getElementById('rotation');
  rotation.value = '-10';
  rotation.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  if (!dom.window.document.getElementById('world').style.transform.includes('rotateZ(-10deg)')) {
    fail('Model rotation control does not update the model transform.');
  }

  const rebarToggle = dom.window.document.getElementById('show-rebar');
  rebarToggle.checked = false;
  rebarToggle.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  if (!dom.window.document.getElementById('rebar-layer').hidden) {
    fail('Reinforcement visibility toggle does not hide the layer.');
  }
}

if (failures) process.exit(1);
console.log('AP18 floor project viewer checks passed.');
