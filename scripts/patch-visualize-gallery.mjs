import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'projects.html');
const scriptPath = path.join(root, 'assets/portfolio.js');

let html = fs.readFileSync(htmlPath, 'utf8');
const script = fs.readFileSync(scriptPath, 'utf8');

const templateMatch = script.match(/visualizationMedia\.innerHTML = `([\s\S]*?)\n    `;/);
if (!templateMatch) throw new Error('Unable to locate the visualization gallery template in assets/portfolio.js');

const templateLines = templateMatch[1].replace(/^\n/, '').split('\n');
const nonEmpty = templateLines.filter(line => line.trim());
const minimumIndent = Math.min(...nonEmpty.map(line => line.match(/^\s*/)[0].length));
const galleryInner = templateLines
  .map(line => line.slice(Math.min(minimumIndent, line.length)))
  .map(line => line ? `          ${line}` : '')
  .join('\n')
  .trimEnd();

const startMarker = '        <div class="planning-board reveal"';
const start = html.indexOf(startMarker);
if (start === -1) {
  if (html.includes('class="visualize-media reveal"')) {
    console.log('Visualization gallery is already present.');
    process.exit(0);
  }
  throw new Error('Legacy planning board was not found in projects.html');
}

const divPattern = /<\/?div\b[^>]*>/g;
divPattern.lastIndex = start;
let depth = 0;
let end = -1;
let token;
while ((token = divPattern.exec(html))) {
  if (token.index < start) continue;
  if (token[0].startsWith('</')) depth -= 1;
  else depth += 1;
  if (depth === 0) {
    end = divPattern.lastIndex;
    break;
  }
}
if (end === -1) throw new Error('Unable to determine the end of the legacy planning board');

const replacement = `        <div class="visualize-media reveal">\n${galleryInner}\n        </div>`;
html = `${html.slice(0, start)}${replacement}${html.slice(end)}`;

const cssLink = '  <link rel="stylesheet" href="assets/backyard-transformation.css" data-visualization-gallery-styles>';
if (!html.includes('data-visualization-gallery-styles')) {
  const anchor = '  <link rel="stylesheet" href="assets/portfolio-audit.css">';
  if (!html.includes(anchor)) throw new Error('Portfolio stylesheet anchor was not found');
  html = html.replace(anchor, `${anchor}\n${cssLink}`);
}

if (html.includes('class="planning-board') || html.includes('class="concept-plan') || html.includes('class="planning-photo')) {
  throw new Error('Legacy planning media remains after replacement');
}
if ((html.match(/data-visualization-photo="/g) || []).length !== 6) {
  throw new Error('Static visualization gallery must contain exactly six photos');
}
if ((html.match(/data-visualization-story="/g) || []).length !== 2) {
  throw new Error('Static visualization gallery must contain exactly two edited stories');
}

fs.writeFileSync(htmlPath, html);
console.log('Replaced the legacy planning board with the static visualization gallery.');
