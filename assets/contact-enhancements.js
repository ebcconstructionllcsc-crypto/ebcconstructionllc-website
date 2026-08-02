(() => {
  const addressInput = document.querySelector('#address');
  const results = document.querySelector('#address-results');
  const addressStatus = document.querySelector('#address-status');
  const locateButton = document.querySelector('#use-location');
  const serviceSelect = document.querySelector('#service');

  const language = () => document.documentElement.lang === 'es' ? 'es' : 'en';
  const message = (en, es) => language() === 'es' ? es : en;
  const setStatus = (en, es) => { if (addressStatus) addressStatus.textContent = message(en, es); };

  let controller;
  let timer;
  let activeIndex = -1;
  let items = [];

  const requestedService = new URLSearchParams(window.location.search).get('service');
  const serviceValues = {
    concrete: 'Concrete / Concreto',
    grading: 'Grading & Excavation / Nivelación y Excavación',
    excavation: 'Grading & Excavation / Nivelación y Excavación',
    sitework: 'Grading & Excavation / Nivelación y Excavación'
  };
  if (serviceSelect && requestedService && serviceValues[requestedService]) {
    serviceSelect.value = serviceValues[requestedService];
  }

  function closeResults() {
    if (!results || !addressInput) return;
    results.hidden = true;
    results.replaceChildren();
    items = [];
    activeIndex = -1;
    addressInput.setAttribute('aria-expanded', 'false');
  }

  function stopSearch() {
    clearTimeout(timer);
    controller?.abort();
    controller = undefined;
    closeResults();
  }

  function choose(item) {
    addressInput.value = item.full;
    closeResults();
    setStatus('Complete address selected.', 'Dirección completa seleccionada.');
  }

  function render(list) {
    if (!results || !addressInput) return;
    items = list.filter(item => item?.full);
    results.replaceChildren();
    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'address-result';
      button.setAttribute('role', 'option');
      button.dataset.index = String(index);
      const strong = document.createElement('strong');
      strong.textContent = item.title || item.full;
      const span = document.createElement('span');
      span.textContent = item.subtitle || '';
      button.append(strong, span);
      button.addEventListener('click', () => choose(item));
      results.append(button);
    });
    results.hidden = items.length === 0;
    addressInput.setAttribute('aria-expanded', String(items.length > 0));
    setStatus(
      items.length ? 'Select the complete address below.' : 'No match found. Continue typing the complete address.',
      items.length ? 'Selecciona la dirección completa abajo.' : 'No encontramos coincidencias. Sigue escribiendo la dirección completa.'
    );
  }

  async function searchCensus(query, signal) {
    const params = new URLSearchParams({
      address: query,
      benchmark: 'Public_AR_Current',
      format: 'json'
    });
    const response = await fetch(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params}`, { signal });
    if (!response.ok) throw new Error('census_failed');
    const data = await response.json();
    return (data?.result?.addressMatches || []).slice(0, 7).map(match => ({
      full: match.matchedAddress,
      title: match.addressComponents ? `${match.addressComponents.fromAddress || ''} ${match.addressComponents.streetName || ''} ${match.addressComponents.suffixType || ''}`.replace(/\s+/g, ' ').trim() : match.matchedAddress,
      subtitle: [match.addressComponents?.city, match.addressComponents?.state, match.addressComponents?.zip].filter(Boolean).join(', ')
    }));
  }

  async function searchPhoton(query, signal) {
    const params = new URLSearchParams({ q: query, limit: '7', lang: language(), lat: '34.9387', lon: '-82.2271' });
    const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('photon_failed');
    const data = await response.json();
    return (data.features || []).map(feature => {
      const p = feature.properties || {};
      const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ');
      const locality = [p.city || p.town || p.village || p.county, p.state, p.postcode].filter(Boolean).join(', ');
      return { full: [street, locality].filter(Boolean).join(', '), title: street || locality, subtitle: locality };
    });
  }

  async function searchAddress(query) {
    controller?.abort();
    controller = new AbortController();
    setStatus('Searching complete addresses…', 'Buscando direcciones completas…');
    try {
      let list = await searchCensus(query, controller.signal);
      if (!list.length) list = await searchPhoton(query, controller.signal);
      render(list);
    } catch (error) {
      if (error.name === 'AbortError') return;
      try {
        const list = await searchPhoton(query, controller.signal);
        render(list);
      } catch {
        closeResults();
        setStatus('Address search is unavailable. Enter the full address manually.', 'La búsqueda no está disponible. Escribe la dirección completa manualmente.');
      }
    }
  }

  addressInput?.addEventListener('input', () => {
    stopSearch();
    const query = addressInput.value.trim();
    if (query.length < 5) {
      setStatus('Type the street number and name.', 'Escribe el número y el nombre de la calle.');
      return;
    }
    timer = setTimeout(() => searchAddress(query), 300);
  });

  addressInput?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      stopSearch();
      return;
    }
    if (!items.length || !results) return;
    const buttons = [...results.querySelectorAll('.address-result')];
    if (event.key === 'ArrowDown') { event.preventDefault(); activeIndex = (activeIndex + 1) % buttons.length; }
    else if (event.key === 'ArrowUp') { event.preventDefault(); activeIndex = (activeIndex - 1 + buttons.length) % buttons.length; }
    else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); choose(items[activeIndex]); return; }
    else return;
    buttons.forEach((button, index) => button.classList.toggle('active', index === activeIndex));
  });

  document.addEventListener('click', event => { if (!event.target.closest('.address-field')) stopSearch(); });
  document.querySelector('#estimate-form')?.addEventListener('submit', stopSearch);

  locateButton?.addEventListener('click', () => {
    if (!navigator.geolocation) return setStatus('Location is unavailable on this device.', 'La ubicación no está disponible en este dispositivo.');
    locateButton.disabled = true;
    setStatus('Finding your location…', 'Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const params = new URLSearchParams({ lat: String(position.coords.latitude), lon: String(position.coords.longitude), lang: language() });
        const response = await fetch(`https://photon.komoot.io/reverse?${params}`);
        const data = await response.json();
        const p = data.features?.[0]?.properties || {};
        const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ');
        const locality = [p.city || p.town || p.village || p.county, p.state, p.postcode].filter(Boolean).join(', ');
        const full = [street, locality].filter(Boolean).join(', ');
        if (!full) throw new Error('missing');
        addressInput.value = full;
        setStatus('Location added. Verify the street number.', 'Ubicación agregada. Verifica el número de la calle.');
      } catch {
        setStatus('Location found, but the address could not be completed. Enter it manually.', 'Encontramos tu ubicación, pero no pudimos completar la dirección. Escríbela manualmente.');
      } finally { locateButton.disabled = false; }
    }, () => {
      locateButton.disabled = false;
      setStatus('Location permission was not granted.', 'No se autorizó la ubicación.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });

})();

