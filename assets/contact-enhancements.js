(() => {
  const addressInput = document.querySelector('#address');
  const results = document.querySelector('#address-results');
  const addressStatus = document.querySelector('#address-status');
  const locateButton = document.querySelector('#use-location');
  const photosInput = document.querySelector('#photos');
  const photoPicker = document.querySelector('.photo-picker');
  const photoSelection = document.querySelector('#photo-selection');

  function language() {
    return document.documentElement.lang === 'es' ? 'es' : 'en';
  }

  function message(english, spanish) {
    return language() === 'es' ? spanish : english;
  }

  function setAddressStatus(english, spanish) {
    if (addressStatus) addressStatus.textContent = message(english, spanish);
  }

  function formatFeature(feature) {
    const p = feature?.properties || {};
    const streetLine = [p.housenumber, p.street || p.name].filter(Boolean).join(' ');
    const locality = [p.city || p.town || p.village || p.county, p.state, p.postcode]
      .filter(Boolean)
      .join(', ');
    const full = [streetLine, locality].filter(Boolean).join(', ');
    return {
      title: streetLine || locality || p.name || '',
      subtitle: locality && streetLine ? locality : (p.country || ''),
      full
    };
  }

  let requestController;
  let debounceTimer;
  let activeIndex = -1;
  let currentItems = [];

  function closeResults() {
    if (!results || !addressInput) return;
    results.hidden = true;
    results.replaceChildren();
    currentItems = [];
    activeIndex = -1;
    addressInput.setAttribute('aria-expanded', 'false');
  }

  function chooseItem(item) {
    if (!addressInput) return;
    addressInput.value = item.full;
    closeResults();
    setAddressStatus('Address selected. You can edit it if needed.', 'Dirección seleccionada. Puedes editarla si es necesario.');
  }

  function renderResults(features) {
    if (!results || !addressInput) return;
    currentItems = features.map(formatFeature).filter(item => item.full);
    results.replaceChildren();

    currentItems.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'address-result';
      button.setAttribute('role', 'option');
      button.dataset.index = String(index);

      const strong = document.createElement('strong');
      strong.textContent = item.title;
      const span = document.createElement('span');
      span.textContent = item.subtitle;
      button.append(strong, span);
      button.addEventListener('click', () => chooseItem(item));
      results.append(button);
    });

    results.hidden = currentItems.length === 0;
    addressInput.setAttribute('aria-expanded', String(currentItems.length > 0));
    if (!currentItems.length) {
      setAddressStatus('No suggestions found. You can still enter the address manually.', 'No encontramos sugerencias. Puedes escribir la dirección manualmente.');
    }
  }

  async function searchAddress(query) {
    requestController?.abort();
    requestController = new AbortController();
    setAddressStatus('Searching addresses…', 'Buscando direcciones…');

    try {
      const params = new URLSearchParams({
        q: query,
        limit: '7',
        lang: language(),
        lat: '34.9387',
        lon: '-82.2271'
      });
      const response = await fetch(`https://photon.komoot.io/api/?${params}`, {
        signal: requestController.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('address_lookup_failed');
      const data = await response.json();
      renderResults(Array.isArray(data.features) ? data.features : []);
      if (data.features?.length) {
        setAddressStatus('Select the complete address below.', 'Selecciona la dirección completa abajo.');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      closeResults();
      setAddressStatus('Address search is unavailable. Enter the address manually.', 'La búsqueda no está disponible. Escribe la dirección manualmente.');
    }
  }

  addressInput?.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    const query = addressInput.value.trim();
    if (query.length < 3) {
      closeResults();
      setAddressStatus('Type at least 3 characters to search.', 'Escribe al menos 3 caracteres para buscar.');
      return;
    }
    debounceTimer = window.setTimeout(() => searchAddress(query), 350);
  });

  addressInput?.addEventListener('keydown', event => {
    if (!currentItems.length || !results) return;
    const buttons = [...results.querySelectorAll('.address-result')];
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % buttons.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      chooseItem(currentItems[activeIndex]);
      return;
    } else if (event.key === 'Escape') {
      closeResults();
      return;
    } else {
      return;
    }
    buttons.forEach((button, index) => button.classList.toggle('active', index === activeIndex));
    buttons[activeIndex]?.scrollIntoView({ block: 'nearest' });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.address-field')) closeResults();
  });

  locateButton?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      setAddressStatus('Location is not supported on this device.', 'La ubicación no está disponible en este dispositivo.');
      return;
    }

    locateButton.disabled = true;
    setAddressStatus('Finding your location…', 'Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const params = new URLSearchParams({
          lat: String(position.coords.latitude),
          lon: String(position.coords.longitude),
          lang: language()
        });
        const response = await fetch(`https://photon.komoot.io/reverse?${params}`, {
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('reverse_lookup_failed');
        const data = await response.json();
        const item = formatFeature(data.features?.[0]);
        if (!item.full) throw new Error('missing_address');
        addressInput.value = item.full;
        setAddressStatus('Current location added. Verify the street number.', 'Ubicación agregada. Verifica el número de la calle.');
      } catch (error) {
        setAddressStatus('We found your location but could not format the address. Enter it manually.', 'Encontramos tu ubicación, pero no pudimos completar la dirección. Escríbela manualmente.');
      } finally {
        locateButton.disabled = false;
      }
    }, () => {
      locateButton.disabled = false;
      setAddressStatus('Location permission was not granted. Enter the address manually.', 'No se autorizó la ubicación. Escribe la dirección manualmente.');
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
  document.querySelector('#estimate-form')?.addEventListener('reset', () => window.setTimeout(updatePhotoSelection));
  updatePhotoSelection();
})();
