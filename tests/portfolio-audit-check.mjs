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

const audioStoryFiles = [
  'assets/video/portfolio/stories/ebc-project-story-horizontal-with-audio.mp4',
  'assets/video/portfolio/stories/ebc-project-story-vertical-with-audio.mp4',
  'assets/images/posters/stories/ebc-project-story-horizontal.webp',
  'assets/images/posters/stories/ebc-project-story-vertical.webp'
];
for (const relative of audioStoryFiles) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) fail(`project story asset is missing: ${relative}`);
  if (relative.endsWith('.mp4') && fs.existsSync(file) && fs.statSync(file).size > 25 * 1024 * 1024) {
    fail(`project story video exceeds 25 MB: ${relative}`);
  }
}
if ((script.match(/data-project-story="true"/g) || []).length !== 2) fail('portfolio must expose exactly two edited project stories');
if ((script.match(/data-audio="on"/g) || []).length !== 2) fail('edited project stories must explicitly preserve audio');
if (!/dialogVideo\.muted = card\.dataset\.audio !== 'on'/.test(script)) fail('portfolio modal does not distinguish silent process clips from project stories with sound');
if (!/Sound begins only after you choose a video and press play/.test(script)) fail('portfolio is missing the project-story sound disclosure');

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
