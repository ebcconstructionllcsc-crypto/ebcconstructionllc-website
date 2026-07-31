(() => {
  const language = () => document.documentElement.lang === 'es' ? 'es' : 'en';
  const text = (english, spanish) => language() === 'es' ? spanish : english;

  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const phases = [...document.querySelectorAll('[data-phase]')];
  const filterRegion = document.querySelector('.portfolio-phases');

  const filterLabels = {
    preparation: ['preparation', 'preparación'],
    demolition: ['demolition', 'demolición'],
    excavation: ['excavation', 'excavación'],
    grading: ['grading', 'nivelación'],
    concrete: ['concrete', 'concreto'],
    finish: ['finish', 'acabado']
  };

  function setFilter(filter) {
    filterButtons.forEach(button => {
      const active = button.dataset.filter === filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    phases.forEach(phase => {
      const visible = filter === 'all' || phase.dataset.phase === filter;
      phase.hidden = !visible;
    });

    if (filterRegion) {
      const label = filterLabels[filter] || [filter, filter];
      filterRegion.setAttribute('aria-label', text(
        filter === 'all' ? 'Showing all project phases' : `Showing ${label[0]} work`,
        filter === 'all' ? 'Mostrando todas las etapas del proyecto' : `Mostrando trabajos de ${label[1]}`
      ));
    }
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => setFilter(button.dataset.filter || 'all'));
  });

  const dialog = document.querySelector('#portfolio-lightbox');
  const dialogImage = document.querySelector('#portfolio-lightbox-image');
  const dialogVideo = document.querySelector('#portfolio-lightbox-video');
  const dialogCaption = document.querySelector('#portfolio-lightbox-caption');
  const dialogClose = document.querySelector('.portfolio-lightbox-close');
  let activeTrigger = null;

  function captionFor(card) {
    return language() === 'es' ? card.dataset.captionEs : card.dataset.captionEn;
  }

  function stopVideo() {
    if (!dialogVideo) return;
    dialogVideo.pause();
    dialogVideo.removeAttribute('src');
    dialogVideo.load();
    dialogVideo.hidden = true;
  }

  function closeDialog() {
    stopVideo();
    if (dialogImage) {
      dialogImage.hidden = true;
      dialogImage.removeAttribute('src');
    }
    if (dialog?.open) dialog.close();
  }

  function openDialog(card) {
    if (!dialog || !dialogImage || !dialogVideo || !dialogCaption) return;
    activeTrigger = card;
    const caption = captionFor(card) || '';
    dialogCaption.textContent = caption;

    if (card.dataset.mediaType === 'video') {
      dialogImage.hidden = true;
      dialogImage.removeAttribute('src');
      dialogVideo.poster = card.dataset.videoPoster || '';
      dialogVideo.src = card.dataset.videoSrc || '';
      dialogVideo.muted = true;
      dialogVideo.hidden = false;
    } else {
      stopVideo();
      dialogImage.src = card.dataset.fullSrc || card.querySelector('img')?.currentSrc || '';
      dialogImage.alt = caption;
      dialogImage.hidden = false;
    }

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialogClose?.focus();
  }

  document.querySelectorAll('.portfolio-card').forEach(card => {
    card.addEventListener('click', () => openDialog(card));
  });
  dialogClose?.addEventListener('click', closeDialog);
  dialog?.addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog();
  });
  dialog?.addEventListener('close', () => {
    stopVideo();
    activeTrigger?.focus();
    activeTrigger = null;
  });
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });

  const fallbackPath = 'assets/images/image-fallback.webp';
  document.querySelectorAll('.portfolio-card img, .planning-board img').forEach(image => {
    image.addEventListener('error', () => {
      image.removeAttribute('srcset');
      image.src = fallbackPath;
      const card = image.closest('.portfolio-card');
      if (card) {
        card.classList.add('asset-error');
        card.dataset.errorLabel = text('Project image temporarily unavailable', 'Imagen del proyecto temporalmente no disponible');
      }
    }, { once: true });
  });

  function syncLocalizedAttributes() {
    document.querySelectorAll('[data-en-alt]').forEach(element => {
      element.alt = language() === 'es' ? element.dataset.esAlt : element.dataset.enAlt;
    });
    document.querySelectorAll('[data-en-aria-label]').forEach(element => {
      element.setAttribute('aria-label', language() === 'es' ? element.dataset.esAriaLabel : element.dataset.enAriaLabel);
    });
    document.querySelectorAll('.portfolio-card.asset-error').forEach(card => {
      card.dataset.errorLabel = text('Project image temporarily unavailable', 'Imagen del proyecto temporalmente no disponible');
    });
    if (dialog?.open && activeTrigger && dialogCaption) dialogCaption.textContent = captionFor(activeTrigger) || '';
  }

  window.addEventListener('ebc:languagechange', syncLocalizedAttributes);
  syncLocalizedAttributes();

  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
