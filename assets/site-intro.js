(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  const images = {
    'index.html': 'assets/images/logo.png',
    'about.html': 'assets/images/gallery-20261003/ebc-founder-portrait.webp',
    'projects.html': 'assets/images/gallery-20261002/driveway-angled-joints-720.webp',
    'services.html': 'assets/images/portfolio/finish/curved-driveway-finish-720.webp',
    'contact.html': 'assets/images/gallery-20261002/crew-screeding-concrete-720.webp',
    'reviews.html': 'assets/images/gallery-20261002/backyard-patio-diagonal-joints-720.webp'
  };
  if (!images[page] || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const key = 'ebc-intro-' + page;
  try { if (sessionStorage.getItem(key)) return; } catch { /* storage optional */ }
  const spanish = (() => { try { return localStorage.getItem('ebc-lang') === 'es'; } catch { return false; } })();
  const intro = document.createElement('div');
  intro.className = 'site-intro' + (page === 'index.html' ? '' : ' site-intro--photo');
  intro.setAttribute('aria-label', spanish ? 'Presentación de EBC' : 'EBC introduction');
  const image = document.createElement('img');
  image.alt = '';
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'site-intro-skip';
  skip.textContent = spanish ? 'Continuar al sitio' : 'Continue to site';
  intro.append(image, skip);
  document.body.prepend(intro);
  const timers = [];
  let finished = false;
  const remove = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    intro.remove();
    document.documentElement.classList.remove('site-intro-active');
    document.removeEventListener('keydown', onKey);
  };
  function onKey(event) { if (event.key === 'Escape' || event.key === 'Tab') remove(); }
  skip.addEventListener('click', remove);
  document.addEventListener('keydown', onKey);
  timers.push(setTimeout(remove, 3200));
  image.addEventListener('error', remove, { once: true });
  image.addEventListener('load', () => {
    if (finished) return;
    try { sessionStorage.setItem(key, '1'); } catch { /* storage optional */ }
    document.documentElement.classList.add('site-intro-active');
    intro.classList.add('is-ready');
    timers.push(setTimeout(() => intro.classList.add('is-out'), 1200));
    timers.push(setTimeout(remove, 1800));
  }, { once: true });
  image.src = images[page];
})();
