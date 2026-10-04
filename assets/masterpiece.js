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
  let dialogVideo = dialog?.querySelector('[data-dialog-video]');
  if (dialogVideo?.tagName === 'IFRAME') {
    const video = document.createElement('video');
    video.dataset.dialogVideo = '';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.hidden = true;
    dialogVideo.replaceWith(video);
    dialogVideo = video;
  }
  const dialogCaption = dialog?.querySelector('[data-dialog-caption]');
  const closeButton = dialog?.querySelector('.lightbox-close');
  let activeImage = null;
  const imageTriggers = [...document.querySelectorAll('[data-lightbox]')];
  let imageControls;
  if (dialog && imageTriggers.length > 1) {
    imageControls = document.createElement('div');
    imageControls.className = 'lightbox-navigation';
    for (const [step, label, spanish] of [[-1, 'Previous photo', 'Foto anterior'], [1, 'Next photo', 'Siguiente foto']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.en = label;
      button.dataset.es = spanish;
      button.textContent = document.documentElement.lang === 'es' ? spanish : label;
      button.addEventListener('click', () => moveImage(step));
      imageControls.append(button);
    }
    dialogCaption?.after(imageControls);
  }

  function moveImage(step) {
    if (!activeImage) return;
    const index = imageTriggers.indexOf(activeImage);
    openImage(imageTriggers[(index + step + imageTriggers.length) % imageTriggers.length]);
  }

  function clearDialog() {
    if (dialogImage) { dialogImage.hidden = true; dialogImage.removeAttribute('src'); dialogImage.alt = ''; }
    if (dialogVideo) { dialogVideo.pause(); dialogVideo.hidden = true; dialogVideo.removeAttribute('src'); dialogVideo.load(); }
  }

  function openImage(trigger) {
    if (!dialog || !dialogImage) return;
    clearDialog();
    activeImage = trigger;
    if (imageControls) imageControls.hidden = false;
    dialogImage.hidden = false;
    dialogImage.src = trigger.dataset.lightbox;
    dialogImage.alt = trigger.dataset.caption || '';
    if (dialogCaption) dialogCaption.textContent = trigger.dataset.caption || '';
    if (!dialog.open) dialog.showModal();
  }

  function openVideo(trigger) {
    if (!dialog || !dialogVideo) return;
    clearDialog();
    activeImage = null;
    if (imageControls) imageControls.hidden = true;
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
  dialog?.addEventListener('close', () => { clearDialog(); activeImage?.focus(); activeImage = null; });
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveImage(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });

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
