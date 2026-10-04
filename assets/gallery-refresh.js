(() => {
  // Keep all media in the HTML for no-JS access. Reveal more without a new network API.
  document.querySelectorAll('[data-gallery-more]').forEach(button => {
    if (!button.closest('[data-phase]')?.querySelector('.gallery-deferred')) button.hidden = true;
    button.addEventListener('click', () => {
      const section = button.closest('[data-phase]');
      if (!section) return;
      const remaining = [...section.querySelectorAll('.gallery-deferred')];
      const shown = remaining.slice(0, 6);
      shown.forEach(card => card.classList.remove('gallery-deferred'));
      button.setAttribute('aria-expanded', 'true');
      if (!section.querySelector('.gallery-deferred')) button.hidden = true;
      // Keyboard users can continue through the newly available cards.
      if (shown[0]) shown[0].focus({ preventScroll: true });
    });
  });
})();
