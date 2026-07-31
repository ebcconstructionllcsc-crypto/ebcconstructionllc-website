import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'projects.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/portfolio-audit.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/portfolio.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/media/portfolio-manifest.json'), 'utf8'));
let failures = 0;
const fail = message => { failures += 1; console.error(`FAIL: ${message}`); };

for (const category of ['preparation', 'demolition', 'excavation', 'grading', 'concrete', 'finish']) {
  if (!html.includes(`data-phase="${category}"`)) fail(`projects.html is missing ${category} phase`);
  if (!html.includes(`data-filter="${category}"`)) fail(`projects.html is missing ${category} filter`);
}

if (/drive\.google\.com|googleusercontent\.com/.test(html)) fail('projects.html still depends on Google Drive media');
if (/<iframe\b/i.test(html)) fail('projects.html still embeds video through an iframe');
if (!/Visualize your project before work begins\./.test(html)) fail('projects.html is missing the visual planning section');
if (!/representations? are conceptual|Visual references are conceptual/.test(html)) fail('projects.html is missing the conceptual visualization disclaimer');
if (!/aria-pressed="true"/.test(html)) fail('portfolio filters do not expose an active state');
if (!/preload="metadata"/.test(html)) fail('local video modal does not define a conservative preload strategy');
if (!/muted playsinline/.test(html)) fail('local video modal is missing muted and playsinline');
if (!/reveal-fallback/.test(html) || !/reveal-fallback/.test(css)) fail('portfolio reveal fallback is incomplete');
if (!/dialogVideo\.pause\(\)/.test(script) || !/dialog\?\.addEventListener\('close'/.test(script)) fail('closing the modal does not stop video playback');
if (!/setAttribute\('aria-pressed'/.test(script)) fail('portfolio filter script does not maintain aria-pressed');

const localReferences = [...html.matchAll(/\b(?:src|href|data-full-src|data-video-src|data-video-poster)="([^"]+)"/g)]
  .map(match => match[1])
  .filter(reference => !/^(?:https?:|tel:|sms:|mailto:|#)/.test(reference));
for (const reference of localReferences) {
  const clean = reference.split(/[?#]/)[0];
  if (!clean) continue;
  if (!fs.existsSync(path.join(root, clean))) fail(`projects.html references missing local file ${reference}`);
}

for (const photo of manifest.photos) {
  for (const output of photo.outputs) {
    const file = path.join(root, output.path);
    if (!fs.existsSync(file)) fail(`manifest photo is missing: ${output.path}`);
    if (output.bytes > 1_500_000) fail(`optimized photo is too large: ${output.path}`);
  }
}
for (const video of manifest.videos) {
  const file = path.join(root, video.path);
  const poster = path.join(root, video.poster);
  if (!fs.existsSync(file)) fail(`manifest video is missing: ${video.path}`);
  if (!fs.existsSync(poster)) fail(`manifest poster is missing: ${video.poster}`);
  if (video.audio !== false) fail(`video manifest must confirm no audio: ${video.path}`);
  if (video.bytes > 25 * 1024 * 1024) fail(`video exceeds 25 MB: ${video.path}`);
}

if (failures) process.exit(1);
console.log('Portfolio audit checks passed.');
