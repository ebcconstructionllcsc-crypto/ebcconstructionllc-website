const SUPABASE_URL = 'https://agczzdjxnytjzgprvcxq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0Sn8fs22OGVbNdvyZMILHA_Vv9NI2BE';
const quoteDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(Number(value) || 0);

const translations = {
  en: {
    documentTitle: 'PROJECT QUOTE',
    preparedFor: 'PREPARED FOR',
    quoteDetails: 'QUOTE DETAILS',
    clientName: 'Client name',
    date: 'Date',
    valid: 'Valid through',
    status: 'Status',
    statuses: { Draft: 'Draft', Sent: 'Sent', Accepted: 'Accepted', Declined: 'Declined', Expired: 'Expired' },
    planTitle: 'CONCEPT PLAN & 3D PREVIEW',
    planDisclaimer: 'Conceptual illustration only. Final dimensions, elevations, drainage, reinforcement and field conditions must be verified before construction.',
    description: 'Description',
    quantity: 'Qty',
    unit: 'Unit',
    rate: 'Rate',
    projectNotes: 'PROJECT NOTES',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    paymentTitle: 'PAYMENT SCHEDULE',
    payment1: 'Initial payment',
    payment2: 'Progress payment',
    payment3: 'Final payment',
    approval: 'Approval of this quote does not constitute the final construction contract. After approval, EBC Construction LLC will send a separate Concrete Work Agreement with the project specifications, warranty coverage and exclusions. Work will not begin until that agreement is signed and the required initial payment is received.',
    signature: 'Client acknowledgment: __________________________',
    signatureDate: 'Date: __________________',
    footer: 'Thank you for the opportunity to quote your project.',
    item: 'Item',
    measurements: 'Measurements'
  },
  es: {
    documentTitle: 'COTIZACIÓN DEL PROYECTO',
    preparedFor: 'PREPARADO PARA',
    quoteDetails: 'DETALLES DE LA COTIZACIÓN',
    clientName: 'Nombre del cliente',
    date: 'Fecha',
    valid: 'Válida hasta',
    status: 'Estado',
    statuses: { Draft: 'Borrador', Sent: 'Enviada', Accepted: 'Aceptada', Declined: 'Rechazada', Expired: 'Expirada' },
    planTitle: 'PLANO CONCEPTUAL Y VISTA 3D',
    planDisclaimer: 'Ilustración conceptual únicamente. Las dimensiones, elevaciones, drenaje, refuerzo y condiciones del terreno deberán verificarse antes de la construcción.',
    description: 'Descripción',
    quantity: 'Cantidad',
    unit: 'Unidad',
    rate: 'Precio',
    projectNotes: 'NOTAS DEL PROYECTO',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    tax: 'Impuesto',
    paymentTitle: 'PROGRAMA DE PAGOS',
    payment1: 'Primer pago',
    payment2: 'Segundo pago',
    payment3: 'Pago final',
    approval: 'La aprobación de esta cotización no constituye el contrato final de construcción. Después de la aprobación, EBC Construction LLC enviará un Concrete Work Agreement separado con las especificaciones del proyecto, la cobertura de garantía y sus exclusiones. El trabajo no comenzará hasta que dicho acuerdo esté firmado y se reciba el primer pago requerido.',
    signature: 'Confirmación del cliente: __________________________',
    signatureDate: 'Fecha: __________________',
    footer: 'Gracias por la oportunidad de cotizar su proyecto.',
    item: 'Concepto',
    measurements: 'Medidas'
  }
};

const defaultTerms = {
  en: 'Scope and specifications will be confirmed before work begins. Price may change if site conditions, access, quantities, materials or requested changes differ from the information provided. Approval of this quote is not the final construction contract. After approval, EBC Construction LLC will send a separate Concrete Work Agreement describing the project specifications, payment terms, warranty coverage and exclusions. No work will begin until the agreement is signed and the required initial payment is received. The included plan and 3D view are conceptual sales illustrations and are not engineering, architectural, permit or survey drawings.',
  es: 'El alcance y las especificaciones se confirmarán antes de comenzar el trabajo. El precio puede cambiar si las condiciones del terreno, el acceso, las cantidades, los materiales o los cambios solicitados difieren de la información proporcionada. La aprobación de esta cotización no es el contrato final de construcción. Después de aprobarla, EBC Construction LLC enviará un Concrete Work Agreement separado con las especificaciones, los términos de pago, la cobertura de garantía y sus exclusiones. Ningún trabajo comenzará hasta que el acuerdo esté firmado y se reciba el primer pago requerido. El plano y la vista 3D incluidos son ilustraciones conceptuales de venta y no son planos de ingeniería, arquitectura, permisos ni levantamientos topográficos.'
};

