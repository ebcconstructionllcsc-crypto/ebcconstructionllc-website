(() => {
  const $ = selector => document.querySelector(selector);
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  const draftPayload = localStorage.getItem('ebc-quote-draft');

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value || '';
  }

  function list(selector, values) {
    const element = $(selector);
    element.replaceChildren(...values.map(value => {
      const item = document.createElement('li');
      item.textContent = value;
      return item;
    }));
  }

  function drawPlan(model) {
    const canvas = $('#proposal-plan');
    const context = canvas.getContext('2d');
    const points = model.geometry.points;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f8f8f5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!points.length) return;
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = 85;
    const scale = Math.min(
      (canvas.width - padding * 2) / Math.max(maxX - minX, 1),
      (canvas.height - padding * 2) / Math.max(maxY - minY, 1)
    );
    const fitted = points.map(point => ({
      x: padding + (point.x - minX) * scale,
      y: padding + (point.y - minY) * scale
    }));
    context.beginPath();
    fitted.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    if (model.geometry.closed) context.closePath();
    context.fillStyle = '#dedbd2';
    if (model.geometry.closed) context.fill();
    context.strokeStyle = '#12365b';
    context.lineWidth = 5;
    context.stroke();
    context.fillStyle = '#12365b';
    fitted.forEach(point => {
      context.beginPath();
      context.arc(point.x, point.y, 8, 0, Math.PI * 2);
      context.fill();
    });
    context.font = '700 24px Arial';
    context.textAlign = 'center';
    context.fillText(`${model.area.toFixed(1)} SQ FT`, canvas.width / 2, canvas.height / 2);
  }

  function render(model, raw) {
    document.documentElement.lang = model.language;
    setText('#proposal-title', model.title);
    setText('#proposal-subtitle', `${model.clientName || 'Client'} - ${model.projectAddress || 'Project location'}`);
    setText('#proposal-number', model.quoteNumber);
    setText('#proposal-date', model.issueDate);
    setText('#proposal-valid', model.validThrough);
    setText('#proposal-prepared-by', model.preparedBy);
    setText('#proposal-client', model.clientName);
    setText('#proposal-contact', [model.clientPhone, model.clientEmail].filter(Boolean).join(' · '));
    setText('#proposal-address', model.projectAddress);
    setText('#proposal-summary', model.summary);
    setText('#proposal-total', money(model.total));
    setText('#proposal-discount-narrative', model.discountNarrative);
    setText('#terms-address', model.projectAddress);
    setText('#acceptance-address', model.projectAddress);
    setText('#proposal-schedule', model.scheduleNote);
    setText('#proposal-acceptance', model.acceptance);
    setText('#proposal-area', `${model.area.toFixed(1)} sq ft`);
    setText('#proposal-perimeter', `${model.perimeter.toFixed(1)} linear ft`);
    setText('#proposal-thickness', `${model.thickness || 0} in`);
    setText('#proposal-finish', model.finish);

    $('#proposal-packages').replaceChildren(...model.packages.slice(0, 4).map(item => {
      const card = document.createElement('article');
      card.className = 'package-card';
      const heading = document.createElement('h3');
      heading.textContent = item.title;
      const amount = document.createElement('strong');
      amount.textContent = money(item.amount);
      const detail = document.createElement('p');
      detail.textContent = item.quantity;
      card.append(heading, amount, detail);
      return card;
    }));

    $('#proposal-pricing').innerHTML = model.items.map(item => `
      <tr><td>${escapeHtml(item.description || item.title)}</td><td>${item.qty}</td><td>${escapeHtml(item.unit)}</td><td>${money(item.qty * item.rate)}</td></tr>`).join('');
    $('#proposal-pricing-totals').innerHTML = `
      <tr><td colspan="3">Subtotal</td><td>${money(model.subtotal)}</td></tr>
      <tr><td colspan="3">Discount${model.discountPercent ? ` (${model.discountPercent.toFixed(1)}%)` : ''}</td><td>-${money(model.discount)}</td></tr>
      <tr><td colspan="3">Tax</td><td>${money(model.taxAmount)}</td></tr>
      <tr><td colspan="3">Final total</td><td>${money(model.total)}</td></tr>`;

    list('#included-list', model.includedScope);
    list('#exclusions-list', model.exclusions);
    list('#assumptions-list', model.assumptions);
    $('#proposal-payments').innerHTML = model.paymentRows.map(row => `
      <tr><td>${escapeHtml(row.label)}</td><td>${row.percentage.toFixed(2).replace(/\.00$/, '')}%</td><td>${money(row.amount)}</td></tr>`).join('');

    const render = raw?.render || raw?.quoteRender || null;
    if (render?.image) {
      $('#proposal-render').src = render.image;
      $('#render-page').hidden = false;
    }
    drawPlan(model);
    $('#proposal-app').hidden = false;
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }

  $('#print-proposal').addEventListener('click', () => window.print());

  if (!draftPayload) {
    $('#proposal-empty').hidden = false;
    return;
  }

  try {
    const raw = JSON.parse(draftPayload);
    const model = window.EbcProposalCore.buildProposalModel(raw);
    render(model, raw);
  } catch (error) {
    console.error('Professional proposal:', error);
    $('#proposal-empty').hidden = false;
  }
})();
