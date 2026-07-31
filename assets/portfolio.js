(() => {
  const language = () => document.documentElement.lang === 'es' ? 'es' : 'en';
  const text = (english, spanish) => language() === 'es' ? spanish : english;

  function injectProjectStories() {
    const portfolioWork = document.querySelector('.portfolio-work');
    if (!portfolioWork || document.querySelector('.project-stories')) return;

    portfolioWork.insertAdjacentHTML('afterend', `
      <section class="project-stories dark" aria-labelledby="project-stories-title">
        <div class="shell">
          <div class="section-head">
            <div class="kicker" data-en="Project stories" data-es="Historias de proyectos">Project stories</div>
            <h2 id="project-stories-title" class="display" data-en="See the work come together." data-es="Mira cómo toma forma el trabajo.">See the work come together.</h2>
            <p class="lead" data-en="These edited highlights combine several moments from EBC projects. Tap a video to watch it with its original soundtrack." data-es="Estos videos editados reúnen varios momentos de proyectos de EBC. Toca un video para verlo con su sonido original.">These edited highlights combine several moments from EBC projects. Tap a video to watch it with its original soundtrack.</p>
          </div>
          <div class="project-story-grid">
            <button class="portfolio-card portfolio-card-video project-story-card project-story-card-horizontal" type="button" data-project-story="true" data-media-type="video" data-audio="on" data-video-src="assets/video/portfolio/stories/ebc-project-story-horizontal-with-audio.mp4" data-video-poster="assets/images/posters/stories/ebc-project-story-horizontal.webp" data-caption-en="EBC project highlights with sound" data-caption-es="Resumen de proyectos de EBC con sonido">
              <img src="assets/images/posters/stories/ebc-project-story-horizontal.webp" width="996" height="540" loading="lazy" alt="Edited EBC project montage showing preparation, demolition and completed work" data-en-alt="Edited EBC project montage showing preparation, demolition and completed work" data-es-alt="Montaje editado de proyectos de EBC con preparación, demolición y trabajo terminado">
              <span class="project-story-sound" data-en="Sound on" data-es="Con sonido">Sound on</span>
              <span class="portfolio-caption"><span data-en="Edited story" data-es="Historia editada">Edited story</span><strong data-en="Project highlights" data-es="Momentos del proyecto">Project highlights</strong></span>
            </button>
            <button class="portfolio-card portfolio-card-video project-story-card project-story-card-vertical" type="button" data-project-story="true" data-media-type="video" data-audio="on" data-video-src="assets/video/portfolio/stories/ebc-project-story-vertical-with-audio.mp4" data-video-poster="assets/images/posters/stories/ebc-project-story-vertical.webp" data-caption-en="EBC site-work story with sound" data-caption-es="Historia de trabajo de terreno de EBC con sonido">
              <img src="assets/images/posters/stories/ebc-project-story-vertical.webp" width="720" height="1280" loading="lazy" alt="Vertical edited EBC montage showing equipment, site preparation and concrete work" data-en-alt="Vertical edited EBC montage showing equipment, site preparation and concrete work" data-es-alt="Montaje vertical editado de EBC con equipo, preparación del sitio y trabajo de concreto">
              <span class="project-story-sound" data-en="Sound on" data-es="Con sonido">Sound on</span>
              <span class="portfolio-caption"><span data-en="Edited story" data-es="Historia editada">Edited story</span><strong data-en="From site to finish" data-es="Del terreno al acabado">From site to finish</strong></span>
            </button>
          </div>
          <p class="project-story-note" data-en="Sound begins only after you choose a video and press play. The process clips above remain silent." data-es="El sonido comienza solamente después de elegir un video y presionar reproducir. Los videos de proceso anteriores permanecen sin audio.">Sound begins only after you choose a video and press play. The process clips above remain silent.</p>
        </div>
      </section>
    `);
  }

  injectProjectStories();

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
      dialogVideo.muted = card.dataset.audio !== 'on';
      dialogVideo.defaultMuted = dialogVideo.muted;
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
  window.addEventListener('pagehide', stopVideo);

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