const fieldIds = [
  'quote-number',
  'quote-date',
  'valid-through',
  'quote-status',
  'quote-language',
  'client-name',
  'client-phone',
  'client-email',
  'project-address',
  'plan-shape',
  'plan-a',
  'plan-b',
  'plan-c',
  'plan-d',
  'plan-finish',
  'length',
  'width',
  'thickness',
  'notes',
  'discount',
  'tax',
  'payment-1',
  'payment-2',
  'payment-3'
];

const statusToDatabase = {
  Draft: 'draft',
  Sent: 'sent',
  Accepted: 'accepted',
  Declined: 'declined',
  Expired: 'expired'
};

const statusFromDatabase = Object.fromEntries(
  Object.entries(statusToDatabase).map(([label, value]) => [value, label])
);

let items;
let lastDefaultTerms = '';
let currentSession = null;
let currentQuoteId = null;
let sourceLeadId = null;
let savedQuotes = [];
let quoteTableReady = true;
let legacyAuthorization = false;
let localSaveTimer = null;

function localDateInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function today() {
  return localDateInput();
}

function plusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateInput(date);
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

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

function currentLanguage() {
  return $('#quote-language').value === 'es' ? 'es' : 'en';
}

function isMissingRelation(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return ['42P01', 'PGRST205'].includes(code) || /does not exist|schema cache/i.test(message);
}

function setSaveStatus(message, type = '') {
  const status = $('#save-status');
  if (!status) return;
  status.textContent = message;
  status.className = `save-status${type ? ` ${type}` : ''}`;
}

function addItem(data = { description: '', qty: 1, unit: 'sq ft', rate: 0 }) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input class="desc" aria-label="Descripción">
    <input class="qty" aria-label="Cantidad" type="number" step="0.01">
    <select class="unit" aria-label="Unidad">
      <option value="sq ft">sq ft</option>
      <option value="yd³">yd³</option>
      <option value="linear ft">linear ft</option>
      <option value="hour">hour</option>
      <option value="day">day</option>
      <option value="each">each</option>
      <option value="lump sum">lump sum</option>
    </select>
    <input class="rate" aria-label="Precio" type="number" step="0.01">
    <span class="item-total">$0.00</span>
    <button class="remove" type="button" aria-label="Eliminar">×</button>`;
  row.querySelector('.desc').value = data.description || '';
  row.querySelector('.qty').value = data.qty ?? 1;
  row.querySelector('.unit').value = data.unit || 'sq ft';
  row.querySelector('.rate').value = data.rate ?? 0;
  row.querySelectorAll('input,select').forEach(input => input.addEventListener('input', handleChange));
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    handleChange();
  });
  items.appendChild(row);
  update();
}

function readItems() {
  return [...items.children].map(row => ({
    description: row.querySelector('.desc').value.trim(),
    qty: Number(row.querySelector('.qty').value) || 0,
    unit: row.querySelector('.unit').value,
    rate: Number(row.querySelector('.rate').value) || 0
  }));
}

function calculateTotals() {
  const lineItems = readItems();
  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const discount = Math.max(0, Number($('#discount').value) || 0);
  const taxable = Math.max(0, subtotal - discount);
  const taxRate = Math.max(0, Number($('#tax').value) || 0);
  const taxAmount = taxable * (taxRate / 100);
  const total = taxable + taxAmount;
  const paymentPercentages = ['payment-1', 'payment-2', 'payment-3']
    .map(id => Math.max(0, Number($(`#${id}`).value) || 0));
  return {
    lineItems,
    subtotal,
    discount,
    taxable,
    taxRate,
    taxAmount,
    total,
    paymentPercentages,
    paymentTotal: paymentPercentages.reduce((sum, value) => sum + value, 0)
  };
}

