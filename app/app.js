const SUPABASE_URL = 'https://agczzdjxnytjzgprvcxq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0Sn8fs22OGVbNdvyZMILHA_Vv9NI2BE';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  session: null,
  leads: [],
  clients: [],
  projects: [],
  files: [],
  media: [],
  active: 'dashboard',
  editing: null,
  mediaReady: true
};

const labels = {
  dashboard: 'Resumen',
  leads: 'Solicitudes',
  schedule: 'Agenda',
  clients: 'Clientes',
  projects: 'Proyectos',
  files: 'Archivos',
  media: 'Fotos del sitio web'
};

const entityLabels = {
  leads: 'solicitud',
  clients: 'cliente',
  projects: 'proyecto'
};

const statusLabels = {
  new: 'Nueva',
  contacted: 'Contactada',
  estimate_scheduled: 'Visita programada',
  quoted: 'Cotización enviada',
  won: 'Ganada',
  lost: 'Perdida',
  planning: 'Planeación',
  scheduled: 'Programado',
  in_progress: 'En progreso',
  on_hold: 'En espera',
  completed: 'Completado',
  cancelled: 'Cancelado'
};

const serviceLabels = {
  Concrete: 'Concreto',
  Grading: 'Grading',
  Excavation: 'Excavación',
  Pavers: 'Pavers',
  Landscaping: 'Landscaping',
  Remodeling: 'Remodelación',
  Other: 'Otro'
};

const serviceOptions = ['Concrete', 'Grading', 'Excavation', 'Pavers', 'Landscaping', 'Remodeling', 'Other'];

const schemas = {
  leads: [
    ['name', 'Nombre completo', 'text', true],
    ['phone', 'Teléfono', 'tel', true],
    ['email', 'Correo electrónico', 'email'],
    ['address', 'Dirección del proyecto', 'text'],
    ['service', 'Servicio', 'select', serviceOptions],
    ['status', 'Estado', 'select', ['new', 'contacted', 'estimate_scheduled', 'quoted', 'won', 'lost']],
    ['estimated_value', 'Valor estimado', 'number'],
    ['preferred_timing', 'Fecha o tiempo preferido', 'text'],
    ['message', 'Detalles del proyecto', 'textarea']
  ],
  clients: [
    ['name', 'Nombre del cliente', 'text', true],
    ['phone', 'Teléfono', 'tel'],
    ['email', 'Correo electrónico', 'email'],
    ['address', 'Dirección', 'text'],
    ['notes', 'Notas', 'textarea']
  ],
  projects: [
    ['name', 'Nombre del proyecto', 'text', true],
    ['client_id', 'Cliente', 'client'],
    ['service', 'Servicio', 'select', serviceOptions],
    ['status', 'Estado', 'select', ['planning', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled']],
    ['address', 'Dirección de la obra', 'text'],
    ['start_date', 'Fecha de inicio', 'date'],
    ['end_date', 'Fecha de finalización', 'date'],
    ['contract_value', 'Valor del contrato', 'number'],
    ['notes', 'Notas del proyecto', 'textarea']
  ]
};

function toast(message, error = false) {
  const element = $('#toast');
  element.textContent = message;
  element.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(element._timer);
  element._timer = setTimeout(() => {
    element.className = 'toast';
  }, 4000);
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDate(value, options = {}) {
  if (!value) return 'Sin fecha';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  }).format(date);
}

function statusLabel(status) {
  return statusLabels[status] || status || 'Sin estado';
}

function serviceLabel(service) {
  if (!service) return 'General';
  const key = Object.keys(serviceLabels).find(item => service.startsWith(item));
  return key ? serviceLabels[key] : service;
}

function canonicalService(service) {
  return serviceOptions.find(option => String(service || '').startsWith(option)) || 'Other';
}

function safeName(name) {
  return name.normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

function fileType(file) {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => console.error('Service worker:', error));
  });
}

async function boot() {
  const { data: { session } } = await db.auth.getSession();
  await setSession(session);
  db.auth.onAuthStateChange((_event, nextSession) => {
    setSession(nextSession);
  });
}

async function setSession(session) {
  state.session = session;
  $('#auth-view').classList.toggle('hidden', Boolean(session));
  $('#app-view').classList.toggle('hidden', !session);
  if (session) {
    $('#user-email').textContent = session.user.email;
    await refresh();
  }
}

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) toast('No se pudo iniciar sesión. Revisa el correo y la contraseña.', true);
});

