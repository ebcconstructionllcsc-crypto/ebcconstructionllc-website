const bar = document.querySelector('.topbar');
const menu = document.querySelector('.menu-btn');
const links = document.querySelector('.navlinks');

const syncHeader = () => bar?.classList.toggle('scrolled', window.scrollY > 30);
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

const setMenu = (open) => {
  links?.classList.toggle('open', open);
  menu?.setAttribute('aria-expanded', String(open));
  menu?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (menu) menu.textContent = open ? '×' : '☰';
  document.body.classList.toggle('menu-open', open);
};

menu?.addEventListener('click', () => setMenu(!links?.classList.contains('open')));
links?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});

const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.navlinks a').forEach((link) => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
});

const socialProfiles = [
  {
    label: 'EBC Construction on Facebook',
    shortLabel: 'EBC Facebook',
    href: 'https://www.facebook.com/61590457384469/'
  },
  {
    label: 'Edgar Bolaños Aguilar on Facebook',
    shortLabel: 'Founder Facebook',
    href: 'https://www.facebook.com/galincito.bolanos.1/'
  }
];

const footerGrid = document.querySelector('.footer-grid');
if (footerGrid && !footerGrid.querySelector('.footer-social')) {
  const socialColumn = document.createElement('div');
  socialColumn.className = 'footer-social';
  socialColumn.innerHTML = `
    <h4>Follow our work</h4>
    ${socialProfiles.map((profile) => `<a href="${profile.href}" target="_blank" rel="noopener noreferrer" aria-label="${profile.label}">${profile.shortLabel} ↗</a>`).join('')}
  `;
  footerGrid.appendChild(socialColumn);
}

if (currentPage === 'index.html' && !document.querySelector('.social-showcase')) {
  const band = document.querySelector('.band');
  if (band) {
    const section = document.createElement('section');
    section.className = 'social-showcase';
    section.innerHTML = `
      <div class="shell social-showcase-grid reveal">
        <div>
          <div class="kicker">Follow our work</div>
          <h2 class="display">See what EBC is building next.</h2>
          <p class="lead">Follow real projects, equipment in action and finished results from the field.</p>
          <div class="actions social-actions">
            ${socialProfiles.map((profile) => `<a class="btn" href="${profile.href}" target="_blank" rel="noopener noreferrer">${profile.shortLabel}</a>`).join('')}
          </div>
        </div>
        <div class="social-collage" aria-label="Recent EBC Construction project photos">
          <img src="assets/images/project-08.webp" loading="lazy" alt="EBC Construction team at work">
          <img src="assets/images/project-07.webp" loading="lazy" alt="Skid steer grading project by EBC Construction">
          <img src="assets/images/project-03.webp" loading="lazy" alt="Concrete project completed by EBC Construction">
          <img src="assets/images/project-10.webp" loading="lazy" alt="EBC Construction project in progress">
        </div>
      </div>
    `;
    band.before(section);
  }
}

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((item) => io.observe(item));
} else {
  document.querySelectorAll('.reveal').forEach((item) => item.classList.add('in'));
}

const heroVideo = document.querySelector('.hero video');
if (heroVideo) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData;
  if (reduceMotion || saveData) {
    heroVideo.pause();
    heroVideo.removeAttribute('autoplay');
  }
}

const form = document.querySelector('#estimate-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const body = [...data.entries()].map(([key, value]) => `${key}: ${value}`).join('\n');
  location.href = `mailto:ebcconstructionllcsc@gmail.com?subject=${encodeURIComponent('Free Estimate Request')}&body=${encodeURIComponent(body)}`;
});