function updatePreviewLanguage(language) {
  const copy = translations[language];
  $('#p-document-title').textContent = copy.documentTitle;
  $('#p-prepared-label').textContent = copy.preparedFor;
  $('#p-details-label').textContent = copy.quoteDetails;
  $('#p-plan-title').textContent = copy.planTitle;
  $('#p-plan-disclaimer').textContent = copy.planDisclaimer;
  $('#p-col-description').textContent = copy.description;
  $('#p-col-qty').textContent = copy.quantity;
  $('#p-col-unit').textContent = copy.unit;
  $('#p-col-rate').textContent = copy.rate;
  $('#p-notes-label').textContent = copy.projectNotes;
  $('#p-subtotal-label').textContent = copy.subtotal;
  $('#p-discount-label').textContent = copy.discount;
  $('#p-tax-label').textContent = copy.tax;
  $('#p-payment-title').textContent = copy.paymentTitle;
  $('#p-approval-note').textContent = copy.approval;
  $('#p-signature').textContent = copy.signature;
  $('#p-signature-date').textContent = copy.signatureDate;
  $('#p-footer').textContent = copy.footer;
}

function update() {
  const language = currentLanguage();
  const copy = translations[language];
  const totals = calculateTotals();
  updatePreviewLanguage(language);

  [...items.children].forEach((row, index) => {
    const item = totals.lineItems[index];
    row.querySelector('.item-total').textContent = money(item.qty * item.rate);
  });

  $('#payment-warning').textContent = Math.abs(totals.paymentTotal - 100) < 0.001
    ? 'Los pagos suman 100%.'
    : `Atención: los pagos suman ${totals.paymentTotal.toFixed(2)}%. Deben sumar 100%.`;
  $('#payment-warning').classList.toggle('error', Math.abs(totals.paymentTotal - 100) >= 0.001);

  $('#p-number').textContent = $('#quote-number').value || '';
  $('#p-client').textContent = $('#client-name').value || copy.clientName;
  $('#p-contact').textContent = [$('#client-phone').value, $('#client-email').value].filter(Boolean).join(' · ');
  $('#p-address').textContent = $('#project-address').value;
  $('#p-date').textContent = `${copy.date}: ${$('#quote-date').value || ''}`;
  $('#p-valid').textContent = `${copy.valid}: ${$('#valid-through').value || ''}`;
  $('#p-status').textContent = `${copy.status}: ${copy.statuses[$('#quote-status').value] || $('#quote-status').value}`;
  $('#p-items').innerHTML = totals.lineItems.map(item => `
    <tr>
      <td>${escapeHtml(item.description || copy.item)}</td>
      <td>${item.qty}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${money(item.rate)}</td>
      <td>${money(item.qty * item.rate)}</td>
    </tr>`).join('');
  $('#p-notes').textContent = $('#notes').value;
  $('#p-subtotal').textContent = money(totals.subtotal);
  $('#p-discount').textContent = `-${money(totals.discount)}`;
  $('#p-tax').textContent = money(totals.taxAmount);
  $('#p-total').textContent = money(totals.total);
  $('#p-payment-1-label').textContent = `${copy.payment1} (${totals.paymentPercentages[0]}%)`;
  $('#p-payment-2-label').textContent = `${copy.payment2} (${totals.paymentPercentages[1]}%)`;
  $('#p-payment-3-label').textContent = `${copy.payment3} (${totals.paymentPercentages[2]}%)`;
  $('#p-payment-1').textContent = money(totals.total * totals.paymentPercentages[0] / 100);
  $('#p-payment-2').textContent = money(totals.total * totals.paymentPercentages[1] / 100);
  $('#p-payment-3').textContent = money(totals.total * totals.paymentPercentages[2] / 100);

  if (window.ebcRenderPlan) window.ebcRenderPlan();
}

function serialize() {
  return {
    fields: Object.fromEntries(fieldIds.map(id => [id, $(`#${id}`).value])),
    items: readItems(),
    quoteId: currentQuoteId,
    leadId: sourceLeadId
  };
}

function saveLocalDraft(message = true) {
  try {
    localStorage.setItem('ebc-quote-draft', JSON.stringify({
      ...serialize(),
      savedAt: new Date().toISOString()
    }));
    if (message) setSaveStatus('Cambios respaldados localmente en este dispositivo.');
  } catch (error) {
    console.error('Local quote backup:', error);
    setSaveStatus('No se pudo crear el respaldo local. Guarda la cotización en la nube.', 'error');
  }
}

