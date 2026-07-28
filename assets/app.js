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