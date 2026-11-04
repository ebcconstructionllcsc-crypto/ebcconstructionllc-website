(() => {
  const projects = [...document.querySelectorAll('.story-project')];
  const filters = [...document.querySelectorAll('[data-story-filter]')];
  const dialog = document.querySelector('#story-lightbox');
  if (!dialog) return;
  const photo = dialog.querySelector('img');
  let selection = [], position = 0, trigger = null;
  const spanish = () => document.documentElement.lang === 'es';
  function render() {
    const item = selection[position];
    if (!item) return;
    photo.src = item.dataset.storyPhoto;
    const caption = spanish() ? item.dataset.captionEs : item.dataset.captionEn;
    photo.alt = caption;
    document.querySelector('#story-caption').textContent = caption;
    document.querySelector('#story-position').textContent = `${position + 1} / ${selection.length}`;
  }
  function move(delta) { position = (position + delta + selection.length) % selection.length; render(); }
  document.querySelectorAll('[data-story-photo]').forEach(button => button.addEventListener('click', () => {
    trigger = button;
    selection = [...button.closest('.story-project').querySelectorAll('[data-story-photo]')].filter(item => !item.closest('[data-story-stage]').hidden);
    position = selection.indexOf(button);
    render(); dialog.showModal();
  }));
  dialog.querySelector('[data-story-prev]').addEventListener('click', () => move(-1));
  dialog.querySelector('[data-story-next]').addEventListener('click', () => move(1));
  dialog.querySelector('[data-story-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { photo.removeAttribute('src'); trigger?.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
  });
  let currentFilter = 'all';
  function applyFilter(value) {
    currentFilter = value;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.storyFilter === value)));
    projects.forEach(project => {
      let visible = false;
      project.querySelectorAll('[data-story-stage]').forEach(stage => {
        stage.hidden = value !== 'all' && stage.dataset.storyStage !== value;
        if (!stage.hidden) visible = true;
        if (stage.hidden) stage.querySelectorAll('video').forEach(video => video.pause());
      });
      project.hidden = !visible;
    });
    const count = projects.filter(project => !project.hidden).length;
    document.querySelector('.story-status').textContent = spanish() ? `${count} galerías de proyectos` : `${count} project galleries`;
  }
  filters.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.storyFilter)));
  function openProject(id) {
    const project = projects.find(item => item.id === id);
    if (!project) return;
    applyFilter('all'); project.open = true; project.scrollIntoView({block:'start'});
  }
  document.querySelector('#story-select').addEventListener('change', event => {
    if (event.target.value) { history.replaceState(null,'',`#${event.target.value}`); openProject(event.target.value); }
    else { applyFilter('all'); history.replaceState(null,'',location.pathname); }
  });
  projects.forEach(project => project.addEventListener('toggle', () => {
    if (!project.open) project.querySelectorAll('video').forEach(video => video.pause());
  }));
  window.addEventListener('ebc:languagechange', () => { applyFilter(currentFilter); if (dialog.open) render(); });
  window.addEventListener('hashchange', () => openProject(location.hash.slice(1)));
  if (location.hash) openProject(location.hash.slice(1));
})();
