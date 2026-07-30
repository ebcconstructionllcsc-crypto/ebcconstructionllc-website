(() => {
  const addressInput = document.querySelector('#address');
  const results = document.querySelector('#address-results');
  const addressStatus = document.querySelector('#address-status');
  const locateButton = document.querySelector('#use-location');
  const photosInput = document.querySelector('#photos');
  const photoPicker = document.querySelector('.photo-picker');
  const photoSelection = document.querySelector('#photo-selection');

  const language = () => document.documentElement.lang === 'es' ? 'es' : 'en';
  const message = (en, es) => language() === 'es' ? es : en;
  const setStatus = (en, es) => { if (addressStatus) addressStatus.textContent = message(en, es); };

  let controller;
  let timer;
  let activeIndex = -1;
  let items = [];

  function closeResults() {
    if (!results || !addressInput) return;
    results.hidden = true;
    results.replaceChildren();
    items = [];
    activeIndex = -1;
    addressInput.setAttribute('aria-expanded', 'false');
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
    clearTimeout(timer);
    const query = addressInput.value.trim();
    if (query.length < 5) {
      closeResults();
      setStatus('Type the street number and name.', 'Escribe el número y el nombre de la calle.');
      return;
    }
    timer = setTimeout(() => searchAddress(query), 300);
  });

  addressInput?.addEventListener('keydown', event => {
    if (!items.length || !results) return;
    const buttons = [...results.querySelectorAll('.address-result')];
    if (event.key === 'ArrowDown') { event.preventDefault(); activeIndex = (activeIndex + 1) % buttons.length; }
    else if (event.key === 'ArrowUp') { event.preventDefault(); activeIndex = (activeIndex - 1 + buttons.length) % buttons.length; }
    else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); choose(items[activeIndex]); return; }
    else if (event.key === 'Escape') { closeResults(); return; }
    else return;
    buttons.forEach((button, index) => button.classList.toggle('active', index === activeIndex));
  });

  document.addEventListener('click', event => { if (!event.target.closest('.address-field')) closeResults(); });

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

  function updatePhotoSelection() {
    if (!photosInput || !photoSelection || !photoPicker) return;
    const count = photosInput.files?.length || 0;
    photoPicker.classList.toggle('has-files', count > 0);
    photoSelection.textContent = count
      ? message(`${count} photo${count === 1 ? '' : 's'} selected`, `${count} foto${count === 1 ? '' : 's'} seleccionada${count === 1 ? '' : 's'}`)
      : message('No photos selected yet.', 'Aún no has seleccionado fotos.');
  }

  photosInput?.addEventListener('change', updatePhotoSelection);
  document.querySelector('#estimate-form')?.addEventListener('reset', () => setTimeout(updatePhotoSelection));
  updatePhotoSelection();
})();