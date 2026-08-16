(() => {
  const filters = document.querySelectorAll('[data-filter]');
  const cards = document.querySelectorAll('[data-category]');
  filters.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filters.forEach(item => item.classList.toggle('active', item === button));
      cards.forEach(card => {
        const categories = (card.dataset.category || '').split(' ');
        card.classList.toggle('hidden', filter !== 'all' && !categories.includes(filter));
      });
    });
  });

  // Defensive cleanup: an earlier cached script could have inserted this block.
  // Reviews now live only on reviews.html.
  document.querySelector('#customer-reviews')?.remove();

  const dialog = document.querySelector('#media-lightbox');
  const dialogImage = dialog?.querySelector('[data-dialog-image]');
  const dialogVideo = dialog?.querySelector('[data-dialog-video]');
  const dialogCaption = dialog?.querySelector('[data-dialog-caption]');
  const closeButton = dialog?.querySelector('.lightbox-close');

  function clearDialog() {
    if (dialogImage) { dialogImage.hidden = true; dialogImage.removeAttribute('src'); dialogImage.alt = ''; }
    if (dialogVideo) { dialogVideo.hidden = true; dialogVideo.removeAttribute('src'); }
  }

  function openImage(trigger) {
    if (!dialog || !dialogImage) return;
    clearDialog();
    dialogImage.hidden = false;
    dialogImage.src = trigger.dataset.lightbox;
    dialogImage.alt = trigger.dataset.caption || '';
    if (dialogCaption) dialogCaption.textContent = trigger.dataset.caption || '';
    dialog.showModal();
  }

  function openVideo(trigger) {
    if (!dialog || !dialogVideo) return;
    clearDialog();
    dialogVideo.hidden = false;
    dialogVideo.src = trigger.dataset.videoSrc;
    if (dialogCaption) dialogCaption.textContent = trigger.dataset.caption || '';
    dialog.showModal();
  }

  document.addEventListener('click', event => {
    const imageTrigger = event.target.closest('[data-lightbox]');
    if (imageTrigger) return openImage(imageTrigger);
    const videoTrigger = event.target.closest('[data-video-src]');
    if (videoTrigger) return openVideo(videoTrigger);
  });

  closeButton?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('close', clearDialog);
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  document.querySelectorAll('[data-year]').forEach(node => { node.textContent = String(new Date().getFullYear()); });

  // Keep reviews as their own site section/page, not inside the homepage content.
  const nav = document.querySelector('.navlinks');
  if (nav && !nav.querySelector('a[href="reviews.html"]')) {
    const reviewsLink = document.createElement('a');
    reviewsLink.href = 'reviews.html';
    reviewsLink.setAttribute('data-en', 'Reviews');
    reviewsLink.setAttribute('data-es', 'Reseñas');
    reviewsLink.textContent = document.documentElement.lang === 'es' ? 'Reseñas' : 'Reviews';
    const cta = nav.querySelector('.nav-cta');
    nav.insertBefore(reviewsLink, cta || null);
  }
})();
