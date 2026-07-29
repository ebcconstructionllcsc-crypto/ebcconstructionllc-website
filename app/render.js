const SUPABASE_URL = 'https://agczzdjxnytjzgprvcxq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0Sn8fs22OGVbNdvyZMILHA_Vv9NI2BE';
const renderDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = selector => document.querySelector(selector);
const core = window.EBCRenderCore;

const state = {
  session: null,
  sourceBlob: null,
  sourceUrl: '',
  dimensions: null,
  image: null,
  maskCanvas: document.createElement('canvas'),
  overlayCanvas: document.createElement('canvas'),
  maskTouched: false,
  drawing: false,
  lastPoint: null,
  currentJob: null,
  history: new Map()
};

function status(message, error = false) {
  const element = $('#render-status');
  element.textContent = message;
  element.classList.toggle('error', error);
}

function canvasBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo preparar la imagen.')), type, quality);
  });
}

async function normalizeImage(file) {
  if (!String(file.type).startsWith('image/')) throw new Error('Selecciona un archivo de imagen.');
  if (file.size > 25 * 1024 * 1024) throw new Error('La fotografía original no debe exceder 25 MB.');
  let bitmap;
  let release = () => {};
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    release = () => bitmap.close();
  } catch {
    const source = URL.createObjectURL(file);
    bitmap = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Este formato de fotografía no se puede abrir en el dispositivo.'));
      image.src = source;
    });
    release = () => URL.revokeObjectURL(source);
  }
  if (bitmap.width > 12000 || bitmap.height > 12000) {
    release();
    throw new Error('La fotografía tiene dimensiones demasiado grandes.');
  }
  const dimensions = core.scaledDimensions(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
  release();
  return {
    blob: await canvasBlob(canvas),
    url: canvas.toDataURL('image/jpeg', .86),
    dimensions,
    image: canvas
  };
}

function resetMask() {
  if (!state.dimensions) return;
  state.maskCanvas.width = state.dimensions.width;
  state.maskCanvas.height = state.dimensions.height;
  const context = state.maskCanvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, state.dimensions.width, state.dimensions.height);
  state.maskTouched = false;
  $('#mask-status').textContent = 'Todavía no has marcado el área.';
  drawComposite();
}

function drawComposite() {
  if (!state.image) return;
  const canvas = $('#photo-canvas');
  if (canvas.width !== state.dimensions.width) canvas.width = state.dimensions.width;
  if (canvas.height !== state.dimensions.height) canvas.height = state.dimensions.height;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(state.image, 0, 0);
  if (state.maskTouched) {
    const overlay = state.overlayCanvas;
    if (overlay.width !== canvas.width) overlay.width = canvas.width;
    if (overlay.height !== canvas.height) overlay.height = canvas.height;
    const overlayContext = overlay.getContext('2d');
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    overlayContext.globalCompositeOperation = 'source-over';
    overlayContext.fillStyle = 'rgba(211,156,55,.48)';
    overlayContext.fillRect(0, 0, overlay.width, overlay.height);
    overlayContext.globalCompositeOperation = 'destination-out';
    overlayContext.drawImage(state.maskCanvas, 0, 0);
    context.drawImage(overlay, 0, 0);
  }
}

function pointFromEvent(event) {
  const canvas = $('#photo-canvas');
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * canvas.width / bounds.width,
    y: (event.clientY - bounds.top) * canvas.height / bounds.height
  };
}

