document.querySelectorAll('[data-video-embed]').forEach(button => {
  button.addEventListener('click', () => {
    const url = new URL(button.dataset.videoEmbed);
    if (url.origin !== 'https://www.instagram.com' || !/^\/reel\/[A-Za-z0-9_-]+\/embed\/$/.test(url.pathname)) return;
    const frame = document.createElement('iframe');
    frame.src = url.href;
    frame.title = button.closest('article').querySelector('h3').textContent;
    frame.allow = 'encrypted-media; fullscreen';
    frame.allowFullscreen = true;
    button.replaceWith(frame);
    frame.focus();
  });
});