$('#logout-btn').addEventListener('click', () => db.auth.signOut());

$$('[data-view]').forEach(button => {
  button.addEventListener('click', () => showView(button.dataset.view));
});

$$('[data-new-type]').forEach(button => {
  button.addEventListener('click', () => openDialog(button.dataset.newType));
});

function showView(name) {
  state.active = name;
  $$('.view').forEach(view => view.classList.toggle('active', view.id === name));
  $$('.sidebar nav button').forEach(button => {
    button.classList.toggle('active', button.dataset.view === name);
  });
  $('#page-title').textContent = labels[name];
  $('#new-record-btn').style.display = ['leads', 'clients', 'projects'].includes(name) ? 'inline-flex' : 'none';
  if (name === 'media') renderMedia();
  if (name === 'schedule') renderSchedule();
}

async function refresh() {
  const [leads, clients, projects, files, media] = await Promise.all([
    db.from('leads').select('*').order('created_at', { ascending: false }),
    db.from('clients').select('*').order('created_at', { ascending: false }),
    db.from('projects').select('*,clients(name,phone)').order('created_at', { ascending: false }),
    db.from('project_files').select('*,projects(name),leads(name)').order('created_at', { ascending: false }),
    db.from('site_media').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false })
  ]);

  for (const result of [leads, clients, projects, files]) {
    if (result.error) {
      toast(`No se pudieron cargar los datos: ${result.error.message}`, true);
      return;
    }
  }

  state.leads = leads.data || [];
  state.clients = clients.data || [];
  state.projects = projects.data || [];
  state.files = files.data || [];

  if (media.error) {
    state.media = [];
    state.mediaReady = false;
  } else {
    state.media = media.data || [];
    state.mediaReady = true;
  }

  renderAll();
}

function renderAll() {
  renderDashboard();
  renderTable('leads');
  renderTable('clients');
  renderTable('projects');
  renderSchedule();
  renderFiles();
  renderMedia();
  fillProjectSelect();
}

function sortedActiveProjects() {
  return state.projects
    .filter(project => !['completed', 'cancelled'].includes(project.status))
    .sort((first, second) => {
      if (!first.start_date && !second.start_date) return 0;
      if (!first.start_date) return 1;
      if (!second.start_date) return -1;
      return first.start_date.localeCompare(second.start_date);
    });
}

function renderDashboard() {
  const openLeads = state.leads.filter(item => !['won', 'lost'].includes(item.status));
  const activeProjects = sortedActiveProjects();
  const pipeline = openLeads.reduce((sum, item) => sum + (Number(item.estimated_value) || 0), 0);

  $('#metric-leads').textContent = openLeads.length;
  $('#metric-projects').textContent = activeProjects.length;
  $('#metric-clients').textContent = state.clients.length;
  $('#metric-value').textContent = money(pipeline);
  $('#recent-leads').innerHTML = listItems(openLeads.slice(0, 5), 'lead');
  $('#recent-projects').innerHTML = listItems(activeProjects.slice(0, 5), 'project');

  $$('#recent-leads [data-lead-id]').forEach(item => {
    item.addEventListener('click', () => viewLead(item.dataset.leadId));
  });
  $$('#recent-projects [data-project-id]').forEach(item => {
    item.addEventListener('click', () => editRecord('projects', item.dataset.projectId));
  });
}

function listItems(items, type) {
  if (!items.length) return '<div class="empty">Todavía no hay registros.</div>';
  return items.map(item => {
    if (type === 'lead') {
      return `
        <button class="list-item clickable" data-lead-id="${item.id}">
          <div><strong>${esc(item.name)}</strong><span>${esc(serviceLabel(item.service))} · ${esc(item.phone || '')}</span></div>
          <span class="badge">${esc(statusLabel(item.status || 'new'))}</span>
        </button>`;
    }
    return `
      <button class="list-item clickable" data-project-id="${item.id}">
        <div><strong>${esc(item.name)}</strong><span>${esc(formatDate(item.start_date))} · ${esc(item.clients?.name || 'Sin cliente')}</span></div>
        <span class="badge">${esc(statusLabel(item.status || 'planning'))}</span>
      </button>`;
  }).join('');
}

