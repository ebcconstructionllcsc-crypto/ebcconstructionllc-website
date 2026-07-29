import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  MAX_SOURCE_BYTES,
  PROMPT_VERSION,
  RENDER_MODEL,
  RenderRequestError,
  buildConstructionPrompt,
  matchesImageSignature,
  outputSize,
  publicError,
  validateRenderRequest
} from './render-core.ts';

const INPUT_BUCKET = 'render-inputs';
const OUTPUT_BUCKET = 'project-renders';
const defaultOrigins = [
  'https://ebcconstructionllcsc-crypto.github.io',
  'https://ebcconcrete.com',
  'https://www.ebcconcrete.com'
];

function allowedOrigins() {
  return new Set(
    (Deno.env.get('RENDER_ALLOWED_ORIGINS') || defaultOrigins.join(','))
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  );
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins().has(origin) ? origin : defaultOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'Vary': 'Origin'
  };
}

function json(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function safeOpenAIError(payload: Record<string, any>, status: number) {
  const error = payload?.error || {};
  const code = String(error.code || error.type || (status === 429 ? 'rate_limit_exceeded' : 'render_failed'));
  return { code, message: publicError(code) };
}

function completedPayload(job: Record<string, any>, signedUrl: string) {
  return {
    data: {
      jobId: job.id,
      url: signedUrl,
      path: job.output_storage_path,
      mime: 'image/jpeg',
      model: job.model || RENDER_MODEL,
      quality: job.quality,
      conceptual: true
    }
  };
}

Deno.serve(async request => {
  const origin = request.headers.get('Origin');
  const allowed = !origin || allowedOrigins().has(origin);

  if (request.method === 'OPTIONS') {
    return allowed
      ? new Response('ok', { headers: corsHeaders(origin) })
      : json(origin, { error: { code: 'origin_not_allowed', message: 'Origen no autorizado.' } }, 403);
  }
  if (!allowed) return json(origin, { error: { code: 'origin_not_allowed', message: 'Origen no autorizado.' } }, 403);
  if (request.method !== 'POST') {
    return json(origin, { error: { code: 'method_not_allowed', message: 'Método no permitido.' } }, 405);
  }
  if (Number(request.headers.get('content-length') || 0) > 1024 * 1024) {
    return json(origin, { error: { code: 'request_too_large', message: 'La solicitud es demasiado grande.' } }, 413);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !openAIKey) {
    return json(origin, { error: { code: 'render_not_configured', message: publicError('render_not_configured') } }, 503);
  }

  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return json(origin, { error: { code: 'not_authenticated', message: 'Inicia sesión para generar un render.' } }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false }
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return json(origin, { error: { code: 'invalid_session', message: 'La sesión ya no es válida.' } }, 401);
  }

  const { data: staff, error: staffError } = await userClient
    .from('staff_profiles')
    .select('is_active')
    .eq('user_id', user.id)
    .maybeSingle();
  if (staffError || !staff?.is_active) {
    return json(origin, {
      error: { code: 'staff_access_required', message: 'Tu cuenta no tiene acceso activo de personal.' }
    }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  let input;
  try {
    input = validateRenderRequest(await request.json(), user.id);
  } catch (error) {
    if (error instanceof RenderRequestError) {
      return json(origin, { error: { code: error.code, message: error.message } }, error.status);
    }
    return json(origin, { error: { code: 'invalid_json', message: 'La solicitud no se pudo leer.' } }, 400);
  }

  const { data: duplicate, error: duplicateError } = await admin
    .from('render_jobs')
    .select('*')
    .eq('user_id', user.id)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (duplicateError) {
    console.error('render_job_lookup_failed', duplicateError.code);
    return json(origin, { error: { code: 'render_not_configured', message: publicError('render_not_configured') } }, 503);
  }
  if (duplicate?.status === 'completed' && duplicate.output_storage_path) {
    const { data: signed } = await admin.storage.from(OUTPUT_BUCKET)
      .createSignedUrl(duplicate.output_storage_path, 3600);
    if (signed?.signedUrl) return json(origin, completedPayload(duplicate, signed.signedUrl));
  }
  if (duplicate?.status === 'processing') {
    return json(origin, {
      error: { code: 'render_in_progress', message: 'Este render ya se está generando. Espera un momento.' }
    }, 409);
  }
  if (duplicate) {
    return json(origin, {
      error: {
        code: duplicate.error_code || 'render_failed',
        message: 'Esta solicitud ya terminó sin resultado. Crea una solicitud nueva para volver a intentarlo.'
      }
    }, 409);
  }

  const dailyLimit = Math.max(1, Number(Deno.env.get('RENDER_DAILY_LIMIT') || 20));
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await admin
    .from('render_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', dayStart.toISOString());
  if (countError) {
    console.error('render_jobs_count_failed', countError.code);
    return json(origin, { error: { code: 'render_not_configured', message: publicError('render_not_configured') } }, 503);
  }
  if ((count || 0) >= dailyLimit) {
    return json(origin, { error: { code: 'render_limit_reached', message: publicError('render_limit_reached') } }, 429);
  }

  const { data: sourceBlob, error: sourceError } = await admin.storage.from(INPUT_BUCKET).download(input.sourcePath);
  const maskDownload = input.maskPath
    ? await admin.storage.from(INPUT_BUCKET).download(input.maskPath)
    : { data: null, error: null };
  if (sourceError || !sourceBlob || maskDownload.error) {
    return json(origin, { error: { code: 'render_input_missing', message: 'No se pudo leer la fotografía o el área marcada.' } }, 400);
  }
  const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
  const maskBytes = maskDownload.data ? new Uint8Array(await maskDownload.data.arrayBuffer()) : null;
  if (sourceBytes.byteLength > MAX_SOURCE_BYTES || (maskBytes?.byteLength || 0) > MAX_SOURCE_BYTES) {
    return json(origin, { error: { code: 'image_too_large', message: 'La fotografía o la máscara exceden el tamaño permitido.' } }, 413);
  }
  if (!matchesImageSignature(sourceBytes, input.sourceMime) || (maskBytes && !matchesImageSignature(maskBytes, 'image/png'))) {
    return json(origin, { error: { code: 'unsupported_image', message: 'El archivo no corresponde a una imagen válida.' } }, 400);
  }

  const prompt = buildConstructionPrompt(input);
  const { data: job, error: jobError } = await admin.from('render_jobs').insert({
    user_id: user.id,
    project_id: input.projectId,
    source_storage_path: input.sourcePath,
    mask_storage_path: input.maskPath || null,
    service: input.service,
    finish: input.finish,
    quality: input.quality,
    status: 'processing',
    model: RENDER_MODEL,
    prompt_version: PROMPT_VERSION,
    idempotency_key: input.idempotencyKey,
    source_bytes: sourceBytes.byteLength,
    has_mask: Boolean(maskBytes)
  }).select('id').single();
  if (jobError || !job) {
    console.error('render_job_insert_failed', jobError?.code);
    return json(origin, { error: { code: 'render_not_configured', message: publicError('render_not_configured') } }, 503);
  }

  try {
    const form = new FormData();
    const extension = input.sourceMime === 'image/png' ? 'png' : input.sourceMime === 'image/webp' ? 'webp' : 'jpg';
    form.append('model', RENDER_MODEL);
    form.append('image[]', new Blob([sourceBytes], { type: input.sourceMime }), `jobsite.${extension}`);
    if (maskBytes) form.append('mask', new Blob([maskBytes], { type: 'image/png' }), 'work-area-mask.png');
    form.append('prompt', prompt);
    form.append('quality', input.quality);
    form.append('size', outputSize(input.width, input.height, input.quality));
    form.append('output_format', 'jpeg');
    form.append('output_compression', input.quality === 'high' ? '90' : '82');
    form.append('moderation', 'auto');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240_000);
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAIKey}` },
        body: form,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const requestId = response.headers.get('x-request-id') || '';
    const payload = await response.json();
    if (!response.ok || !payload?.data?.[0]?.b64_json) {
      const openAIError = safeOpenAIError(payload, response.status);
      await admin.from('render_jobs').update({
        status: 'failed',
        error_code: openAIError.code,
        request_id: requestId || null,
        completed_at: new Date().toISOString()
      }).eq('id', job.id);
      console.error('openai_render_failed', response.status, openAIError.code, requestId);
      return json(origin, { error: openAIError }, response.status >= 500 ? 502 : response.status);
    }

    const resultBytes = decodeBase64(String(payload.data[0].b64_json));
    const outputPath = `${user.id}/${input.projectId || 'general'}/${job.id}.jpg`;
    const { error: uploadError } = await admin.storage.from(OUTPUT_BUCKET).upload(outputPath, resultBytes, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) {
      await admin.from('render_jobs').update({
        status: 'failed',
        error_code: 'output_storage_failed',
        output_bytes: resultBytes.byteLength,
        request_id: requestId || null,
        completed_at: new Date().toISOString()
      }).eq('id', job.id);
      console.error('render_output_storage_failed', uploadError.message, requestId);
      return json(origin, {
        error: {
          code: 'output_storage_failed',
          message: 'El render se generó, pero no pudo guardarse. No lo reenvíes automáticamente; revisa la configuración.'
        }
      }, 503);
    }

    await admin.from('render_jobs').update({
      status: 'completed',
      output_storage_path: outputPath,
      output_bytes: resultBytes.byteLength,
      request_id: requestId || null,
      completed_at: new Date().toISOString()
    }).eq('id', job.id);
    const { data: signed, error: signedError } = await admin.storage.from(OUTPUT_BUCKET)
      .createSignedUrl(outputPath, 3600);
    if (signedError || !signed?.signedUrl) {
      return json(origin, {
        error: { code: 'signed_url_failed', message: 'El render quedó guardado, pero no pudo abrirse en este momento.' }
      }, 503);
    }
    return json(origin, completedPayload({
      id: job.id,
      output_storage_path: outputPath,
      quality: input.quality,
      model: RENDER_MODEL
    }, signed.signedUrl));
  } catch (error) {
    const code = error instanceof DOMException && error.name === 'AbortError' ? 'render_timeout' : 'render_failed';
    await admin.from('render_jobs').update({
      status: 'failed',
      error_code: code,
      completed_at: new Date().toISOString()
    }).eq('id', job.id);
    console.error('render_exception', code, error instanceof Error ? error.message : 'unknown');
    return json(origin, {
      error: {
        code,
        message: code === 'render_timeout'
          ? 'El render tardó demasiado. Revisa el historial antes de crear una solicitud nueva.'
          : publicError(code)
      }
    }, 502);
  }
});
