(() => {
  function setBilingual(node, en, es) {
    if (!node) return;
    node.dataset.en = en;
    node.dataset.es = es;
    node.textContent = document.documentElement.lang === 'es' ? es : en;
  }

  document.querySelectorAll('a.service-row').forEach(row => {
    const href = row.getAttribute('href') || '';
    if (href.includes('landscaping') || href.includes('remodeling')) row.remove();
  });

  document.querySelectorAll('[data-category]').forEach(card => {
    const categories = (card.dataset.category || '').split(' ');
    if (categories.includes('landscaping') || categories.includes('remodeling')) card.remove();
  });

  document.querySelectorAll('[data-filter]').forEach(button => {
    if (['landscaping', 'remodeling'].includes(button.dataset.filter)) button.remove();
  });

  document.querySelectorAll('[data-video-src]').forEach(card => {
    const label = `${card.dataset.caption || ''} ${card.textContent || ''}`.toLowerCase();
    if (label.includes('landscap')) card.remove();
  });

  document.querySelectorAll('[data-en]').forEach(node => {
    const en = node.dataset.en || '';
    const es = node.dataset.es || '';
    if (/five real services|five services/i.test(en)) setBilingual(node, 'Three core services', 'Tres servicios principales');
    if (/one crew\. complete property solutions/i.test(en)) setBilingual(node, 'Concrete and site-work solutions.', 'Soluciones de concreto y trabajo de terreno.');
    if (/real projects\. no filler/i.test(en)) setBilingual(node, 'Preparation, progress and finished work.', 'Preparación, avance y trabajos terminados.');
    if (/every image below comes from/i.test(en)) setBilingual(node, 'Explore concrete, grading and excavation projects from preparation through completion.', 'Explora proyectos de concreto, nivelación y excavación desde la preparación hasta la terminación.');
    if (/no stock project photos/i.test(en)) setBilingual(node, 'Prepared for demanding projects', 'Preparados para proyectos exigentes');
    if (/concrete, grading, excavation, landscaping and remodeling/i.test(en)) setBilingual(node, en.replace(/, landscaping and remodeling/i, ''), es.replace(/, jardinería y remodelación/i, ''));
  });

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
})();