function queueLocalSave() {
  clearTimeout(localSaveTimer);
  localSaveTimer = setTimeout(() => saveLocalDraft(true), 350);
}

function handleChange() {
  update();
  queueLocalSave();
}

function load(data, context = {}) {
  if (data?.fields && data.fields['plan-a'] == null && data.fields.length != null) {
    data.fields['plan-a'] = data.fields.length;
  }
  if (data?.fields && data.fields['plan-b'] == null && data.fields.width != null) {
    data.fields['plan-b'] = data.fields.width;
  }

  fieldIds.forEach(id => {
    if (data?.fields?.[id] != null) $(`#${id}`).value = data.fields[id];
  });

  items.innerHTML = '';
  const savedItems = data?.items?.length
    ? data.items
    : [{ description: 'Concrete installation', qty: 1, unit: 'lump sum', rate: 0 }];
  savedItems.forEach(addItem);

  currentQuoteId = context.quoteId ?? data?.quoteId ?? null;
  sourceLeadId = context.leadId ?? data?.leadId ?? null;
  lastDefaultTerms = defaultTerms[currentLanguage()];
  update();

  ['plan-shape', 'plan-a', 'plan-b', 'plan-c', 'plan-d', 'thickness', 'plan-finish'].forEach(id => {
    $(`#${id}`).dispatchEvent(new Event('input', { bubbles: true }));
  });

  if ($('#saved-quotes')) $('#saved-quotes').value = currentQuoteId || '';
}

function fresh() {
  currentQuoteId = null;
  sourceLeadId = null;
  const language = 'en';
  load({
    fields: {
      'quote-number': quoteNumber(),
      'quote-date': today(),
      'valid-through': plusDays(30),
      'quote-status': 'Draft',
      'quote-language': language,
      'plan-shape': 'rectangle',
      'plan-a': '30',
      'plan-b': '20',
      'plan-c': '10',
      'plan-d': '8',
      'plan-finish': 'Broom finish',
      thickness: '4',
      notes: defaultTerms[language],
      discount: '0',
      tax: '0',
      'payment-1': '30',
      'payment-2': '45',
      'payment-3': '25'
    }
  }, { quoteId: null, leadId: null });
  saveLocalDraft(false);
  setSaveStatus('Nueva cotización. Los cambios se respaldarán localmente.');
}

function loadLeadIntoQuote(lead) {
  fresh();
  sourceLeadId = lead.leadId || null;
  $('#client-name').value = lead.name || '';
  $('#client-phone').value = lead.phone || '';
  $('#client-email').value = lead.email || '';
  $('#project-address').value = lead.address || '';
  items.innerHTML = '';
  addItem({
    description: lead.service ? `${lead.service} project` : 'Construction project',
    qty: 1,
    unit: 'lump sum',
    rate: Number(lead.estimatedValue) || 0
  });
  if (lead.message) {
    $('#notes').value = `Project information provided by the customer:\n${lead.message}\n\n${defaultTerms.en}`;
  }
  update();
  saveLocalDraft(false);
  setSaveStatus('Solicitud cargada. Revisa la información y guarda la cotización en la nube.');
}

function validateQuote() {
  const totals = calculateTotals();
  if (!$('#quote-number').value.trim()) throw new Error('Agrega un número de cotización.');
  if (!$('#client-name').value.trim()) throw new Error('Agrega el nombre del cliente.');
  if ($('#client-email').value && !$('#client-email').checkValidity()) {
    throw new Error('Revisa el correo electrónico del cliente.');
  }
  if (!totals.lineItems.length) throw new Error('Agrega por lo menos un concepto.');
  if (Math.abs(totals.paymentTotal - 100) >= 0.001) {
    throw new Error('Los porcentajes de pago deben sumar 100%.');
  }
  return totals;
}

