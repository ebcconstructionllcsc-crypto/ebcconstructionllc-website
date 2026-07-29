(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EBCRenderCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const maxSide = 1600;

  function scaledDimensions(width, height, limit = maxSide) {
    const largest = Math.max(width, height);
    const scale = largest > limit ? limit / largest : 1;
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  function renderRequest(values, userId, idempotencyKey, dimensions) {
    const prefix = `${userId}/${idempotencyKey}`;
    return {
      sourcePath: `${prefix}/source.png`,
      sourceMime: 'image/png',
      maskPath: values.hasMask ? `${prefix}/mask.png` : '',
      width: dimensions.width,
      height: dimensions.height,
      service: values.service,
      finish: values.finish,
      color: values.color.trim(),
      scope: values.scope.trim(),
      quality: values.quality === 'high' ? 'high' : 'low',
      preserveStructures: values.preserveStructures !== false,
      projectId: values.projectId || null,
      idempotencyKey
    };
  }

  function errorMessage(error) {
    const code = error?.context?.body?.error?.code || error?.code || '';
    const message = error?.context?.body?.error?.message || error?.message || '';
    if (code === 'render_in_progress') return 'Este render ya se está procesando. Espera un momento antes de revisar.';
    if (code === 'render_limit_reached') return 'Se alcanzó el límite diario configurado.';
    if (code === 'insufficient_quota') return 'La cuenta de imágenes necesita saldo o un límite de gasto disponible.';
    if (code === 'render_not_configured') return 'El generador todavía no está activado en el servidor.';
    return message || 'No se pudo generar el render. Revisa la imagen y vuelve a intentarlo con una solicitud nueva.';
  }

  return { maxSide, scaledDimensions, renderRequest, errorMessage };
});