function renderSchedule() {
  const target = $('#schedule-list');
  if (!target) return;
  const projects = sortedActiveProjects();
  if (!projects.length) {
    target.innerHTML = '<div class="panel empty">No hay proyectos activos en la agenda.</div>';
    return;
  }

  target.innerHTML = projects.map(project => {
    const clientPhone = project.clients?.phone || '';
    const dateRange = project.end_date && project.end_date !== project.start_date
      ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`
      : formatDate(project.start_date);
    return `
      <article class="schedule-card">
        <div class="schedule-date">
          <span>${project.start_date ? formatDate(project.start_date, { month: 'short' }).split(' ')[0] : 'PEND'}</span>
          <strong>${project.start_date ? new Date(`${project.start_date}T12:00:00`).getDate() : '—'}</strong>
        </div>
        <div class="schedule-copy">
          <div class="schedule-title">
            <div><p>${esc(serviceLabel(project.service))}</p><h3>${esc(project.name)}</h3></div>
            <span class="badge">${esc(statusLabel(project.status))}</span>
          </div>
          <p>${esc(dateRange)} · ${esc(project.address || 'Dirección pendiente')}</p>
          <small>${esc(project.clients?.name || 'Sin cliente asignado')} · ${money(project.contract_value)}</small>
        </div>
        <div class="schedule-actions">
          ${clientPhone ? `<a href="tel:${esc(clientPhone)}">Llamar</a>` : ''}
          <button onclick="editRecord('projects','${project.id}')">Editar</button>
        </div>
      </article>`;
  }).join('');
}

function getFiltered(type) {
  const rows = state[type];
  const query = $(`#${type.slice(0, -1)}-search`)?.value.toLowerCase() || '';
  const status = $(`#${type.slice(0, -1)}-filter`)?.value || '';
  return rows.filter(item => {
    const searchable = JSON.stringify(item).toLowerCase();
    return (!query || searchable.includes(query)) && (!status || item.status === status);
  });
}

function renderTable(type) {
  const rows = getFiltered(type);
  const target = $(`#${type.slice(0, -1)}-list`);
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = '<div class="empty">No se encontraron registros.</div>';
    return;
  }

  const columns = type === 'leads'
    ? ['name', 'phone', 'service', 'status', 'estimated_value', 'created_at']
    : type === 'clients'
      ? ['name', 'phone', 'email', 'address', 'created_at']
      : ['name', 'client', 'service', 'status', 'contract_value', 'start_date'];

  const columnLabels = {
    name: 'Nombre',
    phone: 'Teléfono',
    email: 'Correo',
    address: 'Dirección',
    service: 'Servicio',
    status: 'Estado',
    estimated_value: 'Valor estimado',
    contract_value: 'Valor',
    created_at: 'Fecha',
    start_date: 'Inicio',
    client: 'Cliente'
  };

  target.innerHTML = `
    <table class="data-table">
      <thead><tr>${columns.map(column => `<th>${columnLabels[column]}</th>`).join('')}<th>Acciones</th></tr></thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${columns.map(column => `<td>${cell(row, column)}</td>`).join('')}
            <td class="row-actions">
              ${type === 'leads' ? `<button onclick="viewLead('${row.id}')">Ver</button>` : ''}
              <button onclick="editRecord('${type}','${row.id}')">Editar</button>
              <button onclick="deleteRecord('${type}','${row.id}')">Eliminar</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function cell(row, column) {
  if (column === 'status') return `<span class="badge">${esc(statusLabel(row[column]))}</span>`;
  if (column === 'service') return esc(serviceLabel(row[column]));
  if (column.includes('value')) return money(row[column]);
  if (column === 'created_at') return row[column] ? new Date(row[column]).toLocaleDateString('es-US') : '—';
  if (column.endsWith('_date')) return row[column] ? formatDate(row[column]) : '—';
  if (column === 'client') return esc(row.clients?.name || '—');
  return esc(row[column] || '—');
}

['lead-search', 'lead-filter', 'client-search', 'project-search', 'project-filter'].forEach(id => {
  $(`#${id}`)?.addEventListener('input', () => {
    renderTable(id.startsWith('lead') ? 'leads' : id.startsWith('client') ? 'clients' : 'projects');
  });
});

$('#new-record-btn').addEventListener('click', () => openDialog(state.active));

window.editRecord = (type, id) => {
  openDialog(type, state[type].find(item => item.id === id));
};

