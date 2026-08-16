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

  // Homepage-only review section. Existing homepage content is left untouched;
  // this section is inserted immediately before the final estimate CTA.
  const path = window.location.pathname.replace(/\/+$/, '');
  const isHome = path === '' || path === '/index.html';
  if (isHome && !document.querySelector('#customer-reviews')) {
    const main = document.querySelector('main');
    const finalCta = main?.querySelector('section:last-of-type');

    if (main && finalCta) {
      const style = document.createElement('style');
      style.textContent = `
        #customer-reviews .review-shell{display:grid;gap:34px}
        #customer-reviews .review-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:22px;align-items:stretch}
        #customer-reviews .review-panel{padding:34px;border:1px solid var(--line);border-radius:22px;background:rgba(255,255,255,.5);box-shadow:0 18px 54px rgba(16,16,15,.08)}
        #customer-reviews .review-panel.primary{background:linear-gradient(135deg,rgba(212,166,78,.18),rgba(255,255,255,.66));border-color:rgba(212,166,78,.48)}
        #customer-reviews .review-stars{font-size:1.35rem;letter-spacing:.16em;color:var(--accent-dark);margin-bottom:14px}
        #customer-reviews h3{margin:0 0 10px;font-size:1.55rem}
        #customer-reviews p{margin:0;color:var(--muted)}
        #customer-reviews .review-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
        #customer-reviews .review-note{margin-top:12px;font-size:.9rem;color:var(--muted)}
        @media(max-width:760px){#customer-reviews .review-grid{grid-template-columns:1fr}#customer-reviews .review-panel{padding:26px}}
      `;
      document.head.appendChild(style);

      const section = document.createElement('section');
      section.id = 'customer-reviews';
      section.innerHTML = `
        <div class="shell review-shell">
          <div class="section-head reveal">
            <div class="kicker" data-en="Customer reviews" data-es="Reseñas de clientes">Customer reviews</div>
            <h2 class="display" data-en="Your trust builds our reputation." data-es="Tu confianza construye nuestra reputación.">Your trust builds our reputation.</h2>
            <p class="lead" data-en="See what customers are saying about EBC Construction LLC, or share your own experience after working with us." data-es="Mira lo que dicen nuestros clientes sobre EBC Construction LLC o comparte tu propia experiencia después de trabajar con nosotros.">See what customers are saying about EBC Construction LLC, or share your own experience after working with us.</p>
          </div>
          <div class="review-grid reveal">
            <article class="review-panel primary">
              <div class="review-stars" aria-label="Five stars">★★★★★</div>
              <h3 data-en="Read our customer reviews" data-es="Lee las reseñas de nuestros clientes">Read our customer reviews</h3>
              <p data-en="Visit our Google Business Profile to read current customer feedback and see our public reputation." data-es="Visita nuestro perfil de Google para leer opiniones actuales de clientes y ver nuestra reputación pública.">Visit our Google Business Profile to read current customer feedback and see our public reputation.</p>
              <div class="review-actions">
                <a class="btn primary" href="https://share.google/P5Stj2gMsbNpfhz1F" target="_blank" rel="noopener noreferrer" data-en="See Google Reviews" data-es="Ver reseñas en Google">See Google Reviews</a>
              </div>
            </article>
            <article class="review-panel">
              <h3 data-en="Worked with EBC?" data-es="¿Trabajaste con EBC?">Worked with EBC?</h3>
              <p data-en="Your review helps a growing local company and helps future customers choose with confidence." data-es="Tu reseña ayuda a una compañía local en crecimiento y ayuda a futuros clientes a elegir con confianza.">Your review helps a growing local company and helps future customers choose with confidence.</p>
              <div class="review-actions">
                <a class="btn primary" href="https://share.google/P5Stj2gMsbNpfhz1F" target="_blank" rel="noopener noreferrer" data-en="Review on Google" data-es="Reseña en Google">Review on Google</a>
                <a class="btn" href="https://www.facebook.com/share/1EyMs215M1/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" data-en="Facebook" data-es="Facebook">Facebook</a>
                <a class="btn" href="https://www.facebook.com/marketplace/profile/100059137420359/?ref=permalink&mibextid=6ojiHh" target="_blank" rel="noopener noreferrer" data-en="Marketplace" data-es="Marketplace">Marketplace</a>
              </div>
              <p class="review-note" data-en="Choose whichever platform is easiest for you." data-es="Elige la plataforma que te resulte más fácil.">Choose whichever platform is easiest for you.</p>
            </article>
          </div>
        </div>
      `;

      main.insertBefore(section, finalCta);

      // Re-apply the site's current language to the newly inserted section.
      const activeLang = document.documentElement.lang === 'es' ? 'es' : 'en';
      section.querySelectorAll('[data-en][data-es]').forEach(node => {
        node.textContent = node.dataset[activeLang] || node.textContent;
      });
    }
  }
})();
