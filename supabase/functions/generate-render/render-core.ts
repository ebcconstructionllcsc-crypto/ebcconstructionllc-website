export const RENDER_MODEL = 'gpt-image-2';
export const PROMPT_VERSION = 'construction-v1';
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const MAX_SCOPE_LENGTH = 1200;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const serviceNames: Record<string, string> = {
  driveway: 'a new concrete driveway',
  patio: 'a new concrete patio',
  sidewalk: 'a new concrete sidewalk or walkway',
  slab: 'a new concrete slab',
  extension: 'a concrete extension connected cleanly to the existing concrete',
  grading: 'the proposed grading and site preparation',
  pavers: 'a new professionally installed paver surface',
  retaining_wall: 'a new retaining wall and the required finished grade',
  landscaping: 'the proposed finished landscaping'
};

const finishNames: Record<string, string> = {
  broom: 'natural gray concrete with a professional broom finish and realistic control joints',
  smooth: 'natural gray concrete with a clean smooth finish and realistic control joints',
  stamped: 'professionally installed stamped concrete with realistic texture and control joints',
  exposed: 'exposed aggregate concrete with a realistic aggregate texture',
  pavers: 'professionally installed interlocking pavers with consistent joints',
  grading: 'properly graded compacted soil with realistic drainage contours',
  custom: 'the material and finish described by the contractor'
};

export type RenderRequest = {
  sourcePath: string;
  sourceMime: string;
  maskPath?: string;
  width: number;
  height: number;
  service: string;
  finish: string;
  color?: string;
  scope: string;
  quality: 'low' | 'high';
  preserveStructures: boolean;
  projectId?: string | null;
  idempotencyKey: string;
};

export type ValidatedRenderRequest = RenderRequest & {
  maskPath: string;
};

export class RenderRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'RenderRequestError';
    this.code = code;
    this.status = status;
  }
}

export function validateRenderRequest(input: Partial<RenderRequest>, userId: string): ValidatedRenderRequest {
  if (!input || typeof input !== 'object') {
    throw new RenderRequestError('invalid_request', 'La solicitud del render no es válida.');
  }

  const sourcePath = String(input.sourcePath || '');
  const maskPath = String(input.maskPath || '');
  const allowedPrefix = `${userId}/`;
  if (!sourcePath.startsWith(allowedPrefix) || sourcePath.includes('..')) {
    throw new RenderRequestError('invalid_source_path', 'La fotografía seleccionada no es válida.');
  }
  if (maskPath && (!maskPath.startsWith(allowedPrefix) || maskPath.includes('..'))) {
    throw new RenderRequestError('invalid_mask_path', 'La selección del área no es válida.');
  }

  const sourceMime = String(input.sourceMime || '').toLowerCase();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(sourceMime)) {
    throw new RenderRequestError('unsupported_image', 'La fotografía debe ser PNG, JPG o WEBP.');
  }

  const width = Math.round(Number(input.width) || 0);
  const height = Math.round(Number(input.height) || 0);
  if (width < 256 || height < 256 || width > 4096 || height > 4096) {
    throw new RenderRequestError('invalid_dimensions', 'La fotografía no tiene dimensiones compatibles.');
  }

  const service = String(input.service || '');
  const finish = String(input.finish || '');
  if (!serviceNames[service]) {
    throw new RenderRequestError('invalid_service', 'Selecciona un tipo de proyecto válido.');
  }
  if (!finishNames[finish]) {
    throw new RenderRequestError('invalid_finish', 'Selecciona un acabado válido.');
  }

  const scope = String(input.scope || '').trim();
  if (scope.length < 10) {
    throw new RenderRequestError('scope_required', 'Describe con más detalle lo que debe cambiar.');
  }
  if (scope.length > MAX_SCOPE_LENGTH) {
    throw new RenderRequestError('scope_too_long', 'La descripción del trabajo es demasiado larga.');
  }

  const quality = input.quality === 'high' ? 'high' : 'low';
  const projectId = input.projectId == null || input.projectId === ''
    ? null
    : String(input.projectId);
  if (projectId && !uuidPattern.test(projectId)) {
    throw new RenderRequestError('invalid_project', 'El proyecto seleccionado no es válido.');
  }
  const idempotencyKey = String(input.idempotencyKey || '');
  if (!uuidPattern.test(idempotencyKey)) {
    throw new RenderRequestError('invalid_idempotency_key', 'No se pudo identificar esta solicitud de render.');
  }

  return {
    sourcePath,
    sourceMime,
    maskPath,
    width,
    height,
    service,
    finish,
    color: String(input.color || '').trim().slice(0, 80),
    scope,
    quality,
    preserveStructures: input.preserveStructures !== false,
    projectId,
    idempotencyKey
  };
}

export function buildConstructionPrompt(input: ValidatedRenderRequest) {
  const preservation = input.preserveStructures
    ? 'Preserve the exact camera position, perspective, house, roof, walls, doors, windows, garage, neighboring properties, mature trees, fences, utilities, and every element outside the selected work area.'
    : 'Preserve the original camera position and overall identity of the property while applying only the requested construction changes.';
  const maskInstruction = input.maskPath
    ? 'The transparent area of the supplied mask identifies the only construction work zone. Keep all opaque-mask areas unchanged.'
    : 'Change only the area clearly required by the described scope. Keep all unrelated areas unchanged.';
  const color = input.color ? `Requested color or material tone: ${input.color}.` : '';

  return [
    'Edit the supplied real jobsite photograph into a high-quality photorealistic conceptual construction preview.',
    `Show ${serviceNames[input.service]} using ${finishNames[input.finish]}.`,
    color,
    `Contractor scope: ${input.scope}`,
    maskInstruction,
    preservation,
    'Make the proposed work look physically connected to the existing site with believable scale, elevations, slopes, drainage direction, edges, transitions, shadows, lighting, surface texture, and surrounding soil restoration.',
    'The finished work should look newly completed, clean, buildable, and professionally installed by an experienced contractor.',
    'Do not add labels, measurements, text, logos, watermarks, workers, vehicles, tools, cones, machinery, decorative objects, or construction debris unless explicitly requested in the contractor scope.',
    'Do not redesign the building or invent major architectural changes. This is a sales visualization, not an engineering or permit drawing.'
  ].filter(Boolean).join('\n');
}

export function outputSize(width: number, height: number, quality: 'low' | 'high') {
  const landscape = width >= height;
  if (quality === 'high') return landscape ? '2048x1152' : '1152x2048';
  return landscape ? '1536x1024' : '1024x1536';
}

export function matchesImageSignature(bytes: Uint8Array, mime: string) {
  if (mime === 'image/png') {
    return bytes.length > 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (mime === 'image/jpeg') {
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === 'image/webp') {
    return bytes.length > 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

export function publicError(code: string) {
  const messages: Record<string, string> = {
    moderation_blocked: 'La solicitud o la imagen no pasó la revisión de seguridad. Ajusta la descripción y vuelve a intentarlo.',
    rate_limit_exceeded: 'Se alcanzó el límite temporal de renders. Espera unos minutos e inténtalo nuevamente.',
    render_limit_reached: 'Se alcanzó el límite diario de renders configurado para la cuenta.',
    insufficient_quota: 'La cuenta de imágenes necesita saldo o un límite de gasto disponible.',
    invalid_api_key: 'La conexión de imágenes todavía no está configurada correctamente.',
    render_not_configured: 'El servicio de render todavía no está activado.',
    image_generation_user_error: 'La imagen o las instrucciones deben ajustarse antes de generar el render.'
  };
  return messages[code] || 'No se pudo generar el render en este momento. Inténtalo nuevamente.';
}
