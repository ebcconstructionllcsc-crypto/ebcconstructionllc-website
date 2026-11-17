import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
export const START = '<!-- EBC PROJECT CATALOG:START -->';
export const END = '<!-- EBC PROJECT CATALOG:END -->';
const services = {
  all: ['All projects', 'Todos los proyectos'],
  concrete: ['Concrete', 'Concreto'],
  walls: ['Retaining walls', 'Muros de contención'],
  decks: ['Decks', 'Decks'],
  landscaping: ['Landscaping', 'Paisajismo'],
  welding: ['Welding', 'Soldadura']
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const translated = (en, es) => `data-en="${escape(en)}" data-es="${escape(es)}"`;

export function readStories(html) {
  const matches = [...html.matchAll(/<script\b[^>]*\bid=(["'])news-media-data\1[^>]*>([\s\S]*?)<\/script>/g)];
  if (matches.length !== 1) throw new Error('news.html must contain exactly one #news-media-data script.');
  return JSON.parse(matches[0][2]);
}

function validateStories(stories) {
  if (!Array.isArray(stories) || !stories.length) throw new Error('The project catalog requires journal stories.');
  const ids = new Set();
  for (const story of stories) {
    if (typeof story.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(story.id) || ids.has(story.id)) throw new Error(`Invalid or duplicate story ID: ${story.id}`);
    ids.add(story.id);
    if (story.service === 'all' || !Object.hasOwn(services, story.service)) throw new Error(`Unknown service for ${story.id}`);
    for (const field of ['title', 'description']) {
      for (const lang of ['en', 'es']) {
        if (typeof story[field]?.[lang] !== 'string' || !story[field][lang].trim()) throw new Error(`Missing ${lang} ${field} for ${story.id}`);
      }
    }
    if (typeof story.cover !== 'string' || !story.cover.startsWith('assets/images/') || /[<>"'\\?#]/.test(story.cover) || story.cover.split('/').includes('..')) {
      throw new Error(`Expected a local project cover for ${story.id}`);
    }
    if (!Array.isArray(story.media) || !story.media.length || story.media.some(item => !['image', 'video', 'social'].includes(item.type))) {
      throw new Error(`Invalid media for ${story.id}`);
    }
  }
}

function mediaLabel(story, lang) {
  const photos = story.media.filter(item => item.type === 'image').length;
  const videos = story.media.length - photos;
  const parts = [];
  if (photos) parts.push(`${photos} ${lang === 'es' ? (photos === 1 ? 'foto' : 'fotos') : (photos === 1 ? 'photo' : 'photos')}`);
  if (videos) parts.push(`${videos} ${videos === 1 ? 'video' : 'videos'}`);
  return parts.join(' · ');
}

export function renderProjectCatalog(stories) {
  validateStories(stories);
  const filters = Object.entries(services).map(([key, labels]) =>
    `<button type="button" data-catalog-filter="${key}" aria-pressed="${key === 'all'}" ${translated(...labels)}>${escape(labels[0])}</button>`
  ).join('\n');
  const cards = stories.map(story => {
    const label = services[story.service];
    const counts = [mediaLabel(story, 'en'), mediaLabel(story, 'es')];
    return `<article class="project-catalog-card" data-catalog-story="${story.id}" data-catalog-service="${story.service}">
  <a class="project-catalog-link" href="news.html?project=${story.id}">
    <div class="project-catalog-photo"><img src="${escape(story.cover)}" alt="${escape(story.title.en)}" data-en-alt="${escape(story.title.en)}" data-es-alt="${escape(story.title.es)}" loading="lazy" decoding="async"></div>
    <div class="project-catalog-copy"><span class="project-catalog-service" ${translated(...label)}>${escape(label[0])}</span>
      <h3 ${translated(story.title.en, story.title.es)}>${escape(story.title.en)}</h3>
      <p class="project-catalog-media" ${translated(...counts)}>${escape(counts[0])}</p>
      <span class="project-catalog-open" ${translated('Open project gallery →', 'Ver galería del proyecto →')}>Open project gallery →</span>
    </div>
  </a>
</article>`;
  }).join('\n');
  const countEn = `${stories.length} ${stories.length === 1 ? 'project' : 'projects'}`;
  const countEs = `${stories.length} ${stories.length === 1 ? 'proyecto' : 'proyectos'}`;
  return `${START}
<section id="project-updates" class="project-catalog" data-project-catalog aria-labelledby="project-catalog-title">
  <div class="shell">
    <div class="project-catalog-heading"><div class="kicker" ${translated('The project collection', 'Nuestra colección de proyectos')}>The project collection</div>
      <h2 id="project-catalog-title" class="display" ${translated('Find a project like yours.', 'Encuentra un proyecto como el tuyo.')}>Find a project like yours.</h2>
      <p class="lead" ${translated('Explore our concrete, walls, decks, landscaping and welding. Open each project to see its photos and videos.', 'Explora nuestros trabajos de concreto, muros, decks, paisajismo y soldadura. Abre cada proyecto para ver sus fotos y videos.')}>Explore our concrete, walls, decks, landscaping and welding. Open each project to see its photos and videos.</p>
    </div>
    <div class="project-catalog-toolbar">
      <div class="project-catalog-filters" data-catalog-filters hidden role="group" aria-label="Filter projects by service" data-en-aria-label="Filter projects by service" data-es-aria-label="Filtrar proyectos por servicio">
${filters}
      </div>
      <p class="project-catalog-count" data-catalog-count role="status" aria-live="polite" aria-atomic="true" ${translated(countEn, countEs)}>${countEn}</p>
    </div>
    <div class="project-catalog-grid">
${cards}
    </div>
    <p class="project-catalog-empty" data-catalog-empty hidden ${translated('No projects in this category yet. Choose another service to explore our work.', 'Todavía no hay proyectos en esta categoría. Elige otro servicio para ver nuestros trabajos.')}>No projects in this category yet. Choose another service to explore our work.</p>
    <div class="project-catalog-footer"><p ${translated('Have a similar project in mind?', '¿Tienes en mente un proyecto parecido?')}>Have a similar project in mind?</p><a class="btn primary" href="contact.html#estimate-form" ${translated('Request a free estimate', 'Solicitar estimado gratis')}>Request a free estimate</a><a class="btn" href="#portfolio" ${translated('Explore the full photo archive', 'Explorar el archivo completo de fotos')}>Explore the full photo archive</a></div>
  </div>
</section>
${END}`;
}

export function replaceProjectCatalog(html, stories) {
  const start = html.indexOf(START), end = html.indexOf(END);
  if (start < 0 || end <= start || html.indexOf(START, start + START.length) !== -1 || html.indexOf(END, end + END.length) !== -1) {
    throw new Error('projects.html must contain exactly one bounded EBC project catalog.');
  }
  return html.slice(0, start) + renderProjectCatalog(stories) + html.slice(end + END.length);
}

export function syncProjectGallery({ sourcePath = path.join(root, 'news.html'), targetPath = path.join(root, 'projects.html'), check = false } = {}) {
  const current = fs.readFileSync(targetPath, 'utf8');
  const updated = replaceProjectCatalog(current, readStories(fs.readFileSync(sourcePath, 'utf8')));
  if (current === updated) return false;
  if (check) throw new Error('Projects catalog is out of date. Run npm run sync:projects and commit projects.html with the journal update.');
  fs.writeFileSync(targetPath, updated);
  return true;
}

if (process.argv[1] === import.meta.filename) {
  try {
    const changed = syncProjectGallery({ check: process.argv.includes('--check') });
    console.log(changed ? 'Projects catalog updated from the journal.' : 'Projects catalog matches the journal.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
