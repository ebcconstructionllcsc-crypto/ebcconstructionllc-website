(() => {
  const form = document.querySelector('#estimate-form');
  const review = form?.querySelector('#estimate-review');
  const panels = [...(form?.querySelectorAll('[data-estimate-step]') || [])];
  const next = form?.querySelector('[data-estimate-next]');
  const back = form?.querySelector('[data-estimate-back]');
  const summary = form?.querySelector('#estimate-errors');
  const photos = form?.querySelector('#photos');
  const previews = form?.querySelector('#estimate-photo-previews');
  const clearPhotos = form?.querySelector('#estimate-clear-photos');
  if (form?.dataset.reviewReady !== 'true' || !review || panels.length !== 2 || !next || !back || !summary || !photos || !previews || !clearPhotos || !form.querySelector('#direct-estimate-submit')) return;

  const copy = (en, es) => document.documentElement.lang === 'es' ? es : en;
  const locked = () => review.getAttribute('aria-busy') === 'true' || review.dataset.submissionComplete === 'true';
  const fields = [...form.querySelectorAll('input, select, textarea')];
  const errors = new Map();
  let current = 0;
  let objectURLs = [];

  function focusStep() {
    const target = current === 2 ? review : panels[current].querySelector('legend');
    target.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  function showStep(step, focus = false) {
    current = step;
    form.dataset.currentStep = String(step);
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    form.querySelectorAll('[data-estimate-indicator]').forEach((item, index) => {
      if (index === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      item.classList.toggle('is-complete', index < step);
    });
    if (focus) focusStep();
  }

  const requiredCopy = {
    service: ['Choose a service, or select “Not sure”.', 'Elige un servicio o selecciona “No estoy seguro”.'],
    address: ['Enter the project address.', 'Escribe la dirección del proyecto.'],
    project: ['Tell us a little about the work you need.', 'Cuéntanos un poco sobre el trabajo que necesitas.'],
    name: ['Enter your name.', 'Escribe tu nombre.'],
    phone: ['Enter a phone number with at least 7 digits.', 'Escribe un teléfono con al menos 7 dígitos.'],
    consent: ['Please confirm that EBC may contact you about this request.', 'Confirma que EBC puede contactarte sobre esta solicitud.']
  };

  function validationMessage(field) {
    // Photo validation remains owned by app.js, including type/count/size limits.
    if (field === photos) return field.validationMessage;
    field.setCustomValidity('');
    let message = '';
    if (field.required && (field.type === 'checkbox' ? !field.checked : !field.value.trim())) {
      message = copy(...requiredCopy[field.id]);
    } else if (field.id === 'phone' && field.value.replace(/\D/g, '').length < 7) {
      message = copy(...requiredCopy.phone);
    } else if (field.id === 'email' && field.validity.typeMismatch) {
      message = copy('Enter a valid email address, or leave it blank.', 'Escribe un correo válido o deja este campo vacío.');
    } else if (!field.validity.valid) {
      message = copy('Please check this field.', 'Revisa este campo.');
    }
    field.setCustomValidity(message);
    return message;
  }

  function setFieldError(field, message) {
    const id = `${field.id}-error`;
    let node = document.getElementById(id);
    if (!node && message) {
      node = document.createElement('small');
      node.id = id;
      node.className = 'estimate-field-error';
      (field.closest('.estimate-field, .file-field') || field.closest('label')).append(node);
    }
    if (node) { node.textContent = message; node.hidden = !message; }
    const descriptions = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    if (message) {
      errors.set(field, message);
      field.setAttribute('aria-invalid', 'true');
      descriptions.add(id);
    } else {
      errors.delete(field);
      field.removeAttribute('aria-invalid');
      descriptions.delete(id);
    }
    if (descriptions.size) field.setAttribute('aria-describedby', [...descriptions].join(' '));
    else field.removeAttribute('aria-describedby');
  }

  function renderErrors() {
    const list = summary.querySelector('ul');
    list.replaceChildren();
    for (const [field, message] of errors) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${field.id}`;
      link.textContent = message;
      link.addEventListener('click', event => {
        event.preventDefault();
        if (locked()) return;
        showStep(Number(field.closest('[data-estimate-step]').dataset.estimateStep));
        field.focus();
        field.scrollIntoView({ behavior: 'auto', block: 'center' });
      });
      item.append(link);
      list.append(item);
    }
    summary.hidden = errors.size === 0;
  }

  function validate(scope) {
    const selected = fields.filter(field => scope.contains(field));
    selected.forEach(field => setFieldError(field, validationMessage(field)));
    renderErrors();
    const invalid = selected.find(field => errors.has(field));
    if (!invalid) return true;
    showStep(Number(invalid.closest('[data-estimate-step]').dataset.estimateStep));
    summary.focus({ preventScroll: true });
    summary.scrollIntoView({ behavior: 'auto', block: 'center' });
    return false;
  }

  function advance() {
    if (!locked() && validate(panels[0])) showStep(1, true);
  }
  next.addEventListener('click', advance);
  back.addEventListener('click', () => { if (!locked()) showStep(0, true); });

  // Intercept implicit Enter submissions before the existing review/analytics handlers.
  // Required fields remain enabled so FormData and final validation include every step.
  form.noValidate = true;
  form.addEventListener('submit', event => {
    if (locked() || current !== 1) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!locked() && current === 0) advance();
      return;
    }
    if (!validate(form)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Final delivery also validates the full form; reveal an invalid hidden field.
  form.addEventListener('invalid', event => {
    if (locked()) return;
    const panel = event.target.closest('[data-estimate-step]');
    if (panel) {
      showStep(Number(panel.dataset.estimateStep));
      setFieldError(event.target, event.target.validationMessage);
      renderErrors();
    }
  }, true);

  for (const type of ['input', 'change']) form.addEventListener(type, event => {
    if (!fields.includes(event.target) || locked()) return;
    // Clear an old custom validity message as soon as the value is corrected.
    const message = validationMessage(event.target);
    if (errors.has(event.target)) { setFieldError(event.target, message); renderErrors(); }
  });
  form.addEventListener('ebc:estimatereview', () => {
    errors.clear(); renderErrors(); showStep(2);
  });
  form.addEventListener('ebc:estimateedit', () => { if (!locked()) showStep(1); });
  form.addEventListener('ebc:estimateinvalidated', event => {
    if (current !== 2 || locked()) return;
    const panel = document.getElementById(event.detail.field)?.closest('[data-estimate-step]');
    showStep(panel ? Number(panel.dataset.estimateStep) : 0);
  });

  function releasePreviews() {
    objectURLs.forEach(url => URL.revokeObjectURL(url));
    objectURLs = [];
  }
  function renderPhotos() {
    releasePreviews();
    previews.replaceChildren();
    const files = [...photos.files];
    clearPhotos.hidden = files.length === 0;
    clearPhotos.disabled = locked();
    // Never render an unbounded number of large image decoders for an invalid selection.
    files.slice(0, 8).forEach((file, index) => {
      const item = document.createElement('li');
      const thumb = document.createElement('div');
      thumb.className = 'estimate-photo-thumb';
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      number.setAttribute('aria-hidden', 'true');
      thumb.append(number);
      if (URL.createObjectURL && ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) && file.size <= 15 * 1024 * 1024) {
        const image = document.createElement('img');
        image.alt = '';
        image.src = URL.createObjectURL(file);
        objectURLs.push(image.src);
        image.addEventListener('error', () => image.remove(), { once: true });
        thumb.append(image);
      }
      const filename = document.createElement('span');
      filename.className = 'estimate-photo-name';
      filename.textContent = file.name;
      item.append(thumb, filename);
      if (typeof DataTransfer === 'function') {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.disabled = locked();
        remove.textContent = copy('Remove', 'Quitar');
        remove.setAttribute('aria-label', copy(`Remove ${file.name}`, `Quitar ${file.name}`));
        remove.addEventListener('click', () => {
          if (locked()) return;
          try {
            const transfer = new DataTransfer();
            [...photos.files].forEach((photo, position) => { if (position !== index) transfer.items.add(photo); });
            photos.files = transfer.files;
            photos.dispatchEvent(new Event('change', { bubbles: true }));
            (previews.querySelector('button') || photos).focus();
          } catch { clearPhotos.focus(); }
        });
        item.append(remove);
      }
      previews.append(item);
    });
  }
  photos.addEventListener('change', renderPhotos);
  clearPhotos.addEventListener('click', () => {
    if (locked()) return;
    photos.value = '';
    photos.dispatchEvent(new Event('change', { bubbles: true }));
    photos.focus();
  });
  window.addEventListener('pagehide', releasePreviews);
  window.addEventListener('pageshow', renderPhotos);
  window.addEventListener('ebc:languagechange', () => {
    for (const field of fields) {
      const message = validationMessage(field);
      if (errors.has(field)) setFieldError(field, message);
    }
    renderErrors(); renderPhotos();
  });
  new MutationObserver(() => {
    const busy = locked();
    [next, back, clearPhotos, ...previews.querySelectorAll('button')].forEach(button => { button.disabled = busy; });
  }).observe(review, { attributes: true, attributeFilter: ['aria-busy', 'data-submission-complete'] });

  form.querySelector('.estimate-steps').hidden = false;
  next.hidden = false;
  back.hidden = false;
  showStep(0);
  renderPhotos();
})();
