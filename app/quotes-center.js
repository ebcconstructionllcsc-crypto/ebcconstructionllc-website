(() => {
  state.quotes = [];
  state.quotesReady = true;
  labels.quotes = 'Cotizaciones';
  Object.assign(statusLabels, {
    draft: 'Borrador',
    sent: 'Enviada',
    accepted: 'Aceptada',
    declined: 'Rechazada',
    expired: 'Expirada'
  });

  const statusToBuilder = {
    draft: 'Draft',
    sent: 'Sent',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired'
  };

  function isMissingRelation(error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    return ['42P01', 'PGRST205'].includes(code) || /does not exist|schema cache/i.test(message);
  }

  function formatTimestamp(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function quoteNumber() {
    const date = new Date();
    const stamp = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
      '-',
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0')
    ].join('');
    return `EBC-${stamp}`;
  }

  function quotePayload(quote, duplicate = false) {
    return {
      fields: {
        ...(quote.fields || {}),
        'quote-number': duplicate ? quoteNumber() : quote.quote_number,
        'quote-status': duplicate ? 'Draft' : (statusToBuilder[quote.status] || 'Draft'),
        'quote-language': quote.language || 'en',
        'client-name': quote.client_name || '',
        'client-phone': quote.client_phone || '',
        'client-email': quote.client_email || '',
        'project-address': quote.project_address || '',
        'valid-through': duplicate ? '' : (quote.valid_through || '')
      },
      items: Array.isArray(quote.line_items) ? quote.line_items : [],
      quoteId: duplicate ? null : quote.id,
      leadId: quote.lead_id || null,
      savedAt: new Date().toISOString()
    };
  }

  function filteredQuotes() {
    const query = ($('#quote-search')?.value || '').trim().toLowerCase();
    const filter = $('#quote-filter')?.value || '';
    return state.quotes.filter(quote => {
      const searchable = [
        quote.quote_number,
        quote.client_name,
        quote.client_phone,
        quote.client_email,
        quote.project_address
      ].filter(Boolean).join(' ').toLowerCase();
      return (!query || searchable.includes(query)) && (!filter || quote.status === filter);
    });
  }

  function renderDashboardQuotes() {
    const openQuotes = state.quotes.filter(quote => !['accepted', 'declined', 'expired'].includes(quote.status));
    const quotedValue = openQuotes.reduce((sum, quote) => sum + (Number(quote.total) || 0), 0);
    const metricCount = $('#metric-quotes');
    const metricValue = $('#metric-quoted-value');
    if (metricCount) metricCount.textContent = state.quotesReady ? openQuotes.length : '—';
    if (metricValue) metricValue.textContent = state.quotesReady ? money(quotedValue) : '—';

    const target = $('#recent-quotes');
    if (!target) return;
    if (!state.quotesReady) {
      target.innerHTML = '<div class="setup-card"><strong>Activa el historial de cotizaciones.</strong><p>Ejecuta <code>supabase/quotes-migration.sql</code> en Supabase.</p></div>';
      return;
    }
    if (!state.quotes.length) {
      target.innerHTML = '<div class="empty">Todavía no hay cotizaciones guardadas en la nube.</div>';
      return;
    }

    target.innerHTML = state.quotes.slice(0, 5).map(quote => `
      <button class="recent-quote" type="button" onclick="openSavedQuote('${quote.id}')">
        <span>
          <strong>${esc(quote.quote_number)}</strong>
          <small>${esc(quote.client_name)} · revisión ${quote.revision}</small>
        </span>
        <span>
          <strong>${money(quote.total)}</strong>
          <small>${esc(statusLabel(quote.status))}</small>
        </span>
      </button>`).join('');
  }

  function renderSummary() {
    const counts = state.quotes.reduce((summary, quote) => {
      summary[quote.status] = (summary[quote.status] || 0) + 1;
      return summary;
    }, {});
    const acceptedValue = state.quotes
      .filter(quote => quote.status === 'accepted')
      .reduce((sum, quote) => sum + (Number(quote.total) || 0), 0);

    $('#quote-count-draft').textContent = state.quotesReady ? (counts.draft || 0) : '—';
    $('#quote-count-sent').textContent = state.quotesReady ? (counts.sent || 0) : '—';
    $('#quote-count-accepted').textContent = state.quotesReady ? (counts.accepted || 0) : '—';
    $('#quote-value-accepted').textContent = state.quotesReady ? money(acceptedValue) : '—';
  }

  function renderQuotes() {
    const target = $('#quote-list');
    if (!target) return;
    renderSummary();

    if (!state.quotesReady) {
      target.innerHTML = `
        <div class="setup-card quote-setup">
          <strong>El centro de cotizaciones necesita la migración de base de datos.</strong>
          <p>Ejecuta <code>supabase/quotes-migration.sql</code> en el editor SQL de Supabase y vuelve a cargar EBC Manager.</p>
          <a class="primary quote-new-link" href="quote.html">Usar cotizador local</a>
        </div>`;
      return;
    }

    const quotes = filteredQuotes();
    if (!quotes.length) {
      target.innerHTML = '<div class="panel empty">No se encontraron cotizaciones.</div>';
      return;
    }

    target.innerHTML = quotes.map(quote => `
      <article class="quote-card">
        <div class="quote-card-head">
          <div>
            <p>${esc(quote.quote_number)}</p>
            <h2>${esc(quote.client_name)}</h2>
          </div>
          <span class="badge quote-status-${esc(quote.status)}">${esc(statusLabel(quote.status))}</span>
        </div>
        <div class="quote-card-body">
          <div><span>Total</span><strong>${money(quote.total)}</strong></div>
          <div><span>Revisión</span><strong>${quote.revision}</strong></div>
          <div><span>Actualizada</span><strong>${esc(formatTimestamp(quote.updated_at))}</strong></div>
          <div><span>Válida hasta</span><strong>${esc(formatDate(quote.valid_through))}</strong></div>
          <div class="wide"><span>Proyecto</span><strong>${esc(quote.project_address || 'Dirección pendiente')}</strong></div>
          <div class="wide"><span>Contacto</span><strong>${esc([quote.client_phone, quote.client_email].filter(Boolean).join(' · ') || 'Sin contacto')}</strong></div>
        </div>
        <div class="quote-card-actions">
          <button class="primary" type="button" onclick="openSavedQuote('${quote.id}')">Abrir</button>
          <button type="button" onclick="duplicateSavedQuote('${quote.id}')">Duplicar</button>
          ${quote.client_phone ? `<a href="tel:${esc(quote.client_phone)}">Llamar</a><a href="sms:${esc(quote.client_phone)}">Mensaje</a>` : ''}
          <label>Estado
            <select onchange="updateQuoteStatus('${quote.id}',this.value)" aria-label="Cambiar estado de ${esc(quote.quote_number)}">
              ${['draft', 'sent', 'accepted', 'declined', 'expired'].map(status => `
                <option value="${status}" ${quote.status === status ? 'selected' : ''}>${esc(statusLabel(status))}</option>
              `).join('')}
            </select>
          </label>
        </div>
      </article>`).join('');
  }

  async function loadQuotes({ silent = false } = {}) {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      state.quotes = [];
      return;
    }

    const result = await db
      .from('quotes')
      .select('id,quote_number,lead_id,client_id,project_id,language,status,client_name,client_phone,client_email,project_address,valid_through,fields,line_items,total,revision,updated_at')
      .order('updated_at', { ascending: false })
      .limit(250);

    if (result.error) {
      if (isMissingRelation(result.error)) {
        state.quotesReady = false;
        state.quotes = [];
      } else if (!silent) {
        toast(`No se pudieron cargar las cotizaciones: ${result.error.message}`, true);
      }
    } else {
      state.quotesReady = true;
      state.quotes = result.data || [];
    }

    renderDashboardQuotes();
    renderQuotes();
  }

  window.openSavedQuote = id => {
    const quote = state.quotes.find(item => item.id === id);
    if (!quote) return;
    localStorage.setItem('ebc-quote-draft', JSON.stringify(quotePayload(quote)));
    window.location.href = 'quote.html';
  };

  window.duplicateSavedQuote = id => {
    const quote = state.quotes.find(item => item.id === id);
    if (!quote) return;
    localStorage.setItem('ebc-quote-draft', JSON.stringify(quotePayload(quote, true)));
    window.location.href = 'quote.html';
  };

  window.updateQuoteStatus = async (id, status) => {
    const quote = state.quotes.find(item => item.id === id);
    if (!quote || quote.status === status) return;
    const previous = quote.status;
    quote.status = status;
    renderQuotes();
    renderDashboardQuotes();

    const { error } = await db.from('quotes').update({ status }).eq('id', id);
    if (error) {
      quote.status = previous;
      renderQuotes();
      renderDashboardQuotes();
      toast(`No se pudo cambiar el estado: ${error.message}`, true);
      return;
    }

    toast(`Cotización ${quote.quote_number}: ${statusLabel(status)}`);
    await loadQuotes({ silent: true });
  };

  $('#quote-search')?.addEventListener('input', renderQuotes);
  $('#quote-filter')?.addEventListener('change', renderQuotes);
  $$('[data-view="quotes"]').forEach(button => button.addEventListener('click', renderQuotes));

  db.auth.onAuthStateChange((_event, session) => {
    if (session) loadQuotes({ silent: true });
    else state.quotes = [];
  });

  loadQuotes({ silent: true });
})();
