/* Local draft only: the customer's mail or messaging app handles delivery. */
(() => {
  const reviewUrl = 'https://g.page/r/CZWOg_sbEy5sEAE/review';
  function message(name, language = 'en') {
    const firstName = String(name || '').trim().split(/\s+/)[0];
    const greeting = language === 'es' ? (firstName ? `Hola, ${firstName}.` : 'Hola.') : (firstName ? `Hi ${firstName},` : 'Hello,');
    return language === 'es'
      ? `${greeting} Soy Edgar, de EBC Construction LLC. Gracias por confiar en nosotros con tu proyecto. Si tienes un momento, nos ayudaría mucho que compartieras tu experiencia en Google: ${reviewUrl}\nGracias por tu tiempo y por apoyar nuestro trabajo.`
      : `${greeting} This is Edgar with EBC Construction LLC. Thank you for trusting us with your project. If you have a moment, we would appreciate you sharing your experience on Google: ${reviewUrl}\nThank you for your time and for supporting our work.`;
  }
  function open(client = {}) {
    document.getElementById('review-request-dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'review-request-dialog';
    dialog.className = 'detail-dialog';
    dialog.setAttribute('aria-labelledby', 'review-request-title');
    dialog.innerHTML = `<div><header><h2 id="review-request-title">Pedir una reseña</h2><button type="button" aria-label="Cerrar">×</button></header><div class="detail-content"><p>Mensaje personal para agradecer al cliente y pedirle que comparta su experiencia.</p><label>Idioma del mensaje<select id="review-request-language"><option value="en">English</option><option value="es">Español</option></select></label><label>Mensaje<textarea id="review-request-message" rows="8"></textarea></label><p id="review-request-status" role="status"></p><div class="row-actions"><button type="button" id="review-request-copy">Copiar mensaje</button><a id="review-request-sms" hidden>Abrir SMS</a><a id="review-request-email" hidden>Abrir correo</a></div><p><small>Revisa el texto antes de enviarlo. Abrir SMS o correo prepara un borrador; no lo envía.</small></p></div></div>`;
    document.body.append(dialog);
    const textarea = dialog.querySelector('textarea');
    const language = dialog.querySelector('select');
    const sms = dialog.querySelector('#review-request-sms');
    const email = dialog.querySelector('#review-request-email');
    const phone = String(client.phone || '').replace(/[\s().-]/g, '');
    const address = String(client.email || '').trim();
    function updateLinks() {
      const body = encodeURIComponent(textarea.value);
      sms.hidden = !/^\+?\d{7,15}$/.test(phone);
      if (!sms.hidden) sms.href = `sms:${phone}?body=${body}`;
      email.hidden = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
      if (!email.hidden) email.href = `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(language.value === 'es' ? 'Gracias por confiar en EBC' : 'Thank you for choosing EBC')}&body=${body}`;
    }
    function updateMessage() { textarea.value = message(client.name, language.value); updateLinks(); }
    language.addEventListener('change', updateMessage);
    textarea.addEventListener('input', updateLinks);
    dialog.querySelector('header button').addEventListener('click', () => dialog.close());
    dialog.querySelector('#review-request-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        dialog.querySelector('[role="status"]').textContent = 'Mensaje copiado.';
      } catch {
        textarea.focus(); textarea.select();
        dialog.querySelector('[role="status"]').textContent = 'Selecciona y copia el mensaje para enviarlo.';
      }
    });
    dialog.addEventListener('close', () => dialog.remove(), {once: true});
    updateMessage(); dialog.showModal();
  }
  window.EBCReviewRequest = { message, open, reviewUrl };
})();
