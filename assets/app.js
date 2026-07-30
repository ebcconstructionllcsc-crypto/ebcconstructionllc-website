const header = document.querySelector('.topbar');
const menuButton = document.querySelector('.menu-btn');
const navigation = document.querySelector('.navlinks');

function isSpanish() {
  return document.documentElement.lang === 'es';
}

function menuLabel(open) {
  if (isSpanish()) return open ? 'Cerrar menú' : 'Abrir menú';
  return open ? 'Close menu' : 'Open menu';
}

function syncHeader() {
  header?.classList.toggle('scrolled', window.scrollY > 30);
}

function setMenu(open) {
  navigation?.classList.toggle('open', open);
  menuButton?.setAttribute('aria-expanded', String(open));
  menuButton?.setAttribute('aria-label', menuLabel(open));
  if (menuButton) menuButton.textContent = open ? '×' : '☰';
  document.body.classList.toggle('menu-open', open);
}

syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });
menuButton?.addEventListener('click', () => setMenu(!navigation?.classList.contains('open')));
navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') setMenu(false);
});

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.navlinks a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('in'));
}

const heroVideo = document.querySelector('.hero video');
if (heroVideo && (
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  navigator.connection?.saveData
)) {
  heroVideo.pause();
  heroVideo.removeAttribute('autoplay');
}