(() => {
  const form = document.querySelector('#estimate-form');
  const review = form?.querySelector('#estimate-review');
  const actions = review?.querySelector('.estimate-review-actions');
  const transferNote = review?.querySelector('.transfer-note');
  const shareButton = form?.querySelector('#share-request');
  const textLink = form?.querySelector('#text-request');
  const emailLink = form?.querySelector('#email-request');
  const copyButton = form?.querySelector('#copy-request');
  const photosInput = form?.querySelector('#photos');

  if (!form || !review || !actions || !transferNote) return;

  const isSpanish = () => document.documentElement.lang === 'es';
  const copy = (english, spanish) => isSpanish() ? spanish : english;

  const instruction = document.createElement('p');
  instruction.className = 'estimate-transfer-instruction';
  instruction.dataset.en = 'Nothing has been sent yet. Tap one option below, choose the destination, and press Send in the app that opens.';
  instruction.dataset.es = 'Todavía no se ha enviado nada. Toca una opción, elige el destino y presiona Enviar en la aplicación que se abra.';
  instruction.textContent = copy(instruction.dataset.en, instruction.dataset.es);
  Object.assign(instruction.style, {
    margin: '0',
    padding: '14px 16px',
    borderLeft: '4px solid #d4a64e',
    background: 'rgba(212,166,78,.12)',
    color: 'rgba(255,255,255,.88)',
    fontWeight: '750',
    lineHeight: '1.5'
  });
  actions.before(instruction);

  const transferStatus = document.createElement('p');
  transferStatus.id = 'estimate-transfer-status';
  transferStatus.className = 'estimate-transfer-status';
  transferStatus.setAttribute('role', 'status');
  transferStatus.setAttribute('aria-live', 'polite');
  transferStatus.setAttribute('aria-atomic', 'true');
  Object.assign(transferStatus.style, {
    margin: '0',
    padding: '14px 16px',
    border: '1px solid rgba(212,166,78,.55)',
    borderRadius: '12px',
    background: 'rgba(0,0,0,.22)',
    color: '#fff',
    fontWeight: '800',
    lineHeight: '1.5'
  });
  transferNote.before(transferStatus);

  function setTransferStatus(english, spanish, state = 'ready') {
    transferStatus.textContent = copy(english, spanish);
    transferStatus.dataset.state = state;
    transferStatus.style.borderColor = state === 'error'
      ? 'rgba(255,120,120,.8)'
      : state === 'success'
        ? 'rgba(131,214,157,.8)'
        : 'rgba(212,166,78,.55)';
  }

  function setDefaultStatus() {
    setTransferStatus(
      'Choose how to send it. EBC receives the request only after you press Send in Messages, WhatsApp, Mail, or another app.',
      'Elige cómo enviarlo. EBC recibe la solicitud únicamente después de que presiones Enviar en Mensajes, WhatsApp, Correo u otra aplicación.'
    );
  }

  function syncShareLabel() {
    if (!shareButton) return;
    const hasPhotos = (photosInput?.files?.length || 0) > 0;
    shareButton.dataset.en = hasPhotos ? 'Open send options + photos' : 'Open send options';
    shareButton.dataset.es = hasPhotos ? 'Abrir opciones para enviar + fotos' : 'Abrir opciones para enviar';
    shareButton.textContent = copy(shareButton.dataset.en, shareButton.dataset.es);
  }

  function syncReviewState() {
    instruction.textContent = copy(instruction.dataset.en, instruction.dataset.es);
    syncShareLabel();
    if (!review.hidden) setDefaultStatus();
  }

  const nativeShare = typeof navigator.share === 'function'
    ? navigator.share.bind(navigator)
    : null;

  if (nativeShare) {
    try {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async payload => {
          setTransferStatus(
            'Opening your phone’s send options…',
            'Abriendo las opciones de envío de tu teléfono…'
          );
          try {
            const result = await nativeShare(payload);
            setTransferStatus(
              'The share window closed. Confirm that you pressed Send in the selected app; EBC receives it only after that step.',
              'La ventana de compartir se cerró. Confirma que presionaste Enviar en la aplicación elegida; EBC lo recibe únicamente después de ese paso.',
              'success'
            );
            return result;
          } catch (error) {
            if (error?.name === 'AbortError') {
              setTransferStatus(
                'Sharing was cancelled. Nothing was sent. Choose Text or Email below to try again.',
                'Se canceló el envío. No se envió nada. Elige Texto o Correo abajo para intentarlo de nuevo.'
              );
            } else {
              setTransferStatus(
                'The share menu could not open. Use Text or Email below and attach the selected photos before sending.',
                'No se pudo abrir el menú para compartir. Usa Texto o Correo abajo y adjunta las fotos seleccionadas antes de enviar.',
                'error'
              );
            }
            throw error;
          }
        }
      });
    } catch {
      // Some browsers expose navigator.share as read-only. The click guidance below still applies.
    }
  }

  shareButton?.addEventListener('click', () => {
    setTransferStatus(
      'Opening your phone’s send options. Choose Messages, WhatsApp, Mail, or another app, then press Send.',
      'Abriendo las opciones de envío. Elige Mensajes, WhatsApp, Correo u otra aplicación y después presiona Enviar.'
    );
  });

  textLink?.addEventListener('click', () => {
    setTransferStatus(
      'Messages is opening with the details. Attach the selected photos if needed, then press Send.',
      'Mensajes se está abriendo con los detalles. Adjunta las fotos seleccionadas si es necesario y después presiona Enviar.'
    );
  });

  emailLink?.addEventListener('click', () => {
    setTransferStatus(
      'Mail is opening with the details. Attach the selected photos if needed, then send the email.',
      'Correo se está abriendo con los detalles. Adjunta las fotos seleccionadas si es necesario y después envía el correo.'
    );
  });

  copyButton?.addEventListener('click', () => {
    setTransferStatus(
      'The details are being copied. Paste them into your preferred app and press Send.',
      'Se están copiando los detalles. Pégalos en la aplicación que prefieras y presiona Enviar.'
    );
  });

  const observer = new MutationObserver(syncReviewState);
  observer.observe(review, { attributes: true, attributeFilter: ['hidden'] });
  form.addEventListener('submit', () => window.setTimeout(syncReviewState, 0));
  window.addEventListener('ebc:languagechange', () => window.setTimeout(syncReviewState, 0));

  syncReviewState();
})();
