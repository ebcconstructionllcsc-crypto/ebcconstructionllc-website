(() => {
  document.querySelectorAll('[data-work-gallery]').forEach(gallery => {
    const track = gallery.querySelector('.work-gallery-track');
    const previous = gallery.querySelector('[data-gallery-prev]');
    const next = gallery.querySelector('[data-gallery-next]');
    if (!track || !previous || !next) return;
    const update = () => {
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    const move = direction => {
      const card = track.querySelector('.portfolio-card');
      const distance = (card?.getBoundingClientRect().width || track.clientWidth) + 14;
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      track.scrollBy({ left: direction * distance, behavior: reducedMotion ? 'auto' : 'smooth' });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // Filters can reveal the gallery after its initial layout was hidden.
    document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => requestAnimationFrame(update)));
    window.addEventListener('hashchange', () => requestAnimationFrame(update));
    requestAnimationFrame(update);
  });
})();
