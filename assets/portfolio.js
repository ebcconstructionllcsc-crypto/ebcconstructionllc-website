(() => {
  const language = () => document.documentElement.lang === 'es' ? 'es' : 'en';
  const text = (english, spanish) => language() === 'es' ? spanish : english;

  function ensureVisualizationStyles() {
    if (document.querySelector('link[data-visualization-gallery-styles]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/backyard-transformation.css';
    link.dataset.visualizationGalleryStyles = 'true';
    document.head.append(link);
  }

  function replacePlanningBoard() {
    const planningBoard = document.querySelector('.visualize-section .planning-board');
    if (!planningBoard || document.querySelector('.visualize-section .visualize-media')) return;

    const visualizationMedia = document.createElement('div');
    visualizationMedia.className = 'visualize-media reveal';
    visualizationMedia.innerHTML = `
      <p class="visualize-gallery-intro"
        data-en="See your space's potential before construction begins."
        data-es="Mira el potencial de tu espacio antes de construir.">
        See your space's potential before construction begins.
      </p>

      <div class="visualize-gallery"
        aria-label="Site conditions, a visual concept and reference results"
        data-en-aria-label="Site conditions, a visual concept and reference results"
        data-es-aria-label="Condiciones del sitio, una propuesta visual y resultados de referencia">

        <button class="portfolio-card visualize-card" type="button"
          data-visualization-photo="existing-backyard"
          data-media-type="image"
          data-full-src="assets/images/portfolio/transformations/backyard/yard-before-shed.svg"
          data-caption-en="Existing backyard and detached garage"
          data-caption-es="Patio y garaje independiente existentes"
          aria-label="Open an enlarged view of the existing backyard"
          data-en-aria-label="Open an enlarged view of the existing backyard"
          data-es-aria-label="Abrir vista ampliada del patio existente">
          <img src="assets/images/portfolio/transformations/backyard/yard-before-shed.svg"
            width="1536" height="1152" loading="lazy" decoding="async"
            alt="Wide backyard view with a detached garage and materials before transforming the space"
            data-en-alt="Wide backyard view with a detached garage and materials before transforming the space"
            data-es-alt="Vista amplia del patio con garaje independiente y materiales antes de transformar el espacio">
          <span class="portfolio-caption">
            <span data-en="Existing condition" data-es="Condición actual">Existing condition</span>
            <strong data-en="Backyard overview" data-es="Vista general del patio">Backyard overview</strong>
          </span>
        </button>

        <button class="portfolio-card visualize-card visualize-card-tall" type="button"
          data-visualization-photo="existing-side-yard"
          data-media-type="image"
          data-full-src="assets/images/portfolio/transformations/backyard/yard-before-tools.svg"
          data-caption-en="Existing side-yard work area"
          data-caption-es="Área lateral existente"
          aria-label="Open an enlarged view of the existing side-yard area"
          data-en-aria-label="Open an enlarged view of the existing side-yard area"
          data-es-aria-label="Abrir vista ampliada del área lateral existente">
          <img src="assets/images/portfolio/transformations/backyard/yard-before-tools.svg"
            width="1152" height="1536" loading="lazy" decoding="async"
            alt="Side-yard area with equipment and materials before project preparation"
            data-en-alt="Side-yard area with equipment and materials before project preparation"
            data-es-alt="Área lateral del patio con equipo y materiales antes de preparar el proyecto">
          <span class="portfolio-caption">
            <span data-en="Existing condition" data-es="Condición actual">Existing condition</span>
            <strong data-en="Side-yard area" data-es="Área lateral">Side-yard area</strong>
          </span>
        </button>

        <button class="portfolio-card visualize-card" type="button"
          data-visualization-photo="existing-boundary"
          data-media-type="image"
          data-full-src="assets/images/portfolio/transformations/backyard/yard-before-fence.svg"
          data-caption-en="Existing boundary and fence"
          data-caption-es="Límite y cerca existentes"
          aria-label="Open an enlarged view of the existing boundary"
          data-en-aria-label="Open an enlarged view of the existing boundary"
          data-es-aria-label="Abrir vista ampliada del límite existente">
          <img src="assets/images/portfolio/transformations/backyard/yard-before-fence.svg"
            width="1536" height="1152" loading="lazy" decoding="async"
            alt="Existing chain-link fence and yard area used as a pre-project reference"
            data-en-alt="Existing chain-link fence and yard area used as a pre-project reference"
            data-es-alt="Cerca de malla existente y área de patio usada como referencia antes del proyecto">
          <span class="portfolio-caption">
            <span data-en="Site reference" data-es="Referencia del sitio">Site reference</span>
            <strong data-en="Existing boundaries" data-es="Límites existentes">Existing boundaries</strong>
          </span>
        </button>

        <button class="portfolio-card visualize-card" type="button"
          data-visualization-photo="conceptual-patio"
          data-media-type="image"
          data-full-src="assets/images/portfolio/transformations/backyard/slab-finished.svg"
          data-caption-en="Conceptual visual proposal"
          data-caption-es="Propuesta visual conceptual"
          aria-label="Open the conceptual visual proposal"
          data-en-aria-label="Open the conceptual visual proposal"
          data-es-aria-label="Abrir la propuesta visual conceptual">
          <img src="assets/images/portfolio/transformations/backyard/slab-finished.svg"
            width="687" height="563" loading="lazy" decoding="async"
            alt="Visual concept of a concrete patio and wall beside a detached garage"
            data-en-alt="Visual concept of a concrete patio and wall beside a detached garage"
            data-es-alt="Propuesta visual de un patio de concreto y un muro junto a un garaje independiente">
          <span class="portfolio-caption">
            <span data-en="Visual concept" data-es="Concepto visual">Visual concept</span>
            <strong data-en="A direction before construction" data-es="Una dirección antes de construir">A direction before construction</strong>
          </span>
        </button>

        <button class="portfolio-card visualize-card" type="button"
          data-visualization-photo="finished-block-wall"
          data-media-type="image"
          data-full-src="assets/images/portfolio/transformations/backyard/wall-finished.svg"
          data-caption-en="Finished concrete-block wall"
          data-caption-es="Muro de bloques terminado"
          aria-label="Open an enlarged view of the finished concrete-block wall"
          data-en-aria-label="Open an enlarged view of the finished concrete-block wall"
          data-es-aria-label="Abrir vista ampliada del muro de bloques terminado">
          <img src="assets/images/portfolio/transformations/backyard/wall-finished.svg"
            width="996" height="730" loading="lazy" decoding="async"
            alt="Finished concrete-block wall extending along a residential yard"
            data-en-alt="Finished concrete-block wall extending along a residential yard"
            data-es-alt="Muro de bloques de concreto terminado a lo largo de un patio residencial">
          <span class="portfolio-caption">
            <span data-en="Reference result" data-es="Resultado de referencia">Reference result</span>
            <strong data-en="Finished wall" data-es="Muro terminado">Finished wall</strong>
          </span>
        </button>

        <button class="portfolio-card visualize-card visualize-card-tall" type="button"
          data-visualization-photo="finished-concrete-access"
          data-media-type="image"
          data-full-src="assets/images/portfolio/transformations/backyard/driveway-finished.svg"
          data-caption-en="Finished long concrete access"
          data-caption-es="Acceso largo de concreto terminado"
          aria-label="Open an enlarged view of the finished concrete access"
          data-en-aria-label="Open an enlarged view of the finished concrete access"
          data-es-aria-label="Abrir vista ampliada del acceso de concreto terminado">
          <img src="assets/images/portfolio/transformations/backyard/driveway-finished.svg"
            width="1110" height="1473" loading="lazy" decoding="async"
            alt="Long finished concrete access leading to a detached garage"
            data-en-alt="Long finished concrete access leading to a detached garage"
            data-es-alt="Acceso largo de concreto terminado que conduce a un garaje independiente">
          <span class="portfolio-caption">
            <span data-en="Reference result" data-es="Resultado de referencia">Reference result</span>
            <strong data-en="Concrete access" data-es="Acceso de concreto">Concrete access</strong>
          </span>
        </button>
      </div>

      <div class="visualize-sound-actions"
        aria-label="Optional edited videos with sound"
        data-en-aria-label="Optional edited videos with sound"
        data-es-aria-label="Videos editados opcionales con sonido">
        <button class="portfolio-card portfolio-card-video visualize-story-button" type="button"
          data-visualization-story="horizontal"
          data-media-type="video"
          data-audio="on"
          data-video-src="assets/video/portfolio/stories/ebc-project-story-horizontal-with-audio.mp4"
          data-video-poster="assets/images/posters/stories/ebc-project-story-horizontal.webp"
          data-caption-en="EBC project highlights with sound"
          data-caption-es="Momentos de proyectos de EBC con sonido">
          <img src="assets/images/posters/stories/ebc-project-story-horizontal.webp"
            width="996" height="540" loading="lazy" decoding="async"
            alt="Edited EBC project montage showing preparation and completed results"
            data-en-alt="Edited EBC project montage showing preparation and completed results"
            data-es-alt="Montaje editado de proyectos de EBC con preparación y resultados terminados">
          <span class="project-story-sound" data-en="Play with sound" data-es="Reproducir con sonido">Play with sound</span>
        </button>

        <button class="portfolio-card portfolio-card-video visualize-story-button" type="button"
          data-visualization-story="vertical"
          data-media-type="video"
          data-audio="on"
          data-video-src="assets/video/portfolio/stories/ebc-project-story-vertical-with-audio.mp4"
          data-video-poster="assets/images/posters/stories/ebc-project-story-vertical.webp"
          data-caption-en="From site to finish with sound"
          data-caption-es="Del terreno al acabado con sonido">
          <img src="assets/images/posters/stories/ebc-project-story-vertical.webp"
            width="720" height="1280" loading="lazy" decoding="async"
            alt="Vertical EBC montage showing equipment, preparation and concrete work"
            data-en-alt="Vertical EBC montage showing equipment, preparation and concrete work"
            data-es-alt="Montaje vertical de EBC con equipo, preparación y trabajo de concreto">
          <span class="project-story-sound" data-en="Play with sound" data-es="Reproducir con sonido">Play with sound</span>
        </button>
      </div>

      <p class="visualize-sound-note"
        data-en="Sound begins only after you choose a video and press play. Process videos remain silent."
        data-es="El sonido comienza solamente cuando eliges un video y presionas reproducir. Los videos de proceso permanecen silenciosos.">
        Sound begins only after you choose a video and press play. Process videos remain silent.
      </p>
    `;

    planningBoard.replaceWith(visualizationMedia);
  }

  ensureVisualizationStyles();
  replacePlanningBoard();

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
  document.querySelectorAll('.portfolio-card img').forEach(image => {
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

  function syncLocalizedText() {
    document.querySelectorAll('.visualize-media [data-en]').forEach(element => {
      element.textContent = language() === 'es' ? element.dataset.es : element.dataset.en;
    });
  }

  function syncLocalizedAttributes() {
    syncLocalizedText();
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