function openDialog(type, row = null, prefill = {}) {
  if (!schemas[type]) return;
  const values = row || prefill;
  state.editing = { type, row };
  $('#dialog-title').textContent = `${row ? 'Editar' : 'Nuevo'} ${entityLabels[type]}`;
  $('#record-fields').innerHTML = schemas[type].map(field => fieldHtml(field, values)).join('');
  $('#record-dialog').showModal();
}

function fieldHtml([name, label, type, options], values) {
  const value = values?.[name] ?? '';
  const required = options === true ? 'required' : '';
  if (type === 'textarea') {
    return `<label class="wide">${label}<textarea name="${name}">${esc(value)}</textarea></label>`;
  }
  if (type === 'select') {
    return `
      <label>${label}
        <select name="${name}">
          ${options.map(option => `
            <option value="${option}" ${value === option ? 'selected' : ''}>
              ${esc(name === 'status' ? statusLabel(option) : serviceLabel(option))}
            </option>`).join('')}
        </select>
      </label>`;
  }
  if (type === 'client') {
    return `
      <label>${label}
        <select name="${name}">
          <option value="">Sin cliente</option>
          ${state.clients.map(client => `
            <option value="${client.id}" ${value === client.id ? 'selected' : ''}>${esc(client.name)}</option>
          `).join('')}
        </select>
      </label>`;
  }
  return `
    <label class="${name === 'address' ? 'wide' : ''}">
      ${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required}>
    </label>`;
}

$('#record-form').addEventListener('submit', async event => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  const { type, row } = state.editing;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  ['estimated_value', 'contract_value'].forEach(key => {
    if (key in data) data[key] = data[key] ? Number(data[key]) : null;
  });
  ['client_id', 'start_date', 'end_date', 'email'].forEach(key => {
    if (key in data && !data[key]) data[key] = null;
  });

  const query = row
    ? db.from(type).update(data).eq('id', row.id)
    : db.from(type).insert(data);
  const { error } = await query;
  if (error) {
    toast(`No se pudo guardar: ${error.message}`, true);
    return;
  }
  $('#record-dialog').close();
  toast('Registro guardado');
  await refresh();
});

window.deleteRecord = async (type, id) => {
  if (!confirm(`¿Eliminar este ${entityLabels[type]}? Esta acción no se puede deshacer.`)) return;
  const { error } = await db.from(type).delete().eq('id', id);
  if (error) {
    toast(`No se pudo eliminar: ${error.message}`, true);
    return;
  }
  toast('Registro eliminado');
  await refresh();
};

window.viewLead = async id => {
  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;
  $('#lead-detail-title').textContent = lead.name;
  const linkedFiles = state.files.filter(file => file.lead_id === id);
  const fileCards = await Promise.all(linkedFiles.map(async file => {
    const { data, error } = await db.storage.from('project-files').createSignedUrl(file.storage_path, 3600);
    if (error) return '';
    const url = data.signedUrl;
    const preview = file.mime_type?.startsWith('image/')
      ? `<img src="${url}" alt="${esc(file.file_name)}">`
      : file.mime_type?.startsWith('video/')
        ? `<video src="${url}" controls playsinline preload="metadata"></video>`
        : '<div class="document-icon">ARCHIVO</div>';
    return `<a class="lead-file-card" href="${url}" target="_blank" rel="noopener">${preview}<span>${esc(file.file_name)}</span></a>`;
  }));

  $('#lead-detail-content').innerHTML = `
    <div class="lead-action-bar">
      ${lead.phone ? `<a class="primary" href="tel:${esc(lead.phone)}">Llamar</a><a href="sms:${esc(lead.phone)}">Enviar mensaje</a>` : ''}
      <button onclick="prepareQuote('${lead.id}')">Crear cotización</button>
      <button onclick="createClientFromLead('${lead.id}')">Guardar como cliente</button>
      <button onclick="createProjectFromLead('${lead.id}')">Preparar proyecto</button>
      <button onclick="editRecord('leads','${lead.id}')">Editar solicitud</button>
    </div>
    <div class="detail-grid">
      <div><span>Teléfono</span><strong>${lead.phone ? `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>` : '—'}</strong></div>
      <div><span>Correo</span><strong>${lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : '—'}</strong></div>
      <div><span>Servicio</span><strong>${esc(serviceLabel(lead.service))}</strong></div>
      <div><span>Estado</span><strong>${esc(statusLabel(lead.status || 'new'))}</strong></div>
      <div class="wide"><span>Dirección</span><strong>${esc(lead.address || '—')}</strong></div>
      <div class="wide"><span>Fecha preferida</span><strong>${esc(lead.preferred_timing || '—')}</strong></div>
      <div class="wide"><span>Detalles del proyecto</span><p>${esc(lead.message || 'El cliente no agregó detalles.')}</p></div>
    </div>
    <div class="lead-files">
      <h3>Fotos y videos del cliente (${linkedFiles.length})</h3>
      <div class="lead-file-grid">${fileCards.filter(Boolean).join('') || '<div class="empty">La solicitud no tiene archivos adjuntos.</div>'}</div>
    </div>`;
  $('#lead-detail-dialog').showModal();
};

