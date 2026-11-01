(() => {
  const root = document.querySelector('[data-news-gallery]');
  if (!root) return;
  const stories = JSON.parse(document.getElementById('news-media-data').textContent);
  const cards = [...root.querySelectorAll('[data-story]')];
  const dialog = document.getElementById('news-viewer');
  const stage = dialog.querySelector('.journal-stage');
  const strip = dialog.querySelector('.journal-thumbnails');
  const title = dialog.querySelector('#news-viewer-title');
  const caption = dialog.querySelector('[data-viewer-caption]');
  const counter = dialog.querySelector('[data-viewer-counter]');
  const result = document.querySelector('[data-news-count]');
  const empty = document.querySelector('[data-news-empty]');
  const serviceButtons = [...document.querySelectorAll('[data-news-service]')];
  const typeButtons = [...document.querySelectorAll('[data-news-type]')];
  const lang = () => document.documentElement.lang === 'es' ? 'es' : 'en';
  const text = (en, es) => lang() === 'es' ? es : en;
  const known = ['all', 'concrete', 'landscaping', 'walls', 'decks', 'welding'];
  let service = known.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'all';
  let type = 'all', current = null, index = 0, origin = null, swipeX = null;
  function filter(updateURL = true) {
    let count = 0;
    cards.forEach(card => {
      const story = stories.find(item => item.id === card.dataset.story);
      const matches = (service === 'all' || story.service === service) && (type === 'all' || story.media.some(m => (m.type === type || (type === 'video' && m.type === 'social'))));
      card.hidden = !matches;
      if (matches) count++;
    });
    serviceButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.newsService === service)));
    typeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.newsType === type)));
    result.textContent = text(`${count} project ${count === 1 ? "story" : "stories"}`, `${count} ${count === 1 ? "historia de proyecto" : "historias de proyectos"}`);
    empty.hidden = count > 0;
    if (updateURL) history.replaceState(null, '', location.pathname + location.search + (service === 'all' ? '' : '#' + service));
  }
  serviceButtons.forEach(button => button.addEventListener('click', () => { service = button.dataset.newsService; filter(); }));
  typeButtons.forEach(button => button.addEventListener('click', () => { type = button.dataset.newsType; filter(); }));
  document.querySelector('[data-reset-news]').addEventListener('click', () => { service = type = 'all'; filter(); });
  window.addEventListener('hashchange', () => { service = known.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'all'; filter(false); });
  function stopMedia() {
    const video = stage.querySelector('video');
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    stage.replaceChildren();
  }
  function showMedia() {
    stopMedia();
    const media = current.media[index];
    title.textContent = current.title[lang()];
    caption.textContent = media.caption[lang()];
    counter.textContent = `${index + 1} / ${current.media.length}`;
    if (media.type === 'video') {
      const video = document.createElement('video');
      video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.muted = true;
      video.poster = media.poster; video.src = media.src;
      video.setAttribute('aria-label', media.caption[lang()]);
      const fallback = document.createElement('p');
      fallback.textContent = text('Your browser cannot play this video.', 'Tu navegador no puede reproducir este video.');
      video.append(fallback); stage.append(video);
    } else if (media.type === 'social') {
      const image = document.createElement('img'); image.src = media.poster; image.alt = media.caption[lang()];
      const link = document.createElement('a'); link.className = 'journal-source'; link.href = media.src; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = text('Watch the original video ↗', 'Ver video original ↗');
      stage.append(image, link);
    } else {
      const image = document.createElement('img'); image.src = media.src; image.alt = media.caption[lang()]; stage.append(image);
    }
    strip.replaceChildren();
    current.media.forEach((m, i) => {
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', `${i + 1}. ${m.caption[lang()]}`); button.setAttribute('aria-pressed', String(i === index));
      const image = document.createElement('img'); image.src = m.poster || m.src; image.alt = ''; image.loading = 'lazy'; button.append(image);
      if (m.type !== 'image') { const mark = document.createElement('span'); mark.textContent = '▶'; mark.setAttribute('aria-hidden', 'true'); button.append(mark); }
      button.addEventListener('click', () => { index = i; showMedia(); strip.children[i]?.focus({preventScroll:true}); }); strip.append(button);
    });
    dialog.querySelector('[data-viewer-prev]').disabled = current.media.length < 2;
    dialog.querySelector('[data-viewer-next]').disabled = current.media.length < 2;
    const link = dialog.querySelector('[data-viewer-download]'); link.href = media.src; link.textContent = media.type === 'image' ? text('Open full photo ↗', 'Abrir foto completa ↗') : text('Open video ↗', 'Abrir video ↗');
  }
  function openStory(id, trigger) {
    current = stories.find(s => s.id === id); if (!current) return;
    origin = trigger; index = type === 'all' ? 0 : Math.max(0, current.media.findIndex(m => (m.type === type || (type === 'video' && m.type === 'social'))));
    showMedia(); dialog.showModal(); document.documentElement.classList.add('news-viewer-open');
    dialog.querySelector('[data-viewer-close]').focus();
  }
  document.querySelectorAll('[data-open-story]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); openStory(button.dataset.openStory, button); }));
  function advance(delta) { if (!current) return; index = (index + delta + current.media.length) % current.media.length; showMedia(); }
  dialog.querySelector('[data-viewer-prev]').addEventListener('click', () => advance(-1));
  dialog.querySelector('[data-viewer-next]').addEventListener('click', () => advance(1));
  dialog.querySelector('[data-viewer-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { stopMedia(); current = null; document.documentElement.classList.remove('news-viewer-open'); origin?.focus({preventScroll:true}); });
  dialog.addEventListener('keydown', event => { if (event.target.closest('video') || event.target.closest('.journal-thumbnails')) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); advance(event.key === 'ArrowRight' ? 1 : -1); } });
  stage.addEventListener('touchstart', event => { swipeX = event.target.tagName === 'IMG' ? event.touches[0].clientX : null; }, {passive:true});
  stage.addEventListener('touchend', event => { if (swipeX === null) return; const distance = event.changedTouches[0].clientX - swipeX; if (Math.abs(distance) > 60) advance(distance < 0 ? 1 : -1); swipeX = null; }, {passive:true});
  window.addEventListener('ebc:languagechange', () => { filter(false); if (current) showMedia(); });
  filter(false);
})();