function databasePayload() {
  const totals = validateQuote();
  const draft = serialize();
  const percentages = totals.paymentPercentages;
  return {
    quote_number: $('#quote-number').value.trim(),
    lead_id: sourceLeadId || null,
    language: currentLanguage(),
    status: statusToDatabase[$('#quote-status').value] || 'draft',
    client_name: $('#client-name').value.trim(),
    client_phone: $('#client-phone').value.trim() || null,
    client_email: $('#client-email').value.trim() || null,
    project_address: $('#project-address').value.trim() || null,
    valid_through: $('#valid-through').value || null,
    fields: draft.fields,
    line_items: totals.lineItems,
    subtotal: totals.subtotal,
    discount_amount: totals.discount,
    tax_rate: totals.taxRate,
    tax_amount: totals.taxAmount,
    total: totals.total,
    payment_schedule: percentages.map((percentage, index) => ({
      sequence: index + 1,
      percentage,
      amount: totals.total * percentage / 100
    }))
  };
}

function quoteOptionText(quote) {
  const status = statusFromDatabase[quote.status] || quote.status;
  const updated = quote.updated_at
    ? new Date(quote.updated_at).toLocaleDateString('es-US')
    : 'sin fecha';
  return `${quote.quote_number} · ${quote.client_name} · ${status} · ${money(quote.total)} · ${updated}`;
}

function renderSavedQuotes(selection = currentQuoteId) {
  const select = $('#saved-quotes');
  const loadButton = $('#load-quote');
  select.replaceChildren();

  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = quoteTableReady
    ? 'Nueva cotización / no seleccionada'
    : 'Ejecuta quotes-migration.sql para activar la nube';
  select.appendChild(empty);

  for (const quote of savedQuotes) {
    const option = document.createElement('option');
    option.value = quote.id;
    option.textContent = quoteOptionText(quote);
    select.appendChild(option);
  }

  select.disabled = !quoteTableReady;
  loadButton.disabled = !quoteTableReady || !selection;
  select.value = selection || '';
}

async function refreshSavedQuotes({ silent = false, selection = currentQuoteId } = {}) {
  const result = await quoteDb
    .from('quotes')
    .select('id,quote_number,client_name,status,total,revision,updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (result.error) {
    if (isMissingRelation(result.error)) {
      quoteTableReady = false;
      savedQuotes = [];
      renderSavedQuotes(null);
      if (!silent) setSaveStatus('La nube todavía no está configurada. Ejecuta supabase/quotes-migration.sql.', 'error');
      return;
    }
    if (!silent) setSaveStatus(`No se pudo cargar el historial: ${result.error.message}`, 'error');
    return;
  }

  quoteTableReady = true;
  savedQuotes = result.data || [];
  renderSavedQuotes(selection);
}

