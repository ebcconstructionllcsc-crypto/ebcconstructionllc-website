const header = document.querySelector('.topbar');
const menuButton = document.querySelector('.menu-btn');
const navigation = document.querySelector('.navlinks');

function syncHeader() {
  header?.classList.toggle('scrolled', window.scrollY > 30);
}

function setMenu(open) {
  navigation?.classList.toggle('open', open);
  menuButton?.setAttribute('aria-expanded', String(open));
  menuButton?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (menuButton) menuButton.textContent = open ? '×' : '☰';
  document.body.classList.toggle('menu-open', open);
}

syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });
menuButton?.addEventListener('click', () => setMenu(!navigation?.classList.contains('open')));
navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') setMenu(false);
});

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.navlinks a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('in'));
}

const heroVideo = document.querySelector('.hero video');
if (heroVideo && (
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  navigator.connection?.saveData
)) {
  heroVideo.pause();
  heroVideo.removeAttribute('autoplay');
}

function applyLanguage(language) {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-en]').forEach(element => {
    element.textContent = language === 'es' ? element.dataset.es : element.dataset.en;
  });
  document.querySelectorAll('[data-en-placeholder]').forEach(element => {
    element.placeholder = language === 'es'
      ? element.dataset.esPlaceholder
      : element.dataset.enPlaceholder;
  });
  document.querySelectorAll('[data-lang-btn]').forEach(button => {
    button.classList.toggle('active', button.dataset.langBtn === language);
  });
  localStorage.setItem('ebc-lang', language);
}

document.querySelectorAll('[data-lang-btn]').forEach(button => {
  button.addEventListener('click', () => applyLanguage(button.dataset.langBtn));
});
applyLanguage(localStorage.getItem('ebc-lang') || 'en');

const estimateForm = document.querySelector('#estimate-form');