function applyLanguage(language) {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-en]').forEach(element => {
    element.textContent = language === 'es' ? element.dataset.es : element.dataset.en;
  });
  document.querySelectorAll('[data-en-placeholder]').forEach(element => {
    element.placeholder = language === 'es'
      ? element.dataset.esPlaceholder
      : element.dataset.enPlaceholder;
  });
  document.querySelectorAll('[data-en-content]').forEach(element => {
    element.content = language === 'es'
      ? element.dataset.esContent
      : element.dataset.enContent;
  });
  document.querySelectorAll('[data-lang-btn]').forEach(button => {
    const active = button.dataset.langBtn === language;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  localStorage.setItem('ebc-lang', language);
  setMenu(false);
  window.dispatchEvent(new CustomEvent('ebc:languagechange', {
    detail: { language }
  }));
}

document.querySelectorAll('[data-lang-btn]').forEach(button => {
  button.addEventListener('click', () => applyLanguage(button.dataset.langBtn));
});
applyLanguage(localStorage.getItem('ebc-lang') || 'en');

const estimateForm = document.querySelector('#estimate-form');

if (estimateForm) {
  const EBC_PHONE = '+18644502954';
  const EBC_EMAIL = 'ebcconstructionllcsc@gmail.com';
  const MAX_FILES = 8;
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const allowedImageTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/avif'
  ]);
  const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif']);

  const photosInput = estimateForm.querySelector('#photos');
  const photoPicker = estimateForm.querySelector('.photo-picker');
  const photoSelection = estimateForm.querySelector('#photo-selection');
  const estimateReview = estimateForm.querySelector('#estimate-review');
  const estimateReviewDetails = estimateForm.querySelector('#estimate-review-details');
  const estimateReviewPhotos = estimateForm.querySelector('#estimate-review-photos');
  const estimateReviewEdit = estimateForm.querySelector('#estimate-review-edit');
  const shareRequest = estimateForm.querySelector('#share-request');
  const textRequest = estimateForm.querySelector('#text-request');
  const emailRequest = estimateForm.querySelector('#email-request');
  const copyRequest = estimateForm.querySelector('#copy-request');
  const submitButton = estimateForm.querySelector('button[type="submit"]');
  let preparedRequest = null;
  let preparedFiles = [];

  estimateForm.removeAttribute('action');

  function language() {
    return isSpanish() ? 'es' : 'en';
  }

  function text(english, spanish) {
    return language() === 'es' ? spanish : english;
  }

  function setFormStatus(message, type = '') {
    const status = estimateForm.querySelector('.form-status');
    if (!status) return;
    status.textContent = message;
    status.classList.remove('success', 'error', 'ready');
    if (type) status.classList.add(type);
  }

  function fileExtension(name) {
    return String(name || '').split('.').pop()?.toLowerCase() || '';
  }

  function validateFiles(files) {
    if (files.length > MAX_FILES) {
      throw new Error(text(
        `Choose no more than ${MAX_FILES} photos.`,
        `Selecciona un máximo de ${MAX_FILES} fotos.`
      ));
    }

    for (const file of files) {
      if (!allowedImageTypes.has(file.type) || !allowedExtensions.has(fileExtension(file.name))) {
        throw new Error(text(
          `“${file.name}” is not a supported image. Use JPG, PNG, WebP, HEIC, or AVIF.`,
          `“${file.name}” no es una imagen compatible. Usa JPG, PNG, WebP, HEIC o AVIF.`
        ));
      }
      if (file.size < 1 || file.size > MAX_FILE_BYTES) {
        throw new Error(text(
          `“${file.name}” must be smaller than 15 MB.`,
          `“${file.name}” debe pesar menos de 15 MB.`
        ));
      }
    }
  }

  function selectedFiles() {
    return [...(photosInput?.files || [])];
  }

  function formatFileSize(bytes) {
    const unit = bytes >= 1024 * 1024 ? 'MB' : 'KB';
    const value = bytes / (unit === 'MB' ? 1024 * 1024 : 1024);
    return `${new Intl.NumberFormat(language() === 'es' ? 'es-US' : 'en-US', {
      maximumFractionDigits: 1
    }).format(value)} ${unit}`;
  }

  function renderPhotoSelection(files = selectedFiles()) {
    if (!photoSelection) return;
    photoPicker?.classList.toggle('has-files', files.length > 0);
    if (!files.length) {
      photoSelection.textContent = text(
        'No photos selected yet.',
        'Aún no has seleccionado fotos.'
      );
      return;
    }

    const names = files.map(file => file.name).join(', ');
    photoSelection.textContent = text(
      `${files.length} photo${files.length === 1 ? '' : 's'} selected: ${names}`,
      `${files.length} foto${files.length === 1 ? '' : 's'} seleccionada${files.length === 1 ? '' : 's'}: ${names}`
    );
  }

  function updatePhotoStatus(files = selectedFiles()) {
    try {
      validateFiles(files);
      if (files.length) {
        setFormStatus(text(
          `${files.length} photo${files.length === 1 ? '' : 's'} ready. They stay on this device until you choose how to share.`,
          `${files.length} foto${files.length === 1 ? '' : 's'} lista${files.length === 1 ? '' : 's'}. Permanecen en este dispositivo hasta que elijas cómo compartirlas.`
        ), 'ready');
      } else {
        setFormStatus(text(
          'Complete the form to review your request before sharing it.',
          'Completa el formulario para revisar tu solicitud antes de compartirla.'
        ));
      }
    } catch (error) {
      setFormStatus(error.message, 'error');
    }
  }

  function prepareRequest(files) {
    const formData = new FormData(estimateForm);
    return {
      name: String(formData.get('Name') || '').trim(),
      phone: String(formData.get('Phone') || '').trim(),
      email: String(formData.get('Email') || '').trim(),
      address: String(formData.get('Address') || '').trim(),
      service: String(formData.get('Service') || '').trim(),
      preferredTiming: String(formData.get('Preferred timing') || '').trim(),
      project: String(formData.get('Project details') || '').trim(),
      files: files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))
    };
  }

  function requestText() {
    if (!preparedRequest) return '';
    const labels = language() === 'es'
      ? {
          title: 'Solicitud de estimado para EBC Construction LLC',
          name: 'Nombre',
          phone: 'Teléfono',
          email: 'Correo',
          address: 'Dirección del proyecto',
          service: 'Servicio',
          timing: 'Fecha preferida',
          project: 'Detalles',
          photos: 'Fotos seleccionadas'
        }
      : {
          title: 'Estimate request for EBC Construction LLC',
          name: 'Name',
          phone: 'Phone',
          email: 'Email',
          address: 'Project address',
          service: 'Service',
          timing: 'Preferred timing',
          project: 'Project details',
          photos: 'Selected photos'
        };

    return [
      labels.title,
      '',
      `${labels.name}: ${preparedRequest.name}`,
      `${labels.phone}: ${preparedRequest.phone}`,
      preparedRequest.email ? `${labels.email}: ${preparedRequest.email}` : '',
      `${labels.address}: ${preparedRequest.address}`,
      `${labels.service}: ${preparedRequest.service}`,
      preparedRequest.preferredTiming ? `${labels.timing}: ${preparedRequest.preferredTiming}` : '',
      `${labels.project}: ${preparedRequest.project}`,
      `${labels.photos}: ${preparedRequest.files.length}`
    ].filter(Boolean).join('\n');
  }

  function supportsSharingFiles(files) {
    if (typeof navigator.share !== 'function') return false;
    if (!files.length) return true;
    if (typeof navigator.canShare !== 'function') return false;
    try {
      return navigator.canShare({ files });
    } catch {
      return false;
    }
  }

  function updateTransferActions() {
    const body = requestText();
    if (textRequest) {
      textRequest.href = `sms:${EBC_PHONE}?&body=${encodeURIComponent(body)}`;
    }
    if (emailRequest) {
      const subject = text('Free estimate request', 'Solicitud de estimado gratis');
      emailRequest.href = `mailto:${EBC_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    if (shareRequest) {
      shareRequest.hidden = !supportsSharingFiles(preparedFiles);
      shareRequest.textContent = preparedFiles.length
        ? text('Share details + photos', 'Compartir detalles + fotos')
        : text('Share request', 'Compartir solicitud');
    }
    if (copyRequest) {
      copyRequest.hidden = !navigator.clipboard?.writeText;
    }
  }

  function renderPreparedRequest() {
    if (
      !preparedRequest ||
      !estimateReview ||
      !estimateReviewDetails ||
      !estimateReviewPhotos
    ) return;

    const fields = [
      [text('Name', 'Nombre'), preparedRequest.name],
      [text('Phone', 'Teléfono'), preparedRequest.phone],
      [text('Email', 'Correo electrónico'), preparedRequest.email],
      [text('Project address', 'Dirección del proyecto'), preparedRequest.address],
      [text('Service', 'Servicio'), preparedRequest.service],
      [text('Preferred timing', 'Fecha preferida'), preparedRequest.preferredTiming],
      [text('Project details', 'Detalles del proyecto'), preparedRequest.project]
    ];

    estimateReviewDetails.replaceChildren();
    for (const [label, value] of fields) {
      if (!value) continue;
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      estimateReviewDetails.append(term, description);
    }

    estimateReviewPhotos.replaceChildren();
    if (!preparedRequest.files.length) {
      const item = document.createElement('li');
      item.textContent = text(
        'No photos selected. You can still text or email the project details.',
        'No hay fotos seleccionadas. Aun así puedes enviar los detalles por texto o correo.'
      );
      estimateReviewPhotos.append(item);
    } else {
      for (const file of preparedRequest.files) {
        const item = document.createElement('li');
        item.textContent = `${file.name} · ${formatFileSize(file.size)}`;
        estimateReviewPhotos.append(item);
      }
    }

    updateTransferActions();
    estimateReview.hidden = false;
  }

  function resetPreparedRequest() {
    if (!preparedRequest) return;
    preparedRequest = null;
    preparedFiles = [];
    if (estimateReview) estimateReview.hidden = true;
    if (submitButton) {
      submitButton.textContent = text('Review estimate request', 'Revisar solicitud de estimado');
    }
    setFormStatus(text(
      'Details changed. Review the updated request before sharing it.',
      'Los detalles cambiaron. Revisa la solicitud actualizada antes de compartirla.'
    ));
  }

  function showPreparedRequest(files) {
    preparedFiles = files;
    preparedRequest = prepareRequest(files);
    renderPreparedRequest();
    setFormStatus(text(
      'Review ready. Your request has not been sent yet.',
      'La revisión está lista. Tu solicitud todavía no se ha enviado.'
    ), 'ready');

    if (submitButton) {
      submitButton.textContent = text('Update review', 'Actualizar revisión');
    }

    estimateReview?.focus({ preventScroll: true });
    estimateReview?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest'
    });
  }

  photosInput?.addEventListener('change', () => {
    resetPreparedRequest();
    const files = selectedFiles();
    renderPhotoSelection(files);
    updatePhotoStatus(files);
  });

  estimateForm.addEventListener('input', event => {
    if (event.target === photosInput) return;
    resetPreparedRequest();
  });

  estimateReviewEdit?.addEventListener('click', () => {
    estimateForm.querySelector('#name')?.focus();
    estimateForm.querySelector('#name')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center'
    });
  });

  shareRequest?.addEventListener('click', async () => {
    if (!preparedRequest || !supportsSharingFiles(preparedFiles)) return;
    const payload = {
      title: text('EBC Construction estimate request', 'Solicitud de estimado para EBC Construction'),
      text: requestText()
    };
    if (preparedFiles.length) payload.files = preparedFiles;

    try {
      await navigator.share(payload);
      setFormStatus(text(
        'The sharing action finished. Confirm delivery in the app you chose.',
        'La acción de compartir terminó. Confirma la entrega en la aplicación que elegiste.'
      ), 'success');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setFormStatus(text(
        'Sharing is unavailable right now. Use the prepared text or email options below.',
        'No se puede compartir en este momento. Usa las opciones de texto o correo de abajo.'
      ), 'error');
    }
  });

  copyRequest?.addEventListener('click', async () => {
    if (!preparedRequest || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(requestText());
      setFormStatus(text(
        'Project details copied. Paste them into your preferred messaging app.',
        'Detalles copiados. Pégalos en la aplicación de mensajes que prefieras.'
      ), 'success');
    } catch {
      setFormStatus(text(
        'The details could not be copied. Use the text or email option instead.',
        'No se pudieron copiar los detalles. Usa la opción de texto o correo.'
      ), 'error');
    }
  });

  textRequest?.addEventListener('click', () => {
    setFormStatus(text(
      'Your messaging app is opening with the details. Send the message and attach photos if needed.',
      'Tu aplicación de mensajes se abrirá con los detalles. Envía el mensaje y adjunta las fotos si es necesario.'
    ), 'ready');
  });

  emailRequest?.addEventListener('click', () => {
    setFormStatus(text(
      'Your email app is opening with the details. Send the email and attach photos if needed.',
      'Tu aplicación de correo se abrirá con los detalles. Envía el correo y adjunta las fotos si es necesario.'
    ), 'ready');
  });

  window.addEventListener('ebc:languagechange', () => {
    renderPhotoSelection();
    if (preparedRequest) {
      renderPreparedRequest();
      setFormStatus(text(
        'Review ready. Your request has not been sent yet.',
        'La revisión está lista. Tu solicitud todavía no se ha enviado.'
      ), 'ready');
      if (submitButton) submitButton.textContent = text('Update review', 'Actualizar revisión');
    } else {
      updatePhotoStatus();
    }
  });

  estimateForm.addEventListener('submit', event => {
    event.preventDefault();

    if (!estimateForm.checkValidity()) {
      estimateForm.reportValidity();
      return;
    }

    const files = selectedFiles();
    try {
      validateFiles(files);
    } catch (error) {
      setFormStatus(error.message, 'error');
      return;
    }

    showPreparedRequest(files);
  });

  renderPhotoSelection();
  updatePhotoStatus();
}
