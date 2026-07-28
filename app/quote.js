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
    statuses: { Draft: 'Draft', Sent: 'Sent', Accepted: 'Accepted', Declined: 'Declined' },
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
    statuses: { Draft: 'Borrador', Sent: 'Enviada', Accepted: 'Aceptada', Declined: 'Rechazada' },
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

let items;
let lastDefaultTerms = '';

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
  row.querySelectorAll('input,select').forEach(input => input.addEventListener('input', update));
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    update();
  });
  items.appendChild(row);
  update();
}

function readItems() {
  return [...items.children].map(row => ({
    description: row.querySelector('.desc').value,
    qty: Number(row.querySelector('.qty').value) || 0,
    unit: row.querySelector('.unit').value,
    rate: Number(row.querySelector('.rate').value) || 0
  }));
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
  updatePreviewLanguage(language);

  let subtotal = 0;
  [...items.children].forEach(row => {
    const total = (Number(row.querySelector('.qty').value) || 0) *
      (Number(row.querySelector('.rate').value) || 0);
    subtotal += total;
    row.querySelector('.item-total').textContent = money(total);
  });

  const discount = Number($('#discount').value) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = taxable * ((Number($('#tax').value) || 0) / 100);
  const total = taxable + taxAmount;
  const payment1 = Math.max(0, Number($('#payment-1').value) || 0);
  const payment2 = Math.max(0, Number($('#payment-2').value) || 0);
  const payment3 = Math.max(0, Number($('#payment-3').value) || 0);
  const paymentTotal = payment1 + payment2 + payment3;

  $('#payment-warning').textContent = Math.abs(paymentTotal - 100) < 0.001
    ? `Los pagos suman 100%.`
    : `Atención: los pagos suman ${paymentTotal.toFixed(2)}%. Deben sumar 100%.`;
  $('#payment-warning').classList.toggle('error', Math.abs(paymentTotal - 100) >= 0.001);

  $('#p-number').textContent = $('#quote-number').value || '';
  $('#p-client').textContent = $('#client-name').value || copy.clientName;
  $('#p-contact').textContent = [$('#client-phone').value, $('#client-email').value].filter(Boolean).join(' · ');
  $('#p-address').textContent = $('#project-address').value;
  $('#p-date').textContent = `${copy.date}: ${$('#quote-date').value || ''}`;
  $('#p-valid').textContent = `${copy.valid}: ${$('#valid-through').value || ''}`;
  $('#p-status').textContent = `${copy.status}: ${copy.statuses[$('#quote-status').value] || $('#quote-status').value}`;
  $('#p-items').innerHTML = readItems().map(item => `
    <tr>
      <td>${escapeHtml(item.description || copy.item)}</td>
      <td>${item.qty}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${money(item.rate)}</td>
      <td>${money(item.qty * item.rate)}</td>
    </tr>`).join('');
  $('#p-notes').textContent = $('#notes').value;
  $('#p-subtotal').textContent = money(subtotal);
  $('#p-discount').textContent = `-${money(discount)}`;
  $('#p-tax').textContent = money(taxAmount);
  $('#p-total').textContent = money(total);
  $('#p-payment-1-label').textContent = `${copy.payment1} (${payment1}%)`;
  $('#p-payment-2-label').textContent = `${copy.payment2} (${payment2}%)`;
  $('#p-payment-3-label').textContent = `${copy.payment3} (${payment3}%)`;
  $('#p-payment-1').textContent = money(total * payment1 / 100);
  $('#p-payment-2').textContent = money(total * payment2 / 100);
  $('#p-payment-3').textContent = money(total * payment3 / 100);

  if (window.ebcRenderPlan) window.ebcRenderPlan();
}

function serialize() {
  return {
    fields: Object.fromEntries(fieldIds.map(id => [id, $(`#${id}`).value])),
    items: readItems()
  };
}

function load(data) {
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
  lastDefaultTerms = defaultTerms[currentLanguage()];
  update();
  ['plan-shape', 'plan-a', 'plan-b', 'plan-c', 'plan-d', 'thickness', 'plan-finish'].forEach(id => {
    $(`#${id}`).dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function fresh() {
  const number = String(Date.now()).slice(-6);
  const language = 'en';
  load({
    fields: {
      'quote-number': `EBC-${number}`,
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
  });
}

function loadLeadIntoQuote(lead) {
  fresh();
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
}

function bindEvents() {
  fieldIds.forEach(id => {
    $(`#${id}`).addEventListener('input', update);
  });

  $('#quote-language').addEventListener('change', () => {
    const language = currentLanguage();
    const notes = $('#notes');
    if (!notes.value.trim() || notes.value === lastDefaultTerms) notes.value = defaultTerms[language];
    lastDefaultTerms = defaultTerms[language];
    update();
  });

  $('#add-item').addEventListener('click', () => addItem());
  $('#print-btn').addEventListener('click', () => {
    const paymentTotal = ['payment-1', 'payment-2', 'payment-3']
      .reduce((sum, id) => sum + (Number($(`#${id}`).value) || 0), 0);
    if (Math.abs(paymentTotal - 100) >= 0.001) {
      alert('Los porcentajes de pago deben sumar 100% antes de guardar el PDF.');
      return;
    }
    window.print();
  });
  $('#save-btn').addEventListener('click', () => {
    localStorage.setItem('ebc-quote-draft', JSON.stringify(serialize()));
    alert('Borrador guardado en este dispositivo.');
  });
  $('#new-btn').addEventListener('click', () => {
    if (!confirm('¿Comenzar una cotización nueva? El borrador guardado no se eliminará.')) return;
    fresh();
  });
}

async function initialize() {
  items = $('#items');
  bindEvents();

  const leadPayload = sessionStorage.getItem('ebc-quote-lead');
  if (leadPayload) {
    sessionStorage.removeItem('ebc-quote-lead');
    try {
      loadLeadIntoQuote(JSON.parse(leadPayload));
    } catch {
      fresh();
    }
    return;
  }

  const saved = localStorage.getItem('ebc-quote-draft');
  if (saved) {
    try {
      load(JSON.parse(saved));
    } catch {
      fresh();
    }
  } else {
    fresh();
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
    $('#auth-check').hidden = true;
    $('#quote-app').hidden = false;
    await initialize();
  } catch (error) {
    $('#auth-check').textContent = 'No se pudo verificar el acceso. Regresa a EBC Manager e inicia sesión nuevamente.';
    console.error(error);
  }
}

ensurePrivateAccess();