$('#lead-detail-close').addEventListener('click', () => $('#lead-detail-dialog').close());

window.prepareQuote = id => {
  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;
  sessionStorage.setItem('ebc-quote-lead', JSON.stringify({
    leadId: lead.id,
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    address: lead.address || '',
    service: lead.service || '',
    message: lead.message || '',
    estimatedValue: Number(lead.estimated_value) || 0
  }));
  window.location.href = 'quote.html';
};

function matchingClient(lead) {
  const email = (lead.email || '').trim().toLowerCase();
  const phone = (lead.phone || '').replace(/\D/g, '');
  return state.clients.find(client => (
    (email && (client.email || '').trim().toLowerCase() === email) ||
    (phone && (client.phone || '').replace(/\D/g, '') === phone)
  ));
}

async function ensureClientForLead(lead) {
  const existing = matchingClient(lead);
  if (existing) return existing;
  const { data, error } = await db.from('clients').insert({
    name: lead.name,
    phone: lead.phone || null,
    email: lead.email || null,
    address: lead.address || null,
    notes: lead.message ? `Solicitud original: ${lead.message}` : null
  }).select('*').single();
  if (error) throw error;
  state.clients.unshift(data);
  return data;
}

window.createClientFromLead = async id => {
  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;
  try {
    const existing = matchingClient(lead);
    const client = await ensureClientForLead(lead);
    $('#lead-detail-dialog').close();
    showView('clients');
    renderTable('clients');
    toast(existing ? `${client.name} ya estaba registrado como cliente` : `${client.name} fue guardado como cliente`);
  } catch (error) {
    toast(`No se pudo crear el cliente: ${error.message}`, true);
  }
};

window.createProjectFromLead = async id => {
  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;
  try {
    const client = await ensureClientForLead(lead);
    $('#lead-detail-dialog').close();
    openDialog('projects', null, {
      name: `${serviceLabel(lead.service)} - ${lead.name}`,
      client_id: client.id,
      service: canonicalService(lead.service),
      status: 'planning',
      address: lead.address || '',
      contract_value: lead.estimated_value || '',
      notes: lead.message || ''
    });
  } catch (error) {
    toast(`No se pudo preparar el proyecto: ${error.message}`, true);
  }
};

function fillProjectSelect() {
  $('#file-project').innerHTML = '<option value="">General / sin proyecto</option>' + state.projects.map(project => (
    `<option value="${project.id}">${esc(project.name)}</option>`
  )).join('');
}