function paint(event) {
  if (!state.drawing) return;
  const point = pointFromEvent(event);
  const context = state.maskCanvas.getContext('2d');
  const scale = state.maskCanvas.width / Math.max(1, $('#photo-canvas').clientWidth);
  context.globalCompositeOperation = 'destination-out';
  context.lineWidth = Number($('#brush-size').value) * scale;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(state.lastPoint?.x ?? point.x, state.lastPoint?.y ?? point.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  state.lastPoint = point;
  state.maskTouched = true;
  $('#mask-status').textContent = 'Área de trabajo marcada.';
  drawComposite();
}

async function prepareSource(file) {
  status('Preparando la fotografía…');
  const normalized = await normalizeImage(file);
  state.sourceBlob = normalized.blob;
  state.sourceUrl = normalized.url;
  state.dimensions = normalized.dimensions;
  state.image = normalized.image;
  resetMask();
  $('#marking-section').hidden = false;
  $('#upload-zone').classList.add('ready');
  $('#upload-zone strong').textContent = file.name;
  $('#generate-btn').disabled = false;
  status('Fotografía lista. Marca el área de trabajo y completa la propuesta.');
}

async function uploadInput(path, blob) {
  const { error } = await renderDb.storage.from('render-inputs').upload(path, blob, {
    contentType: 'image/png',
    upsert: false
  });
  if (error) throw error;
}

async function renderErrorMessage(error) {
  try {
    if (error?.context && typeof error.context.clone === 'function') {
      const payload = await error.context.clone().json();
      return core.errorMessage(payload?.error || error);
    }
  } catch {
    // Fall through to the safe browser message.
  }
  return core.errorMessage(error);
}

async function generate(event) {
  event.preventDefault();
  if (!state.sourceBlob || !state.session) return;
  if (!state.maskTouched && !confirm('No marcaste un área. El render dependerá únicamente de la descripción. ¿Continuar?')) return;
  if ($('#quality').value === 'high' && !confirm('La calidad final tiene un costo considerablemente mayor. ¿Generarla ahora?')) return;

  const button = $('#generate-btn');
  button.disabled = true;
  const idempotencyKey = crypto.randomUUID();
  const values = {
    projectId: $('#project-id').value,
    service: $('#service').value,
    finish: $('#finish').value,
    color: $('#color').value,
    scope: $('#scope').value,
    quality: $('#quality').value,
    preserveStructures: $('#preserve-structures').checked,
    hasMask: state.maskTouched
  };
  const request = core.renderRequest(values, state.session.user.id, idempotencyKey, state.dimensions);
  try {
    status('Guardando fotografía y área de trabajo en privado…');
    await uploadInput(request.sourcePath, state.sourceBlob);
    if (state.maskTouched) await uploadInput(request.maskPath, await canvasBlob(state.maskCanvas));
    status('Generando la propuesta realista. Puede tardar uno o dos minutos; no cierres esta pantalla.');
    const { data, error } = await renderDb.functions.invoke('generate-render', { body: request });
    if (error) throw error;
    if (!data?.data?.url) throw new Error('El servidor no entregó el render.');
    showResult(data.data);
    await loadHistory();
    status('Render guardado en el proyecto. Revísalo antes de compartirlo.');
  } catch (error) {
    console.error(error);
    status(await renderErrorMessage(error), true);
  } finally {
    button.disabled = false;
  }
}

function showResult(result) {
  state.currentJob = result;
  $('#empty-result').hidden = true;
  $('#render-result').hidden = false;
  $('#before-image').src = state.sourceUrl;
  $('#after-image').src = result.url;
  $('#download-render').href = result.url;
  $('#result-quality').textContent = result.quality === 'high' ? 'Calidad final' : 'Borrador';
}

async function useInQuote() {
  if (!state.currentJob) return;
  await openQuoteWithRender(state.currentJob);
}

async function openQuoteWithRender(render) {
  try {
    status('Preparando el render para la cotización…');
    const response = await fetch(render.url);
    if (!response.ok) throw new Error('No se pudo descargar el render guardado.');
    const blob = await response.blob();
    let image;
    let release = () => {};
    try {
      image = await createImageBitmap(blob);
      release = () => image.close();
    } catch {
      const source = URL.createObjectURL(blob);
      image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('No se pudo abrir el render guardado.'));
        element.src = source;
      });
      release = () => URL.revokeObjectURL(source);
    }
    const dimensions = core.scaledDimensions(image.width, image.height, 1200);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    canvas.getContext('2d').drawImage(image, 0, 0, dimensions.width, dimensions.height);
    release();
    sessionStorage.setItem('ebc-quote-render', JSON.stringify({
      image: canvas.toDataURL('image/jpeg', .78),
      jobId: render.jobId,
      conceptual: true
    }));
    window.location.href = 'quote.html';
  } catch (error) {
    status(error.message, true);
  }
}

