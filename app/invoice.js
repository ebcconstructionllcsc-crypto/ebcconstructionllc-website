const SUPABASE_URL = 'https://agczzdjxnytjzgprvcxq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0Sn8fs22OGVbNdvyZMILHA_Vv9NI2BE';
const invoiceDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = selector => document.querySelector(selector);
const core = window.EBCInvoiceCore;
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);

const copy = {
  en: {
    title: 'INVOICE', billTo: 'BILL TO', details: 'INVOICE DETAILS', date: 'Date', due: 'Due date',
    quote: 'Quote', status: 'Status', description: 'Description', amount: 'Amount',
    statuses: { Draft: 'Draft', Sent: 'Sent', 'Partially paid': 'Partially paid', Paid: 'Paid', Overdue: 'Overdue' },
    invoiceAmount: 'Invoice amount', paid: 'Payment received', balance: 'BALANCE DUE',
    paymentOptions: 'PAYMENT OPTIONS', notes: 'NOTES', footer: 'Thank you for choosing EBC Construction LLC.',
    phases: { initial: 'Initial payment', progress: 'Progress payment', final: 'Final payment', custom: 'Project payment' },
    methods: { ach: 'ACH / bank transfer', zelle: 'Zelle through Chase', check: 'Company check payable to EBC Construction LLC', cash: 'Cash with receipt', online: 'Official Chase invoice / QuickAccept link' },
    noFinancing: 'EBC Construction LLC does not offer financing, open credit accounts, or deferred payment plans. Payment is due by the date shown above.',
    payOnline: 'OPEN SECURE CHASE INVOICE',
    message: ({ client, number, balance, due, methods, link }) => `Hello ${client || ''}, EBC Construction LLC invoice ${number} has a balance of ${balance}, due ${due}. Payment options: ${methods}.${link ? ` Secure payment link: ${link}` : ''} EBC does not offer financing or deferred payment plans. Thank you.`
  },
  es: {
    title: 'INVOICE', billTo: 'COBRAR A', details: 'DETALLES DEL INVOICE', date: 'Fecha', due: 'Vencimiento',
    quote: 'Cotización', status: 'Estado', description: 'Descripción', amount: 'Importe',
    statuses: { Draft: 'Borrador', Sent: 'Enviado', 'Partially paid': 'Pago parcial', Paid: 'Pagado', Overdue: 'Vencido' },
    invoiceAmount: 'Importe del invoice', paid: 'Pago recibido', balance: 'SALDO PENDIENTE',
    paymentOptions: 'OPCIONES DE PAGO', notes: 'NOTAS', footer: 'Gracias por elegir EBC Construction LLC.',
    phases: { initial: 'Primer pago', progress: 'Segundo pago', final: 'Pago final', custom: 'Pago del proyecto' },
    methods: { ach: 'ACH / transferencia bancaria', zelle: 'Zelle por medio de Chase', check: 'Cheque a nombre de EBC Construction LLC', cash: 'Efectivo con recibo', online: 'Enlace oficial de Chase invoice / QuickAccept' },
    noFinancing: 'EBC Construction LLC no ofrece financiamiento, cuentas de crédito abiertas ni pagos aplazados. El pago vence en la fecha indicada arriba.',
    payOnline: 'ABRIR INVOICE SEGURO DE CHASE',
    message: ({ client, number, balance, due, methods, link }) => `Hola ${client || ''}, el invoice ${number} de EBC Construction LLC tiene un saldo de ${balance}, con vencimiento el ${due}. Opciones de pago: ${methods}.${link ? ` Enlace seguro: ${link}` : ''} EBC no ofrece financiamiento ni pagos aplazados. Gracias.`
  }
};

const fieldIds = [
  'invoice-number','quote-number','invoice-date','due-date','invoice-status','invoice-language',
  'client-name','client-phone','client-email','project-address','project-total','payment-phase',
  'phase-percent','amount-due','amount-paid','description','accept-ach','accept-zelle','accept-check','accept-cash',
  'accept-online','payment-link','payment-instructions','notes'
];
let schedule = [30, 45, 25];
let amountManuallyEdited = false;
let invoiceId = null;
const invoiceRecords = new Map();

