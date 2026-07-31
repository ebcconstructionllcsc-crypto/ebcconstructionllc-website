((root) => {
  const COPY = {
    en: {
      title: 'SITE IMPROVEMENT PROPOSAL',
      summaryPrefix: 'EBC Construction LLC proposes a coordinated construction package for',
      noAddress: 'the project location shown in this proposal',
      included: [
        'Field layout, measurements, elevation verification, and work-area coordination.',
        'Normal mobilization, standard equipment, deliveries, and final jobsite cleanup for the listed scope.',
        'Standard materials and installation practices appropriate for the priced work items.',
        'Final quantities and field conditions will be verified before construction begins.'
      ],
      exclusions: [
        'Permits, permit fees, inspections, survey or plat work, structural engineering, architectural services, and HOA approvals unless specifically listed.',
        'Unknown utilities, private lines, unsuitable soil, buried debris, groundwater, contaminated material, and rock excavation.',
        'Repairs to concealed or pre-existing conditions discovered after demolition or excavation.',
        'Work outside the written scope requires a signed change order.'
      ],
      assumptions: [
        'The owner will clear movable belongings from the work and access areas before mobilization.',
        'Normal machine access and standard concrete or material delivery access are available.',
        'Final dimensions, elevations, property lines, and utility locations will be verified before construction.',
        'Schedule is subject to weather, access, inspections, material availability, and approved change orders.'
      ],
      schedule: 'Work will be scheduled after a separate construction agreement is signed and the required initial payment clears.',
      discount: 'Coordinating the listed work as one project may reduce repeated mobilization, equipment, labor setup, and delivery costs. The written totals and discounts shown in this proposal control.',
      acceptance: 'By signing below, the client accepts this proposal as the basis for preparing a separate construction agreement. The construction agreement will control final scope, specifications, payment terms, change orders, warranty, schedule, and responsibilities. This proposal alone is not authorization to begin work.'
    },
    es: {
      title: 'PROPUESTA DE MEJORAS DEL PROYECTO',
      summaryPrefix: 'EBC Construction LLC propone un paquete coordinado de construcción para',
      noAddress: 'la ubicación indicada en esta propuesta',
      included: [
        'Trazado de campo, medidas, verificación de elevaciones y coordinación del área de trabajo.',
        'Movilización normal, equipo estándar, entregas y limpieza final para el alcance cotizado.',
        'Materiales estándar y prácticas de instalación apropiadas para los conceptos cotizados.',
        'Las cantidades finales y las condiciones del terreno se verificarán antes de comenzar.'
      ],
      exclusions: [
        'Permisos, tarifas, inspecciones, levantamientos, ingeniería estructural, arquitectura y aprobaciones de HOA, salvo que se indiquen por escrito.',
        'Servicios desconocidos, líneas privadas, suelo inadecuado, escombros enterrados, agua subterránea, material contaminado y excavación en roca.',
        'Reparaciones de condiciones ocultas o preexistentes descubiertas después de demolición o excavación.',
        'Todo trabajo fuera del alcance escrito requiere una orden de cambio firmada.'
      ],
      assumptions: [
        'El propietario retirará pertenencias movibles de las áreas de trabajo y acceso antes de la movilización.',
        'Existe acceso normal para maquinaria y entregas estándar de concreto o materiales.',
        'Las dimensiones, elevaciones, líneas de propiedad y servicios se verificarán antes de construir.',
        'El calendario está sujeto al clima, acceso, inspecciones, disponibilidad de materiales y cambios aprobados.'
      ],
      schedule: 'El trabajo se programará después de firmar un contrato de construcción separado y acreditarse el primer pago requerido.',
      discount: 'Coordinar los trabajos como un solo proyecto puede reducir movilizaciones, preparación de equipo, mano de obra y entregas repetidas. Los totales y descuentos escritos en esta propuesta controlan.',
      acceptance: 'Al firmar, el cliente acepta esta propuesta como base para preparar un contrato de construcción separado. El contrato controlará el alcance final, especificaciones, pagos, cambios, garantía, calendario y responsabilidades. Esta propuesta por sí sola no autoriza el inicio del trabajo.'
    }
  };

  function number(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function safeText(value, fallback = '') {
    return String(value ?? fallback).trim();
  }

  function parsePoints(value) {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(point => Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)))
        .map(point => ({ x: Math.max(0, number(point.x)), y: Math.max(0, number(point.y)) }));
    } catch {
      return [];
    }
  }

  function normalizeLines(value, fallback = []) {
    const lines = Array.isArray(value)
      ? value
      : String(value || '').split(/\r?\n/);
    const cleaned = lines
      .map(line => safeText(line).replace(/^[-*•]\s*/, ''))
      .filter(Boolean);
    return cleaned.length ? cleaned : [...fallback];
  }

  function planGeometry(fields) {
    const shape = fields['plan-shape'] || 'rectangle';
    const a = Math.max(0, number(fields['plan-a'] ?? fields.length));
    const b = Math.max(0, number(fields['plan-b'] ?? fields.width));
    const c = Math.min(a, Math.max(0, number(fields['plan-c'])));
    const d = Math.min(b, Math.max(0, number(fields['plan-d'])));
    const custom = parsePoints(fields['plan-points']);

    if (shape === 'freeform' && custom.length >= 2) {
      return { shape, points: custom, closed: fields['plan-closed'] === true || fields['plan-closed'] === 'true' };
    }
    if (shape === 'lshape') {
      return {
        shape,
        closed: true,
        points: [
          { x: 0, y: 0 },
          { x: a, y: 0 },
          { x: a, y: Math.max(0, b - d) },
          { x: Math.max(0, a - c), y: Math.max(0, b - d) },
          { x: Math.max(0, a - c), y: b },
          { x: 0, y: b }
        ]
      };
    }
    return {
      shape: 'rectangle',
      closed: true,
      points: [
        { x: 0, y: 0 },
        { x: a, y: 0 },
        { x: a, y: b },
        { x: 0, y: b }
      ]
    };
  }

  function polygonArea(points) {
    if (points.length < 3) return 0;
    return Math.abs(points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0)) / 2;
  }

  function polygonPerimeter(points, closed = true) {
    if (points.length < 2) return 0;
    const limit = closed ? points.length : points.length - 1;
    let total = 0;
    for (let index = 0; index < limit; index += 1) {
      const next = points[(index + 1) % points.length];
      total += Math.hypot(next.x - points[index].x, next.y - points[index].y);
    }
    return total;
  }

  function normalizeDraft(raw = {}) {
    const fields = raw?.fields && typeof raw.fields === 'object' ? raw.fields : {};
    const language = fields['quote-language'] === 'es' ? 'es' : 'en';
    const items = Array.isArray(raw?.items)
      ? raw.items.map((item, index) => ({
          key: safeText(item?.key),
          title: safeText(item?.title || item?.description, language === 'es' ? `Concepto ${index + 1}` : `Item ${index + 1}`),
          description: safeText(item?.description),
          qty: Math.max(0, number(item?.qty)),
          unit: safeText(item?.unit, 'lump sum'),
          rate: Math.max(0, number(item?.rate))
        }))
      : [];
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const discount = Math.max(0, number(fields.discount));
    const taxable = Math.max(0, subtotal - discount);
    const taxRate = Math.max(0, number(fields.tax));
    const taxAmount = taxable * taxRate / 100;
    const total = taxable + taxAmount;
    const payments = ['payment-1', 'payment-2', 'payment-3']
      .map(key => Math.max(0, number(fields[key])));
    const geometry = planGeometry(fields);
    const area = geometry.closed ? polygonArea(geometry.points) : 0;
    const perimeter = polygonPerimeter(geometry.points, geometry.closed);

    return {
      raw,
      fields,
      language,
      quoteNumber: safeText(fields['quote-number']),
      issueDate: safeText(fields['quote-date']),
      validThrough: safeText(fields['valid-through']),
      status: safeText(fields['quote-status'], language === 'es' ? 'Borrador' : 'Draft'),
      clientName: safeText(fields['client-name']),
      clientPhone: safeText(fields['client-phone']),
      clientEmail: safeText(fields['client-email']),
      projectAddress: safeText(fields['project-address']),
      finish: safeText(fields['plan-finish'], 'Broom finish'),
      thickness: Math.max(0, number(fields.thickness)),
      waste: Math.max(0, number(fields['plan-waste'])),
      baseDepth: Math.max(0, number(fields['base-depth'])),
      notes: safeText(fields.notes),
      items,
      subtotal,
      discount,
      taxable,
      taxRate,
      taxAmount,
      total,
      payments,
      geometry,
      area,
      perimeter
    };
  }

  function packageCards(draft) {
    return draft.items.map((item, index) => ({
      key: item.key || `package-${index + 1}`,
      title: item.title,
      description: item.description,
      quantity: `${item.qty || 0} ${item.unit}`.trim(),
      amount: item.qty * item.rate
    }));
  }

  function paymentRows(draft) {
    const labels = draft.language === 'es'
      ? ['Anticipo al firmar / programar', 'Pago de avance', 'Pago final']
      : ['Contract signing / scheduling deposit', 'Progress payment', 'Final payment'];
    return draft.payments
      .map((percentage, index) => ({
        sequence: index + 1,
        label: labels[index],
        percentage,
        amount: draft.total * percentage / 100
      }))
      .filter(row => row.percentage > 0);
  }

  function defaultSummary(draft) {
    const copy = COPY[draft.language];
    const location = draft.projectAddress || copy.noAddress;
    const packages = draft.items.map(item => item.title).filter(Boolean);
    const scope = packages.length
      ? packages.join(', ')
      : draft.language === 'es' ? 'los trabajos cotizados' : 'the priced work';
    return `${copy.summaryPrefix} ${location}, consisting of ${scope}. Final dimensions, quantities, access, drainage, and field conditions will be verified before construction.`;
  }

  function buildProposalModel(raw = {}, overrides = {}) {
    const draft = normalizeDraft(raw);
    const copy = COPY[draft.language];
    return {
      ...draft,
      title: safeText(overrides.title, copy.title),
      preparedBy: safeText(overrides.preparedBy, 'Edgar Bolaños Aguilar'),
      summary: safeText(overrides.summary, defaultSummary(draft)),
      discountNarrative: safeText(overrides.discountNarrative, copy.discount),
      includedScope: normalizeLines(overrides.includedScope, copy.included),
      exclusions: normalizeLines(overrides.exclusions, copy.exclusions),
      assumptions: normalizeLines(overrides.assumptions, copy.assumptions),
      scheduleNote: safeText(overrides.scheduleNote, copy.schedule),
      acceptance: safeText(overrides.acceptance, copy.acceptance),
      packages: packageCards(draft),
      paymentRows: paymentRows(draft)
    };
  }

  root.EbcProposalCore = {
    COPY,
    normalizeLines,
    parsePoints,
    planGeometry,
    polygonArea,
    polygonPerimeter,
    normalizeDraft,
    packageCards,
    paymentRows,
    buildProposalModel
  };
})(typeof window === 'undefined' ? globalThis : window);