if (estimateForm) {
  const SUPABASE_URL = 'https://agczzdjxnytjzgprvcxq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_0Sn8fs22OGVbNdvyZMILHA_Vv9NI2BE';
  const MAX_FILES = 8;
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const SUBMISSION_TOKEN_KEY = 'ebc-estimate-submission-token';
  const LAST_SUCCESS_KEY = 'ebc-estimate-last-success';
  const allowedImageTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/avif'
  ]);
  const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif']);

  // JavaScript owns submission. This prevents the legacy external form action from
  // receiving customer data when the Supabase workflow is available.
  estimateForm.removeAttribute('action');

  function language() {
    return document.documentElement.lang === 'es' ? 'es' : 'en';
  }

  function text(english, spanish) {
    return language() === 'es' ? spanish : english;
  }

  function setFormStatus(message, type = '') {
    const status = estimateForm.querySelector('.form-status');
    if (!status) return;
    status.textContent = message;
    status.classList.remove('success', 'error');
    if (type) status.classList.add(type);
  }

  function safeFileName(name) {
    const normalized = String(name || 'project-photo')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return normalized || 'project-photo';
  }

  function fileExtension(name) {
    return String(name || '').split('.').pop()?.toLowerCase() || '';
  }

  function validateFiles(files) {
    if (files.length > MAX_FILES) {
      throw new Error(text(
        `Choose no more than ${MAX_FILES} photos.`,
        `Selecciona un máximo de ${MAX_FILES} fotos.`
      ));
    }

    for (const file of files) {
      if (!allowedImageTypes.has(file.type) || !allowedExtensions.has(fileExtension(file.name))) {
        throw new Error(text(
          `“${file.name}” is not a supported image. Use JPG, PNG, WebP, HEIC, or AVIF.`,
          `“${file.name}” no es una imagen compatible. Usa JPG, PNG, WebP, HEIC o AVIF.`
        ));
      }
      if (file.size < 1 || file.size > MAX_FILE_BYTES) {
        throw new Error(text(
          `“${file.name}” must be smaller than 15 MB.`,
          `“${file.name}” debe pesar menos de 15 MB.`
        ));
      }
    }
  }

  function submissionToken() {
    let token = sessionStorage.getItem(SUBMISSION_TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      sessionStorage.setItem(SUBMISSION_TOKEN_KEY, token);
    }
    return token;
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('supabase_library_unavailable'));
      document.head.appendChild(script);
    });
  }

  estimateForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (!estimateForm.checkValidity()) {
      estimateForm.reportValidity();
      return;
    }

    const button = estimateForm.querySelector('button[type="submit"]');
    const originalButtonText = button.textContent;
    const files = [...estimateForm.querySelector('#photos').files];

    try {
      validateFiles(files);
    } catch (error) {
      setFormStatus(error.message, 'error');
      return;
    }

    const lastSuccess = Number(localStorage.getItem(LAST_SUCCESS_KEY) || 0);
    if (Date.now() - lastSuccess < 30000) {
      setFormStatus(text(
        'Your request was already received. Please wait a moment before sending another.',
        'Tu solicitud ya fue recibida. Espera un momento antes de enviar otra.'
      ), 'success');
      return;
    }

    if (!navigator.onLine) {
      setFormStatus(text(
        'You appear to be offline. Reconnect and send the request again.',
        'Parece que no tienes conexión. Conéctate y vuelve a enviar la solicitud.'
      ), 'error');
      return;
    }

    button.disabled = true;
    button.textContent = text('SENDING…', 'ENVIANDO…');
    estimateForm.setAttribute('aria-busy', 'true');
    setFormStatus(text(
      'Sending your project information securely…',
      'Enviando la información de tu proyecto de forma segura…'
    ));

    try {
      await loadSupabase();
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const formData = new FormData(estimateForm);
      const token = submissionToken();

      const request = await client.rpc('submit_estimate_request', {
        p_submission_token: token,
        p_name: String(formData.get('Name') || '').trim(),
        p_phone: String(formData.get('Phone') || '').trim(),
        p_email: String(formData.get('Email') || '').trim() || null,
        p_address: String(formData.get('Address') || '').trim(),
        p_service: String(formData.get('Service') || '').trim(),
        p_preferred_timing: String(formData.get('Preferred timing') || '').trim() || null,
        p_message: String(formData.get('Project details') || '').trim()
      });

      if (request.error) throw request.error;
      const leadId = request.data;
      if (!leadId) throw new Error('missing_lead_id');

      const failedAttachments = [];
      let uploadedAttachments = 0;

      for (const file of files) {
        const storagePath = `incoming/${leadId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const upload = await client.storage.from('project-files').upload(storagePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

        if (upload.error) {
          failedAttachments.push(file.name);
          continue;
        }

        const metadata = await client.from('project_files').insert({
          lead_id: leadId,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          size_bytes: file.size
        });

        if (metadata.error) {
          failedAttachments.push(file.name);
          continue;
        }

        uploadedAttachments += 1;
      }

      localStorage.setItem(LAST_SUCCESS_KEY, String(Date.now()));
      sessionStorage.removeItem(SUBMISSION_TOKEN_KEY);
      estimateForm.reset();

      if (failedAttachments.length) {
        setFormStatus(text(
          `Your request was received. ${uploadedAttachments} photo${uploadedAttachments === 1 ? '' : 's'} uploaded; ${failedAttachments.length} could not be attached. Text the missing photos to (864) 450-2954.`,
          `Tu solicitud fue recibida. Se subieron ${uploadedAttachments} foto${uploadedAttachments === 1 ? '' : 's'}; ${failedAttachments.length} no se pudieron adjuntar. Envía las fotos faltantes por mensaje al (864) 450-2954.`
        ), 'success');
      } else {
        setFormStatus(text(
          'Request received. EBC Construction will contact you soon.',
          'Solicitud recibida. EBC Construction se comunicará contigo pronto.'
        ), 'success');
      }

      button.textContent = text('SENT', 'ENVIADO');
      window.setTimeout(() => {
        button.disabled = false;
        button.textContent = originalButtonText;
      }, 3500);
    } catch (error) {
      console.error('Estimate submission:', error);
      setFormStatus(text(
        'Unable to send the request right now. Please call or text (864) 450-2954.',
        'No se pudo enviar la solicitud en este momento. Llama o envía un mensaje al (864) 450-2954.'
      ), 'error');
      button.disabled = false;
      button.textContent = originalButtonText;
    } finally {
      estimateForm.removeAttribute('aria-busy');
    }
  });
}