function localDate(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

function plusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function language() {
  return $('#invoice-language').value === 'es' ? 'es' : 'en';
}

function selectedMethods() {
  return core.acceptedMethodKeys({
    ach: $('#accept-ach').checked,
    zelle: $('#accept-zelle').checked,
    check: $('#accept-check').checked,
    cash: $('#accept-cash').checked,
    online: $('#accept-online').checked
  });
}

function phaseDescription() {
  const text = copy[language()];
  const phase = $('#payment-phase').value;
  const percent = Number($('#phase-percent').value) || 0;
  const address = $('#project-address').value.trim();
  return `${text.phases[phase]} (${percent}%)${address ? ` — ${address}` : ''}`;
}

function isOneDaySchedule() {
  return schedule.every((value, index) => Math.abs(Number(value) - [50, 0, 50][index]) < 0.001);
}

function syncPhaseOptions() {
  const progressOption = $('#payment-phase').querySelector('option[value="progress"]');
  const oneDaySchedule = Number(schedule[1]) === 0;
  progressOption.disabled = oneDaySchedule;
  progressOption.hidden = oneDaySchedule;
  if (oneDaySchedule && $('#payment-phase').value === 'progress') {
    $('#payment-phase').value = 'initial';
  }
}

function applyPhase() {
  const percent = core.phasePercent($('#payment-phase').value, schedule, $('#phase-percent').value);
  $('#phase-percent').value = percent;
  if (!amountManuallyEdited || $('#payment-phase').value !== 'custom') {
    $('#amount-due').value = core.amountForPhase($('#project-total').value, percent).toFixed(2);
    amountManuallyEdited = false;
  }
  if (!$('#description').value.trim() || $('#description').dataset.generated === 'true') {
    $('#description').value = phaseDescription();
    $('#description').dataset.generated = 'true';
  }
  update();
}

function updateLanguage(text) {
  $('#p-title').textContent = text.title;
  $('#p-bill-to-label').textContent = text.billTo;
  $('#p-details-label').textContent = text.details;
  $('#p-description-label').textContent = text.description;
  $('#p-amount-label').textContent = text.amount;
  $('#p-invoice-amount-label').textContent = text.invoiceAmount;
  $('#p-paid-label').textContent = text.paid;
  $('#p-balance-label').textContent = text.balance;
  $('#p-payment-methods-title').textContent = text.paymentOptions;
  $('#p-notes-label').textContent = text.notes;
  $('#p-no-financing').textContent = text.noFinancing;
  $('#p-payment-link').textContent = text.payOnline;
  $('#p-footer').textContent = text.footer;
}

function update() {
  const text = copy[language()];
  updateLanguage(text);
  const amountDue = Math.max(0, Number($('#amount-due').value) || 0);
  const amountPaid = Math.max(0, Number($('#amount-paid').value) || 0);
  const balance = core.balance(amountDue, amountPaid);
  $('#balance').value = balance.toFixed(2);
  const methods = selectedMethods();
  const paymentUrl = core.validPaymentUrl($('#payment-link').value);

  $('#p-number').textContent = $('#invoice-number').value;
  $('#p-client').textContent = $('#client-name').value || 'Client name';
  $('#p-contact').textContent = [$('#client-phone').value, $('#client-email').value].filter(Boolean).join(' · ');
  $('#p-address').textContent = $('#project-address').value;
  $('#p-date').textContent = `${text.date}: ${$('#invoice-date').value}`;
  $('#p-due-date').textContent = `${text.due}: ${$('#due-date').value}`;
  $('#p-quote-number').textContent = `${text.quote}: ${$('#quote-number').value || '—'}`;
  $('#p-status').textContent = `${text.status}: ${text.statuses[$('#invoice-status').value] || $('#invoice-status').value}`;
  $('#p-description').textContent = $('#description').value || phaseDescription();
  $('#p-line-amount').textContent = money(amountDue);
  $('#p-amount-due').textContent = money(amountDue);
  $('#p-amount-paid').textContent = `-${money(amountPaid)}`;
  $('#p-balance').textContent = money(balance);
  $('#p-payment-methods').textContent = methods.length ? methods.map(method => text.methods[method]).join(' · ') : '—';
  $('#p-payment-instructions').textContent = $('#payment-instructions').value.trim();
  $('#p-notes').textContent = $('#notes').value;
  $('#p-payment-link').hidden = !($('#accept-online').checked && paymentUrl);
  if (paymentUrl) $('#p-payment-link').href = paymentUrl;
  else $('#p-payment-link').removeAttribute('href');

  const hasSensitiveNumbers = core.containsSensitiveFinancialNumber(
    `${$('#payment-instructions').value} ${$('#notes').value}`
  );
  const error = hasSensitiveNumbers
    ? 'No guardes números de cuenta, routing o tarjeta en el invoice. Usa un enlace seguro.'
    : $('#accept-online').checked && !paymentUrl
      ? 'Activa el pago en línea solamente cuando tengas un enlace HTTPS válido.'
      : '';
  $('#invoice-status-message').textContent = error;
  $('#invoice-status-message').classList.toggle('error', Boolean(error));
}

function serialize() {
  return {
    id: invoiceId,
    schedule,
    fields: Object.fromEntries(fieldIds.map(id => {
      const element = $(`#${id}`);
      return [id, element.type === 'checkbox' ? element.checked : element.value];
    }))
  };
}

function load(data) {
  invoiceId = data?.id || null;
  schedule = Array.isArray(data?.schedule) && data.schedule.length === 3 ? data.schedule.map(Number) : [30,45,25];
  fieldIds.forEach(id => {
    if (data?.fields?.[id] == null) return;
    const element = $(`#${id}`);
    if (element.type === 'checkbox') element.checked = Boolean(data.fields[id]);
    else element.value = data.fields[id];
  });
  syncPhaseOptions();
  amountManuallyEdited = true;
  update();
}

function fresh() {
  invoiceId = null;
  const number = String(Date.now()).slice(-7);
  schedule = [30,45,25];
  load({ schedule, fields: {
    'invoice-number': `EBC-INV-${number}`, 'quote-number': '', 'invoice-date': localDate(),
    'due-date': plusDays(7), 'invoice-status': 'Draft', 'invoice-language': 'en',
    'client-name': '', 'client-phone': '', 'client-email': '', 'project-address': '',
    'project-total': '0', 'payment-phase': 'initial', 'phase-percent': '30',
    'amount-due': '0', 'amount-paid': '0', description: '', 'accept-ach': true,
    'accept-zelle': true, 'accept-check': true, 'accept-cash': true, 'accept-online': false, 'payment-link': '',
    'payment-instructions': 'Contact EBC Construction LLC for Zelle, check or bank-transfer instructions. Use the official Chase invoice link only when it appears on this invoice.',
    notes: 'Payment is due according to the written project payment schedule.'
  }});
  amountManuallyEdited = false;
  applyPhase();
}

function invoiceRecord() {
  return {
    invoice_number: $('#invoice-number').value.trim(),
    quote_number: $('#quote-number').value.trim() || null,
    invoice_date: $('#invoice-date').value,
    due_date: $('#due-date').value,
    status: $('#invoice-status').value,
    language: language(),
    client_name: $('#client-name').value.trim() || null,
    client_phone: $('#client-phone').value.trim() || null,
    client_email: $('#client-email').value.trim() || null,
    project_address: $('#project-address').value.trim() || null,
    project_total: Math.max(0, Number($('#project-total').value) || 0),
    payment_schedule: schedule,
    payment_phase: $('#payment-phase').value,
    phase_percent: Math.max(0, Number($('#phase-percent').value) || 0),
    amount_due: Math.max(0, Number($('#amount-due').value) || 0),
    amount_paid: Math.max(0, Number($('#amount-paid').value) || 0),
    description: $('#description').value.trim() || null,
    payment_methods: selectedMethods(),
    payment_link: core.validPaymentUrl($('#payment-link').value) || null,
    payment_instructions: $('#payment-instructions').value.trim() || null,
    notes: $('#notes').value.trim() || null
  };
}

function loadInvoiceRecord(record) {
  const methods = Array.isArray(record.payment_methods) ? record.payment_methods : [];
  const storedSchedule = Array.isArray(record.payment_schedule) ? record.payment_schedule.map(Number) : [30,45,25];
  load({ id: record.id, schedule: storedSchedule, fields: {
    'invoice-number': record.invoice_number,
    'quote-number': record.quote_number || '',
    'invoice-date': record.invoice_date,
    'due-date': record.due_date,
    'invoice-status': record.status,
    'invoice-language': record.language,
    'client-name': record.client_name || '',
    'client-phone': record.client_phone || '',
    'client-email': record.client_email || '',
    'project-address': record.project_address || '',
    'project-total': record.project_total,
    'payment-phase': record.payment_phase,
    'phase-percent': record.phase_percent,
    'amount-due': record.amount_due,
    'amount-paid': record.amount_paid,
    description: record.description || '',
    'accept-ach': methods.includes('ach'),
    'accept-zelle': methods.includes('zelle'),
    'accept-check': methods.includes('check'),
    'accept-cash': methods.includes('cash'),
    'accept-online': methods.includes('online'),
    'payment-link': record.payment_link || '',
    'payment-instructions': record.payment_instructions || '',
    notes: record.notes || ''
  }});
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function safeText(value) {
  return String(value || '').replace(/[&<>"']/g, '');
}

async function loadHistory() {
  if (typeof invoiceDb.from !== 'function') {
    $('#invoice-history').innerHTML = '<p>El historial en la nube no está disponible en esta vista previa.</p>';
    return;
  }
  const { data, error } = await invoiceDb.from('invoices').select('*')
    .order('created_at', { ascending: false }).limit(30);
  if (error) {
    $('#invoice-history').innerHTML = '<p>Activa la migración de invoices para guardar el historial en la nube.</p>';
    return;
  }
  invoiceRecords.clear();
  (data || []).forEach(record => invoiceRecords.set(record.id, record));
  $('#invoice-history').innerHTML = data?.length ? data.map(record => `
    <button type="button" data-invoice-id="${record.id}">
      <strong>${safeText(record.invoice_number)} · ${safeText(record.client_name || 'Sin cliente')}</strong>
      <span>${safeText(record.status)} · vence ${safeText(record.due_date)}</span>
      <b>${money(core.balance(record.amount_due, record.amount_paid))}</b>
    </button>`).join('') : '<p>Todavía no hay invoices guardados.</p>';
  document.querySelectorAll('[data-invoice-id]').forEach(button => {
    button.addEventListener('click', () => {
      const record = invoiceRecords.get(button.dataset.invoiceId);
      if (record) loadInvoiceRecord(record);
    });
  });
}

async function saveInvoice() {
  const localData = serialize();
  if (!invoiceRecord().invoice_number || !$('#invoice-date').value || !$('#due-date').value) {
    $('#invoice-status-message').textContent = 'Completa el número, fecha y vencimiento del invoice.';
    $('#invoice-status-message').classList.add('error');
    return;
  }
  if (core.containsSensitiveFinancialNumber(`${$('#payment-instructions').value} ${$('#notes').value}`)) {
    $('#invoice-status-message').textContent = 'Elimina los posibles números de cuenta, routing o tarjeta antes de guardar.';
    $('#invoice-status-message').classList.add('error');
    return;
  }
  localStorage.setItem('ebc-invoice-draft', JSON.stringify(localData));
  if (typeof invoiceDb.from !== 'function') {
    $('#invoice-status-message').textContent = 'Borrador guardado solamente en este dispositivo.';
    return;
  }
  let query = invoiceId
    ? invoiceDb.from('invoices').update(invoiceRecord()).eq('id', invoiceId)
    : invoiceDb.from('invoices').insert(invoiceRecord());
  const { data, error } = await query.select('id').single();
  if (error) {
    $('#invoice-status-message').textContent = `Borrador local guardado. No se pudo guardar en la nube: ${error.message}`;
    $('#invoice-status-message').classList.add('error');
    return;
  }
  invoiceId = data.id;
  $('#invoice-status-message').textContent = 'Invoice guardado en la nube.';
  $('#invoice-status-message').classList.remove('error');
  localStorage.setItem('ebc-invoice-draft', JSON.stringify(serialize()));
  await loadHistory();
}

function fromQuote(payload) {
  const methods = Array.isArray(payload.methods) ? payload.methods : ['ach','zelle','check','cash'];
  schedule = Array.isArray(payload.schedule) && payload.schedule.length === 3 ? payload.schedule.map(Number) : [30,45,25];
  fresh();
  schedule = Array.isArray(payload.schedule) && payload.schedule.length === 3 ? payload.schedule.map(Number) : [30,45,25];
  syncPhaseOptions();
  $('#quote-number').value = payload.quoteNumber || '';
  $('#invoice-language').value = payload.language === 'es' ? 'es' : 'en';
  $('#client-name').value = payload.clientName || '';
  $('#client-phone').value = payload.clientPhone || '';
  $('#client-email').value = payload.clientEmail || '';
  $('#project-address').value = payload.projectAddress || '';
  $('#project-total').value = Number(payload.projectTotal || 0).toFixed(2);
  if (isOneDaySchedule()) {
    $('#due-date').value = localDate();
    $('#notes').value = payload.language === 'es'
      ? 'Para este trabajo de un día, el 50% vence al firmar el contrato y antes de programar o comenzar. El 50% restante vence inmediatamente al terminar el trabajo ese mismo día.'
      : 'For this one-day job, 50% is due at contract signing before scheduling or work begins. The remaining 50% is due immediately upon completion the same day.';
  }
  ['ach','zelle','check','cash','online'].forEach(method => { $(`#accept-${method}`).checked = methods.includes(method); });
  $('#payment-link').value = payload.paymentLink || '';
  $('#payment-instructions').value = payload.paymentInstructions || $('#payment-instructions').value;
  amountManuallyEdited = false;
  applyPhase();
}

async function copyMessage() {
  const text = copy[language()];
  const methods = selectedMethods().map(method => text.methods[method]).join(', ');
  const message = text.message({
    client: $('#client-name').value,
    number: $('#invoice-number').value,
    balance: money($('#balance').value),
    due: $('#due-date').value,
    methods,
    link: $('#accept-online').checked ? core.validPaymentUrl($('#payment-link').value) : ''
  });
  try {
    await navigator.clipboard.writeText(message);
    $('#invoice-status-message').textContent = 'Mensaje de cobro copiado.';
    $('#invoice-status-message').classList.remove('error');
  } catch {
    prompt('Copia este mensaje:', message);
  }
}

function bindEvents() {
  fieldIds.forEach(id => $(`#${id}`).addEventListener('input', update));
  $('#payment-phase').addEventListener('change', () => {
    amountManuallyEdited = false;
    applyPhase();
  });
  $('#phase-percent').addEventListener('input', () => {
    if ($('#payment-phase').value !== 'custom') $('#payment-phase').value = 'custom';
    amountManuallyEdited = false;
    $('#amount-due').value = core.amountForPhase($('#project-total').value, $('#phase-percent').value).toFixed(2);
    update();
  });
  $('#project-total').addEventListener('input', () => {
    if (!amountManuallyEdited) {
      $('#amount-due').value = core.amountForPhase($('#project-total').value, $('#phase-percent').value).toFixed(2);
    }
    update();
  });
  $('#amount-due').addEventListener('input', () => { amountManuallyEdited = true; });
  $('#description').addEventListener('input', () => { $('#description').dataset.generated = 'false'; });
  $('#invoice-language').addEventListener('change', () => {
    if ($('#description').dataset.generated === 'true') $('#description').value = phaseDescription();
    update();
  });
  $('#print-btn').addEventListener('click', () => {
    if (core.containsSensitiveFinancialNumber(`${$('#payment-instructions').value} ${$('#notes').value}`)) {
      alert('Por seguridad, elimina los números de cuenta, routing o tarjeta antes de imprimir.');
      return;
    }
    if ($('#accept-online').checked && !core.validPaymentUrl($('#payment-link').value)) {
      alert('Agrega un enlace de pago válido o desactiva el pago en línea antes de imprimir.');
      return;
    }
    window.print();
  });
  $('#save-btn').addEventListener('click', saveInvoice);
  $('#copy-message-btn').addEventListener('click', copyMessage);
  $('#new-btn').addEventListener('click', () => {
    if (confirm('¿Crear un invoice nuevo?')) fresh();
  });
}

async function initialize() {
  bindEvents();
  const quotePayload = sessionStorage.getItem('ebc-invoice-from-quote');
  if (quotePayload) {
    sessionStorage.removeItem('ebc-invoice-from-quote');
    try { fromQuote(JSON.parse(quotePayload)); } catch { fresh(); }
  } else {
    const saved = localStorage.getItem('ebc-invoice-draft');
    if (saved) {
      try { load(JSON.parse(saved)); } catch { fresh(); }
    } else fresh();
  }
  await loadHistory();
}

async function ensurePrivateAccess() {
  const localPreviewHosts = new Set(['localhost', '127.0.0.1', 'terminal.local']);
  const preview = localPreviewHosts.has(location.hostname) && new URLSearchParams(location.search).get('preview') === '1';
  if (preview) {
    $('#auth-check').hidden = true;
    $('#invoice-app').hidden = false;
    await initialize();
    return;
  }
  try {
    const { data: { session }, error } = await invoiceDb.auth.getSession();
    if (error) throw error;
    if (!session) return location.replace('index.html');
    const { data: staff, error: staffError } = await invoiceDb
      .from('staff_profiles')
      .select('is_active')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (staffError || !staff?.is_active) {
      $('#auth-check').textContent = 'Tu cuenta no está autorizada como personal activo de EBC Construction LLC.';
      return;
    }
    $('#auth-check').hidden = true;
    $('#invoice-app').hidden = false;
    await initialize();
  } catch (error) {
    $('#auth-check').textContent = 'No se pudo verificar el acceso. Regresa a EBC Manager.';
    console.error(error);
  }
}

ensurePrivateAccess();