$('#file-form').addEventListener('submit', async event => {
  event.preventDefault();
  const files = [...$('#file-input').files];
  const projectId = $('#file-project').value || null;
  let uploaded = 0;

  for (const file of files) {
    const path = `${state.session.user.id}/${projectId || 'general'}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const upload = await db.storage.from('project-files').upload(path, file, { contentType: file.type });
    if (upload.error) {
      toast(upload.error.message, true);
      continue;
    }
    const meta = await db.from('project_files').insert({
      project_id: projectId,
      file_name: file.name,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: state.session.user.id
    });
    if (meta.error) {
      toast(meta.error.message, true);
      continue;
    }
    uploaded += 1;
  }

  event.currentTarget.reset();
  toast(`${uploaded} archivo${uploaded === 1 ? '' : 's'} subido${uploaded === 1 ? '' : 's'}`);
  await refresh();
});

async function renderFiles() {
  const target = $('#file-list');
  if (!state.files.length) {
    target.innerHTML = '<div class="empty">Todavía no hay archivos.</div>';
    return;
  }
  target.innerHTML = (await Promise.all(state.files.map(async file => {
    const { data } = await db.storage.from('project-files').createSignedUrl(file.storage_path, 3600);
    const owner = file.leads?.name
      ? `Solicitud: ${file.leads.name}`
      : file.projects?.name
        ? `Proyecto: ${file.projects.name}`
        : 'General';
    return `
      <article class="file-card">
        <a href="${data?.signedUrl || '#'}" target="_blank" rel="noopener">${esc(file.file_name)}</a>
        <small>${esc(owner)} · ${Math.round((file.size_bytes || 0) / 1024)} KB</small>
      </article>`;
  }))).join('');
}

$('#media-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.mediaReady) {
    toast('Primero se debe ejecutar supabase/site-media-migration.sql.', true);
    return;
  }

  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Subiendo…';
  const selected = [...$('#media-input').files];
  const titleEn = $('#media-title-en').value.trim();
  const titleEs = $('#media-title-es').value.trim();
  const category = $('#media-category').value;
  const sortOrder = Number($('#media-sort').value) || 0;
  let uploaded = 0;

  for (const file of selected) {
    const type = fileType(file);
    const path = `website/${category}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const upload = await db.storage.from('project-files').upload(path, file, {
      contentType: file.type,
      cacheControl: '3600'
    });
    if (upload.error) {
      toast(upload.error.message, true);
      continue;
    }
    const insert = await db.from('site_media').insert({
      title_en: titleEn,
      title_es: titleEs,
      media_type: type,
      category,
      storage_path: path,
      sort_order: sortOrder,
      is_active: true,
      uploaded_by: state.session.user.id
    });
    if (insert.error) {
      await db.storage.from('project-files').remove([path]);
      toast(insert.error.message, true);
      continue;
    }
    uploaded += 1;
  }

  button.disabled = false;
  button.textContent = 'Publicar en el sitio';
  event.currentTarget.reset();
  $('#media-sort').value = '0';
  toast(`${uploaded} elemento${uploaded === 1 ? '' : 's'} publicado${uploaded === 1 ? '' : 's'}`);
  await refresh();
});

async function renderMedia() {
  const target = $('#media-list');
  if (!target) return;
  if (!state.mediaReady) {
    target.innerHTML = `
      <div class="setup-card">
        <strong>La biblioteca necesita una actualización de base de datos.</strong>
        <p>Ejecuta <code>supabase/site-media-migration.sql</code> en el editor SQL de Supabase y actualiza esta página.</p>
      </div>`;
    return;
  }
  if (!state.media.length) {
    target.innerHTML = '<div class="empty">Todavía no hay material publicado. Aquí aparecerán las fotos y videos que selecciones.</div>';
    return;
  }

  target.innerHTML = (await Promise.all(state.media.map(async item => {
    const { data } = await db.storage.from('project-files').createSignedUrl(item.storage_path, 3600);
    const url = data?.signedUrl || '';
    const preview = item.media_type === 'video'
      ? `<video src="${url}" muted playsinline controls preload="metadata"></video>`
      : `<img src="${url}" alt="${esc(item.title_es)}" loading="lazy">`;
    return `
      <article class="media-admin-card">
        ${preview}
        <div class="media-admin-copy">
          <strong>${esc(item.title_es)}</strong>
          <span>${esc(item.title_en)}</span>
          <small>${esc(item.category)} · orden ${item.sort_order} · ${item.is_active ? 'Visible' : 'Oculto'}</small>
          <div class="media-admin-actions">
            <button onclick="toggleMedia('${item.id}',${!item.is_active})">${item.is_active ? 'Ocultar' : 'Mostrar'}</button>
            <button class="danger" onclick="deleteMedia('${item.id}')">Eliminar</button>
          </div>
        </div>
      </article>`;
  }))).join('');
}

window.toggleMedia = async (id, isActive) => {
  const { error } = await db.from('site_media').update({ is_active: isActive }).eq('id', id);
  if (error) {
    toast(error.message, true);
    return;
  }
  toast(isActive ? 'El material ahora está visible' : 'El material quedó oculto');
  await refresh();
};

window.deleteMedia = async id => {
  const item = state.media.find(media => media.id === id);
  if (!item || !confirm(`¿Eliminar “${item.title_es}” de la biblioteca del sitio?`)) return;
  const remove = await db.storage.from('project-files').remove([item.storage_path]);
  if (remove.error) {
    toast(remove.error.message, true);
    return;
  }
  const { error } = await db.from('site_media').delete().eq('id', id);
  if (error) {
    toast(error.message, true);
    return;
  }
  toast('Material eliminado');
  await refresh();
};

boot();