function safeText(value) {
  return String(value || '').replace(/[&<>"']/g, '');
}

async function loadHistory() {
  const { data, error } = await renderDb
    .from('render_jobs')
    .select('id,project_id,output_storage_path,service,quality,created_at,projects(name)')
    .eq('status', 'completed')
    .not('output_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) {
    $('#render-history').innerHTML = '<p>El historial estará disponible cuando se active la migración del render.</p>';
    return;
  }

  const entries = await Promise.all((data || []).map(async job => {
    const { data: signed } = await renderDb.storage.from('project-renders')
      .createSignedUrl(job.output_storage_path, 3600);
    return signed?.signedUrl ? { ...job, url: signed.signedUrl } : null;
  }));
  state.history.clear();
  const available = entries.filter(Boolean);
  available.forEach(job => state.history.set(job.id, job));
  $('#render-history').innerHTML = available.length ? available.map(job => `
    <article class="history-card">
      <img src="${job.url}" alt="Render conceptual guardado">
      <div class="history-copy">
        <strong>${safeText(job.projects?.name || job.service)}</strong>
        <span>${new Date(job.created_at).toLocaleDateString('es-US')} · ${job.quality === 'high' ? 'Final' : 'Borrador'}</span>
        <div class="history-actions">
          <a href="${job.url}" target="_blank" rel="noopener">Abrir</a>
          <button type="button" data-quote-render="${job.id}">Cotización</button>
        </div>
      </div>
    </article>`).join('') : '<p>Todavía no hay renders guardados.</p>';
  document.querySelectorAll('[data-quote-render]').forEach(button => {
    button.addEventListener('click', () => {
      const job = state.history.get(button.dataset.quoteRender);
      if (job) openQuoteWithRender({ jobId: job.id, url: job.url });
    });
  });
}

async function loadProjects() {
  const { data, error } = await renderDb.from('projects').select('id,name,address').order('created_at', { ascending: false });
  if (error) throw error;
  $('#project-id').insertAdjacentHTML('beforeend', (data || []).map(project =>
    `<option value="${project.id}">${String(project.name).replace(/[&<>"']/g, '')}${project.address ? ` · ${String(project.address).replace(/[&<>"']/g, '')}` : ''}</option>`
  ).join(''));
}

function bindEvents() {
  $('#source-file').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) prepareSource(file).catch(error => status(error.message, true));
  });
  const canvas = $('#photo-canvas');
  canvas.addEventListener('pointerdown', event => {
    state.drawing = true;
    state.lastPoint = null;
    canvas.setPointerCapture(event.pointerId);
    paint(event);
  });
  canvas.addEventListener('pointermove', paint);
  canvas.addEventListener('pointerup', () => {
    state.drawing = false;
    state.lastPoint = null;
  });
  canvas.addEventListener('pointercancel', () => {
    state.drawing = false;
    state.lastPoint = null;
  });
  $('#clear-mask').addEventListener('click', resetMask);
  $('#render-form').addEventListener('submit', generate);
  $('#use-in-quote').addEventListener('click', useInQuote);
  $('#new-render').addEventListener('click', () => window.location.reload());
}

async function initialize() {
  try {
    const { data: { session }, error } = await renderDb.auth.getSession();
    if (error) throw error;
    if (!session) {
      window.location.replace('index.html');
      return;
    }
    const { data: staff, error: staffError } = await renderDb
      .from('staff_profiles')
      .select('is_active')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (staffError || !staff?.is_active) {
      $('#auth-check').textContent = 'Tu cuenta no está autorizada como personal activo de EBC Construction LLC.';
      return;
    }
    state.session = session;
    await Promise.all([loadProjects(), loadHistory()]);
    bindEvents();
    $('#auth-check').hidden = true;
    $('#render-app').hidden = false;
  } catch (error) {
    $('#auth-check').textContent = 'No se pudo verificar el acceso privado. Regresa a EBC Manager e inicia sesión nuevamente.';
    console.error(error);
  }
}

initialize();