async function saveQuote() {
  saveLocalDraft(false);
  if (!quoteTableReady) {
    setSaveStatus('La cotización quedó respaldada localmente. Ejecuta supabase/quotes-migration.sql para guardarla en la nube.', 'error');
    return;
  }

  let payload;
  try {
    payload = databasePayload();
  } catch (error) {
    setSaveStatus(error.message, 'error');
    return;
  }

  const button = $('#save-btn');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Guardando…';
  setSaveStatus('Guardando una revisión segura…');

  try {
    const query = currentQuoteId
      ? quoteDb.from('quotes').update(payload).eq('id', currentQuoteId)
      : quoteDb.from('quotes').insert({ ...payload, created_by: currentSession.user.id });
    const result = await query.select('*').single();

    if (result.error) {
      if (isMissingRelation(result.error)) {
        quoteTableReady = false;
        renderSavedQuotes(null);
        setSaveStatus('No existe la tabla de cotizaciones. Ejecuta supabase/quotes-migration.sql.', 'error');
        return;
      }
      if (String(result.error.code) === '42501') {
        setSaveStatus('Tu usuario no tiene permiso de personal activo para guardar cotizaciones.', 'error');
        return;
      }
      setSaveStatus(`No se pudo guardar: ${result.error.message}`, 'error');
      return;
    }

    currentQuoteId = result.data.id;
    sourceLeadId = result.data.lead_id || sourceLeadId;
    saveLocalDraft(false);
    await refreshSavedQuotes({ silent: true, selection: currentQuoteId });
    setSaveStatus(`Guardada en la nube · revisión ${result.data.revision}.`, 'success');
  } catch (error) {
    setSaveStatus(`No se pudo guardar: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function loadSavedQuote(id) {
  if (!id || !quoteTableReady) return;
  const button = $('#load-quote');
  button.disabled = true;
  setSaveStatus('Cargando cotización…');

  try {
    const result = await quoteDb.from('quotes').select('*').eq('id', id).single();
    if (result.error) {
      setSaveStatus(`No se pudo cargar: ${result.error.message}`, 'error');
      return;
    }

    const quote = result.data;
    const fields = {
      ...(quote.fields || {}),
      'quote-number': quote.quote_number,
      'quote-status': statusFromDatabase[quote.status] || 'Draft',
      'quote-language': quote.language || 'en',
      'client-name': quote.client_name || '',
      'client-phone': quote.client_phone || '',
      'client-email': quote.client_email || '',
      'project-address': quote.project_address || '',
      'valid-through': quote.valid_through || ''
    };

    load({ fields, items: quote.line_items || [] }, {
      quoteId: quote.id,
      leadId: quote.lead_id || null
    });
    saveLocalDraft(false);
    setSaveStatus(`Cotización cargada · revisión ${quote.revision}.`, 'success');
  } catch (error) {
    setSaveStatus(`No se pudo cargar: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

function bindEvents() {
  fieldIds.forEach(id => {
    if (id === 'quote-language') return;
    $(`#${id}`).addEventListener('input', handleChange);
  });

  $('#quote-language').addEventListener('change', () => {
    const language = currentLanguage();
    const notes = $('#notes');
    if (!notes.value.trim() || notes.value === lastDefaultTerms) notes.value = defaultTerms[language];
    lastDefaultTerms = defaultTerms[language];
    handleChange();
  });

  $('#add-item').addEventListener('click', event => {
    event.preventDefault();
    addItem();
    queueLocalSave();
  });

  $('#print-btn').addEventListener('click', () => {
    try {
      validateQuote();
      window.print();
    } catch (error) {
      alert(error.message);
    }
  });

  $('#save-btn').addEventListener('click', saveQuote);

  $('#new-btn').addEventListener('click', () => {
    if (!confirm('¿Comenzar una cotización nueva? La cotización actual seguirá disponible si ya fue guardada.')) return;
    fresh();
  });

  $('#saved-quotes').addEventListener('change', event => {
    $('#load-quote').disabled = !event.currentTarget.value;
  });

  $('#load-quote').addEventListener('click', () => loadSavedQuote($('#saved-quotes').value));
}

async function initialize() {
  items = $('#items');
  bindEvents();
  await refreshSavedQuotes({ silent: true });

  const leadPayload = sessionStorage.getItem('ebc-quote-lead');
  if (leadPayload) {
    sessionStorage.removeItem('ebc-quote-lead');
    try {
      loadLeadIntoQuote(JSON.parse(leadPayload));
    } catch {
      fresh();
    }
  } else {
    const saved = localStorage.getItem('ebc-quote-draft');
    if (saved) {
      try {
        load(JSON.parse(saved));
        setSaveStatus('Borrador local recuperado. Guarda en la nube para crear una revisión segura.');
      } catch {
        fresh();
      }
    } else {
      fresh();
    }
  }

  if (!quoteTableReady) {
    setSaveStatus('Modo local activo. Ejecuta supabase/quotes-migration.sql para habilitar historial y revisiones.', 'error');
  } else if (legacyAuthorization) {
    setSaveStatus('Acceso heredado detectado. Ejecuta la migración de seguridad para activar permisos de personal.');
  }
}

async function ensurePrivateAccess() {
  try {
    const { data: { session }, error } = await quoteDb.auth.getSession();
    if (error) throw error;
    if (!session) {
      window.location.replace('index.html');
      return;
    }

    currentSession = session;
    const profile = await quoteDb
      .from('staff_profiles')
      .select('role,is_active')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (profile.error && !isMissingRelation(profile.error)) throw profile.error;
    if (profile.error && isMissingRelation(profile.error)) {
      legacyAuthorization = true;
    } else if (!profile.data?.is_active) {
      $('#auth-check').textContent = 'Tu cuenta existe, pero no está autorizada como personal activo de EBC Construction LLC.';
      return;
    }

    $('#auth-check').hidden = true;
    $('#quote-app').hidden = false;
    await initialize();
  } catch (error) {
    $('#auth-check').textContent = 'No se pudo verificar el acceso. Regresa a EBC Manager e inicia sesión nuevamente.';
    console.error(error);
  }
}

ensurePrivateAccess();
