(() => {
  const root = document.querySelector('[data-project-catalog]');
  if (!root) return;
  const filters = root.querySelector('[data-catalog-filters]');
  const buttons = [...root.querySelectorAll('[data-catalog-filter]')];
  const cards = [...root.querySelectorAll('[data-catalog-story]')];
  const count = root.querySelector('[data-catalog-count]');
  const empty = root.querySelector('[data-catalog-empty]');
  if (!filters || !buttons.length || !count || !empty) return;
  const known = new Set(buttons.map(button => button.dataset.catalogFilter));
  const hashes = {
    '#concrete': 'concrete', '#driveways': 'concrete', '#porches': 'concrete',
    '#sidewalks': 'concrete', '#slab-steps': 'concrete', '#california-style': 'concrete',
    '#preparation-media': 'concrete', '#retaining-walls': 'walls', '#walls': 'walls',
    '#decks': 'decks', '#landscaping': 'landscaping', '#welding': 'welding'
  };
  let selected = hashes[location.hash] || 'all';

  function render() {
    let total = 0;
    for (const card of cards) {
      card.hidden = selected !== 'all' && card.dataset.catalogService !== selected;
      if (!card.hidden) total++;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.catalogFilter === selected));
    count.dataset.en = `${total} ${total === 1 ? 'project' : 'projects'}`;
    count.dataset.es = `${total} ${total === 1 ? 'proyecto' : 'proyectos'}`;
    count.textContent = document.documentElement.lang === 'es' ? count.dataset.es : count.dataset.en;
    empty.hidden = total > 0;
  }

  for (const button of buttons) button.addEventListener('click', () => {
    if (!known.has(button.dataset.catalogFilter)) return;
    selected = button.dataset.catalogFilter;
    render();
  });
  window.addEventListener('hashchange', () => {
    selected = hashes[location.hash] || 'all';
    render();
  });
  window.addEventListener('ebc:languagechange', render);
  render();
  filters.hidden = false;
})();
