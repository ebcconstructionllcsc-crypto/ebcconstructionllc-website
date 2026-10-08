(() => {
  const form = document.querySelector('#estimate-form');
  const review = form?.querySelector('#estimate-review');
  const actions = review?.querySelector('.estimate-review-actions');
  const transferNote = review?.querySelector('.transfer-note');
  const editButton = form?.querySelector('#estimate-review-edit');
  const photosInput = form?.querySelector('#photos');
  const intakeNotice = form?.querySelector('#intake-mode-note');
  const reviewKicker = review?.querySelector('.estimate-review-heading .kicker');
  const reviewTitle = review?.querySelector('#estimate-review-title');
  const reviewIntro = review?.querySelector('.estimate-review-heading p');

  if (!form || !review || !actions || !transferNote || !editButton || !photosInput) return;

  const ENDPOINT = 'https://tcjtodjxxszhhmsvqtge.supabase.co/functions/v1/submit-website-lead';
  const REQUEST_TIMEOUT_MS = 90000;

  let sending = false;
  let submitted = false;
  let reference = '';

  const isSpanish = () => document.documentElement.lang === 'es';
  const copy = (english, spanish) => isSpanish() ? spanish : english;

  form.dataset.submissionMode = 'direct';

  document.querySelector('.estimate-transfer-instruction')?.remove();
  document.querySelector('#estimate-transfer-status')?.remove();

  const instruction = document.createElement('p');
  instruction.className = 'estimate-direct-instruction';
  instruction.dataset.en = 'Confirm the information below, then send your request and selected photos directly to EBC.';
  instruction.dataset.es = 'Confirma la información y envía tu solicitud y las fotos seleccionadas directamente a EBC.';

  const status = document.createElement('p');
  status.id = 'direct-estimate-status';
  status.className = 'estimate-transfer-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  const sendButton = document.createElement('button');
  sendButton.id = 'direct-estimate-submit';
  sendButton.className = 'btn primary';
  sendButton.type = 'button';
  sendButton.dataset.en = 'Send request to EBC';
  sendButton.dataset.es = 'Enviar solicitud a EBC';

  // Keep the existing prepared SMS link: its request details are updated by app.js.
  const textLink = actions.querySelector('#text-request');
  const callLink = actions.querySelector('a[href^="tel:"]');
  const fallback = document.createElement('div');
  fallback.id = 'estimate-contact-fallback';
  fallback.className = 'estimate-contact-fallback';
  fallback.hidden = true;
  const fallbackText = document.createElement('p');
  fallbackText.dataset.en = 'You can call or open a text with your request details. For a text, attach your photos in the messaging app and press Send there.';
  fallbackText.dataset.es = 'Puedes llamar o abrir un mensaje con los detalles de tu solicitud. Para enviarlo por mensaje, adjunta tus fotos en la aplicación de mensajes y presiona Enviar allí.';
  const fallbackActions = document.createElement('div');
  fallbackActions.className = 'estimate-review-actions';
  if (callLink) fallbackActions.append(callLink);
  if (textLink) fallbackActions.append(textLink);
  fallback.append(fallbackText, fallbackActions);
  actions.replaceChildren(sendButton, editButton);
  actions.before(instruction);
  transferNote.before(status, fallback);

  function localizeStaticText() {
    if (intakeNotice) {
      const strong = intakeNotice.querySelector('strong');
      const paragraph = intakeNotice.querySelector('p');
      if (strong) {
        strong.dataset.en = 'Direct and secure delivery';
        strong.dataset.es = 'Envío directo y seguro';
        strong.textContent = copy(strong.dataset.en, strong.dataset.es);
      }
      if (paragraph) {
        paragraph.dataset.en = 'Review your information first. Press Send request to EBC to send your details and selected photos. Look for a confirmation reference on this page.';
        paragraph.dataset.es = 'Primero revisa tu información. Presiona Enviar solicitud a EBC para enviar tus detalles y las fotos seleccionadas. Busca la referencia de confirmación en esta página.';
        paragraph.textContent = copy(paragraph.dataset.en, paragraph.dataset.es);
      }
    }

    if (reviewKicker) {
      reviewKicker.dataset.en = 'Ready to send';
      reviewKicker.dataset.es = 'Listo para enviar';
      reviewKicker.textContent = copy(reviewKicker.dataset.en, reviewKicker.dataset.es);
    }
    if (reviewTitle) {
      reviewTitle.dataset.en = submitted ? 'Request delivered to EBC.' : 'Review your request before sending.';
      reviewTitle.dataset.es = submitted ? 'Solicitud entregada a EBC.' : 'Revisa tu solicitud antes de enviarla.';
      reviewTitle.textContent = copy(reviewTitle.dataset.en, reviewTitle.dataset.es);
    }
    if (reviewIntro) {
      reviewIntro.dataset.en = submitted
        ? 'EBC has received the information shown below.'
        : 'Confirm the details and photos. Nothing is sent until you press the gold button.';
      reviewIntro.dataset.es = submitted
        ? 'EBC recibió la información que aparece abajo.'
        : 'Confirma los detalles y las fotos. Nada se envía hasta que presiones el botón dorado.';
      reviewIntro.textContent = copy(reviewIntro.dataset.en, reviewIntro.dataset.es);
    }

    instruction.textContent = copy(instruction.dataset.en, instruction.dataset.es);
    fallbackText.textContent = copy(fallbackText.dataset.en, fallbackText.dataset.es);
    sendButton.textContent = sending
      ? copy('Sending securely…', 'Enviando de forma segura…')
      : copy(sendButton.dataset.en, sendButton.dataset.es);

    transferNote.dataset.en = 'After a successful delivery, this page will show an EBC confirmation reference. You do not need to open Messages or Mail.';
    transferNote.dataset.es = 'Después de enviarse correctamente, esta página mostrará una referencia de confirmación de EBC. No necesitas abrir Mensajes ni Correo.';
    transferNote.textContent = copy(transferNote.dataset.en, transferNote.dataset.es);

    if (submitted) {
      setSuccessStatus();
    } else if (status.dataset.state === 'error' || sending) {
      status.textContent = copy(status.dataset.en, status.dataset.es);
    } else if (!sending) {
      setStatus(
        'Ready. Press the gold button to send this request directly to EBC.',
        'Listo. Presiona el botón dorado para enviar esta solicitud directamente a EBC.',
        'ready'
      );
    }
  }

  function setStatus(english, spanish, state = 'ready') {
    status.dataset.en = english;
    status.dataset.es = spanish;
    status.textContent = copy(english, spanish);
    status.dataset.state = state;
    fallback.hidden = state !== 'error';
  }

  function setSuccessStatus() {
    setStatus(
      `Request received by EBC. Confirmation: ${reference}.`,
      `Solicitud recibida por EBC. Confirmación: ${reference}.`,
      'success'
    );
  }

  function errorCopy(code) {
    const errors = {
      too_many_requests: [
        'This phone number submitted several requests recently. Wait a few minutes and try again.',
        'Este número envió varias solicitudes recientemente. Espera unos minutos e inténtalo de nuevo.'
      ],
      too_many_files: [
        'Select no more than 8 photos and try again.',
        'Selecciona un máximo de 8 fotos e inténtalo de nuevo.'
      ],
      invalid_file: [
        'One selected photo is not supported or is larger than 15 MB.',
        'Una foto seleccionada no es compatible o pesa más de 15 MB.'
      ],
      file_upload_failed: [
        'The photos could not be uploaded. Check your connection and try again.',
        'No se pudieron subir las fotos. Revisa tu conexión e inténtalo de nuevo.'
      ],
      missing_or_invalid_fields: [
        'Review the required fields and try again.',
        'Revisa los campos obligatorios e inténtalo de nuevo.'
      ],
      missing_required_fields: [
        'Review the required fields and try again.',
        'Revisa los campos obligatorios e inténtalo de nuevo.'
      ],
      contact_consent_required: [
        'Please confirm that EBC may contact you about this estimate request.',
        'Confirma que EBC puede contactarte sobre esta solicitud de estimado.'
      ],
      submission_failed: [
        'The request could not be saved. Please try again or call EBC.',
        'No se pudo guardar la solicitud. Inténtalo de nuevo o llama a EBC.'
      ],
      invalid_email: [
        'Review the email address and try again.',
        'Revisa el correo electrónico e inténtalo de nuevo.'
      ],
      origin_not_allowed: [
        'This request must be sent from the official EBC website.',
        'Esta solicitud debe enviarse desde el sitio oficial de EBC.'
      ]
    };
    const normalizedCode = String(code || '').toLowerCase();
    return errors[normalizedCode] || [
      'We could not confirm delivery. Call or text EBC before retrying to avoid duplicate requests.',
      'No pudimos confirmar la entrega. Llama o envía un mensaje a EBC antes de reintentar para evitar solicitudes duplicadas.'
    ];
  }

  function submissionBody() {
    const body = new FormData();
    body.append('name', form.querySelector('#name')?.value.trim() || '');
    body.append('phone', form.querySelector('#phone')?.value.trim() || '');
    body.append('email', form.querySelector('#email')?.value.trim() || '');
    body.append('address', form.querySelector('#address')?.value.trim() || '');
    body.append('service', form.querySelector('#service')?.value.trim() || '');
    body.append('preferred_timing', form.querySelector('#timeline')?.value.trim() || '');
    body.append('project', form.querySelector('#project')?.value.trim() || '');
    body.append('locale', document.documentElement.lang || 'en');
    body.append('consent_to_contact', form.querySelector('#consent')?.checked ? 'true' : 'false');
    body.append('company_website', '');
    for (const file of [...photosInput.files]) body.append('photos', file, file.name);
    return body;
  }

  function setBusy(busy) {
    sending = busy;
    sendButton.disabled = busy || submitted;
    editButton.disabled = busy || submitted;
    review.setAttribute('aria-busy', String(busy));
    sendButton.textContent = busy
      ? copy('Sending securely…', 'Enviando de forma segura…')
      : copy(sendButton.dataset.en, sendButton.dataset.es);
  }

  async function deliverRequest() {
    if (sending || submitted) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setBusy(true);
    setStatus(
      'Sending the request and photos securely to EBC…',
      'Enviando la solicitud y las fotos de forma segura a EBC…',
      'sending'
    );

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        body: submissionBody(),
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok || payload.ok !== true || !payload.reference) {
        const failure = new Error(payload.error || `http_${response.status}`);
        failure.code = String(payload.error || `http_${response.status}`).toLowerCase();
        throw failure;
      }

      submitted = true;
      reference = String(payload.reference);
      review.dataset.submissionComplete = 'true';
      window.dispatchEvent(new Event('ebc:leadreceived'));
      instruction.hidden = true;
      sendButton.disabled = true;
      editButton.hidden = true;
      localizeStaticText();
      setSuccessStatus();
      status.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center'
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        setStatus(
          'The connection took too long. We could not confirm delivery. Call or text EBC before retrying to avoid duplicate requests.',
          'La conexión tardó demasiado. No pudimos confirmar la entrega. Llama o envía un mensaje a EBC antes de reintentar para evitar solicitudes duplicadas.',
          'error'
        );
      } else {
        const [english, spanish] = errorCopy(error?.code);
        setStatus(english, spanish, 'error');
      }
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  sendButton.addEventListener('click', deliverRequest);

  const observer = new MutationObserver(() => {
    if (review.hidden && !submitted) {
      setStatus(
        'Review the updated request before sending it.',
        'Revisa la solicitud actualizada antes de enviarla.',
        'ready'
      );
    }
    if (!review.hidden && !submitted) localizeStaticText();
  });
  observer.observe(review, { attributes: true, attributeFilter: ['hidden'] });

  window.addEventListener('ebc:languagechange', localizeStaticText);
  localizeStaticText();
})();
