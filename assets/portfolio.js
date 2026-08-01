(() => {
  const language = () => document.documentElement.lang === 'es' ? 'es' : 'en';
  const text = (english, spanish) => language() === 'es' ? spanish : english;

  function ensureTransformationStyles() {
    if (document.querySelector('link[data-backyard-transformation-styles]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/backyard-transformation.css';
    link.dataset.backyardTransformationStyles = 'true';
    document.head.append(link);
  }

  function injectProjectTransformations() {
    const portfolioWork = document.querySelector('.portfolio-work');
    if (!portfolioWork || document.querySelector('.project-transformations')) return;

    portfolioWork.insertAdjacentHTML('afterend', `
      <section class="project-transformations" aria-labelledby="project-transformations-title">
        <div class="shell">
          <div class="transformation-head reveal">
            <div>
              <div class="kicker" data-en="Complete project" data-es="Proyecto completo">Complete project</div>
              <h2 id="project-transformations-title" class="display" data-en="A complete backyard transformation." data-es="Una transformación completa del patio.">A complete backyard transformation.</h2>
            </div>
            <div class="transformation-intro">
              <p class="lead" data-en="This real EBC project shows the property before construction and the finished result after site cleanup, wall construction, concrete access and a new pad by the detached garage." data-es="Este proyecto real de EBC muestra la propiedad antes de construir y el resultado terminado después de la limpieza del sitio, la construcción del muro, el acceso de concreto y una nueva losa junto al garaje independiente.">This real EBC project shows the property before construction and the finished result after site cleanup, wall construction, concrete access and a new pad by the detached garage.</p>
              <div class="transformation-scope" role="list" aria-label="Project scope" data-en-aria-label="Project scope" data-es-aria-label="Alcance del proyecto">
                <span role="listitem" data-en="Site cleanup" data-es="Limpieza del sitio">Site cleanup</span>
                <span role="listitem" data-en="Block wall" data-es="Muro de block">Block wall</span>
                <span role="listitem" data-en="Concrete access" data-es="Acceso de concreto">Concrete access</span>
                <span role="listitem" data-en="Concrete pad" data-es="Losa de concreto">Concrete pad</span>
              </div>
            </div>
          </div>

          <div class="transformation-comparison">
            <article class="transformation-group transformation-before reveal" aria-labelledby="transformation-before-title">
              <div class="transformation-label">
                <span>01</span>
                <div><h3 id="transformation-before-title" data-en="Before" data-es="Antes">Before</h3><p data-en="The existing yard, fence line and work area before preparation." data-es="El patio, la línea de cerca y el área de trabajo antes de la preparación.">The existing yard, fence line and work area before preparation.</p></div>
              </div>
              <div class="transformation-grid">
                <button class="portfolio-card transformation-card transformation-card-wide" type="button" data-project-transformation="true" data-media-type="image" data-full-src="assets/images/portfolio/transformations/backyard/yard-before-shed.svg" data-caption-en="Backyard and detached garage before construction" data-caption-es="Patio y garaje independiente antes de la construcción">
                  <img src="assets/images/portfolio/transformations/backyard/yard-before-shed.svg" width="1536" height="1152" loading="lazy" alt="Backyard and detached garage before the EBC project" data-en-alt="Backyard and detached garage before the EBC project" data-es-alt="Patio y garaje independiente antes del proyecto de EBC">
                  <span class="portfolio-caption"><span data-en="Before" data-es="Antes">Before</span><strong data-en="Existing backyard" data-es="Patio existente">Existing backyard</strong></span>
                </button>
                <button class="portfolio-card transformation-card transformation-card-tall" type="button" data-project-transformation="true" data-media-type="image" data-full-src="assets/images/portfolio/transformations/backyard/yard-before-tools.svg" data-caption-en="Existing work area before cleanup" data-caption-es="Área existente antes de la limpieza">
                  <img src="assets/images/portfolio/transformations/backyard/yard-before-tools.svg" width="1152" height="1536" loading="lazy" alt="Tools and stored materials across the yard before cleanup" data-en-alt="Tools and stored materials across the yard before cleanup" data-es-alt="Herramientas y materiales almacenados en el patio antes de la limpieza">
                  <span class="portfolio-caption"><span data-en="Before" data-es="Antes">Before</span><strong data-en="Area before cleanup" data-es="Área antes de la limpieza">Area before cleanup</strong></span>
                </button>
                <button class="portfolio-card transformation-card" type="button" data-project-transformation="true" data-media-type="image" data-full-src="assets/images/portfolio/transformations/backyard/yard-before-fence.svg" data-caption-en="Existing chain-link fence and yard edge" data-caption-es="Cerca de malla y límite existente del patio">
                  <img src="assets/images/portfolio/transformations/backyard/yard-before-fence.svg" width="1536" height="1152" loading="lazy" alt="Chain-link fence and planted yard edge before construction" data-en-alt="Chain-link fence and planted yard edge before construction" data-es-alt="Cerca de malla y límite con árboles antes de la construcción">
                  <span class="portfolio-caption"><span data-en="Before" data-es="Antes">Before</span><strong data-en="Existing fence line" data-es="Línea de cerca existente">Existing fence line</strong></span>
                </button>
              </div>
            </article>

            <article class="transformation-group transformation-after reveal" aria-labelledby="transformation-after-title">
              <div class="transformation-label">
                <span>02</span>
                <div><h3 id="transformation-after-title" data-en="After" data-es="Después">After</h3><p data-en="The completed wall, long concrete access and finished pad." data-es="El muro terminado, el acceso largo de concreto y la losa final.">The completed wall, long concrete access and finished pad.</p></div>
              </div>
              <div class="transformation-grid">
                <button class="portfolio-card transformation-card transformation-card-wide" type="button" data-project-transformation="true" data-media-type="image" data-full-src="assets/images/portfolio/transformations/backyard/driveway-finished.svg" data-caption-en="Finished concrete access to the detached garage" data-caption-es="Acceso de concreto terminado hasta el garaje independiente">
                  <img src="assets/images/portfolio/transformations/backyard/driveway-finished.svg" width="1110" height="1473" loading="lazy" alt="Long finished concrete access leading to a detached garage" data-en-alt="Long finished concrete access leading to a detached garage" data-es-alt="Acceso largo de concreto terminado que conduce a un garaje independiente">
                  <span class="portfolio-caption"><span data-en="After" data-es="Después">After</span><strong data-en="Finished concrete access" data-es="Acceso de concreto terminado">Finished concrete access</strong></span>
                </button>
                <button class="portfolio-card transformation-card" type="button" data-project-transformation="true" data-media-type="image" data-full-src="assets/images/portfolio/transformations/backyard/wall-finished.svg" data-caption-en="Finished block wall along the property" data-caption-es="Muro de block terminado a lo largo de la propiedad">
                  <img src="assets/images/portfolio/transformations/backyard/wall-finished.svg" width="996" height="730" loading="lazy" alt="Long finished concrete block wall beside the lawn" data-en-alt="Long finished concrete block wall beside the lawn" data-es-alt="Muro largo de block de concreto terminado junto al césped">
                  <span class="portfolio-caption"><span data-en="After" data-es="Después">After</span><strong data-en="Finished block wall" data-es="Muro de block terminado">Finished block wall</strong></span>
                </button>
                <button class="portfolio-card transformation-card" type="button" data-project-transformation="true" data-media-type="image" data-full-src="assets/images/portfolio/transformations/backyard/slab-finished.svg" data-caption-en="Finished concrete pad at the detached garage" data-caption-es="Losa de concreto terminada junto al garaje independiente">
                  <img src="assets/images/portfolio/transformations/backyard/slab-finished.svg" width="687" height="563" loading="lazy" alt="Finished concrete pad in front of a detached garage with the block wall behind it" data-en-alt="Finished concrete pad in front of a detached garage with the block wall behind it" data-es-alt="Losa de concreto terminada frente a un garaje independiente con el muro de block al fondo">
                  <span class="portfolio-caption"><span data-en="After" data-es="Después">After</span><strong data-en="Finished garage pad" data-es="Losa terminada frente al garaje">Finished garage pad</strong></span>
                </button>
              </div>
            </article>
          </div>

          <div class="transformation-cta reveal">
            <div><strong data-en="Planning a similar transformation?" data-es="¿Planeas una transformación similar?">Planning a similar transformation?</strong><span data-en="Send photos and approximate measurements so EBC can review the next step." data-es="Envía fotos y medidas aproximadas para que EBC revise el siguiente paso.">Send photos and approximate measurements so EBC can review the next step.</span></div>
            <a class="btn primary" href="contact.html?service=concrete#estimate-form" data-en="Request an estimate" data-es="Solicitar estimado">Request an estimate</a>
          </div>
        </div>
      </section>
    `);
  }

  function injectProjectStories() {
    const insertAfter = document.querySelector('.project-transformations') || document.querySelector('.portfolio-work');
    if (!insertAfter || document.querySelector('.project-stories')) return;

    insertAfter.insertAdjacentHTML('afterend', `
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

  ensureTransformationStyles();
  injectProjectTransformations();
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

  function syncLocalizedText() {
    document.querySelectorAll('.project-transformations [data-en], .project-stories [data-en]').forEach(element => {
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
