const bar = document.querySelector('.topbar');
const menu = document.querySelector('.menu-btn');
const links = document.querySelector('.navlinks');

const syncHeader = () => bar?.classList.toggle('scrolled', window.scrollY > 30);
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

menu?.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
});

links?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    links.classList.remove('open');
    document.body.style.overflow = '';
  });
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
  if (reduceMotion || saveData) heroVideo.removeAttribute('autoplay');
}

const form = document.querySelector('#estimate-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const body = [...data.entries()].map(([key, value]) => `${key}: ${value}`).join('\n');
  location.href = `mailto:ebcconstructionllcsc@gmail.com?subject=${encodeURIComponent('Free Estimate Request')}&body=${encodeURIComponent(body)}`;
});
