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
