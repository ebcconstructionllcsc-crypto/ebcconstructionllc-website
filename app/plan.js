(() => {
  const $ = selector => document.querySelector(selector);
  const {
    polygonArea,
    distance,
    polygonPerimeter,
    materialTakeoff
  } = window.EbcPlanMath;
  const elements = {
    shape: $('#plan-shape'),
    a: $('#plan-a'),
    b: $('#plan-b'),
    c: $('#plan-c'),
    d: $('#plan-d'),
    thickness: $('#thickness'),
    finish: $('#plan-finish'),
    waste: $('#plan-waste'),
    baseDepth: $('#base-depth'),
    gridSize: $('#plan-grid-size'),
    storedPoints: $('#plan-points'),
    storedClosed: $('#plan-closed'),
    canvas: $('#plan-canvas'),
    print: $('#quote-plan-canvas'),
    area: $('#area'),
    yards: $('#yards'),
    orderYards: $('#order-yards'),
    baseYards: $('#base-yards'),
    perimeter: $('#perimeter'),
    label: $('#p-plan-label'),
    length: $('#length'),
    width: $('#width'),
    language: $('#quote-language'),
    tools: $('#freeform-tools'),
    status: $('#plan-draw-status'),
    useTakeoff: $('#use-plan-area')
  };

  const GRID_PIXELS = 50;
  const GRID_PADDING = 50;
  let mode = '2d';
  let freeformPoints = [];
  let freeformClosed = false;
  let draggingIndex = null;

  function number(element) {
    return Math.max(0, Number(element?.value) || 0);
  }

  function language() {
    return elements.language?.value === 'es' ? 'es' : 'en';
  }

  function isFreeform() {
    return elements.shape.value === 'freeform';
  }

  function templatePoints(measurement) {
    if (!measurement.isL) {
      return [
        { x: 0, y: 0 },
        { x: measurement.a, y: 0 },
        { x: measurement.a, y: measurement.b },
        { x: 0, y: measurement.b }
      ];
    }
    return [
      { x: 0, y: 0 },
      { x: measurement.a, y: 0 },
      { x: measurement.a, y: measurement.b - measurement.d },
      { x: measurement.a - measurement.c, y: measurement.b - measurement.d },
      { x: measurement.a - measurement.c, y: measurement.b },
      { x: 0, y: measurement.b }
    ];
  }

  function metrics() {
    const a = number(elements.a);
    const b = number(elements.b);
    const c = Math.min(number(elements.c), a);
    const d = Math.min(number(elements.d), b);
    const thickness = number(elements.thickness);
    const waste = number(elements.waste);
    const baseDepth = number(elements.baseDepth);
    const custom = isFreeform();
    const isL = elements.shape.value === 'lshape';
    let width = a;
    let height = b;
    let area = Math.max(0, isL ? a * b - c * d : a * b);
    let perimeter = 2 * (a + b);
    let points = [];
    let ready = area > 0;

    if (custom) {
      points = freeformPoints.map(point => ({ ...point }));
      ready = freeformClosed && points.length >= 3 && polygonArea(points) > 0;
      area = ready ? polygonArea(points) : 0;
      perimeter = polygonPerimeter(points, freeformClosed);
      if (points.length) {
        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        width = Math.max(...xs) - Math.min(...xs);
        height = Math.max(...ys) - Math.min(...ys);
      } else {
        width = 0;
        height = 0;
      }
    }

    const takeoff = materialTakeoff({ area, perimeter, thickness, waste, baseDepth });
    return {
      a,
      b,
      c,
      d,
      width,
      height,
      thickness,
      waste,
      baseDepth,
      custom,
      isL,
      area,
      perimeter,
      yards: takeoff.yards,
      orderYards: takeoff.orderYards,
      baseYards: takeoff.baseYards,
      points,
      ready
    };
  }

  function clear(context, width, height) {
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#f6f2ea';
    context.fillRect(0, 0, width, height);
  }

  function finishColor() {
    if (elements.finish.value.includes('Stamped')) return '#b48a56';
    if (elements.finish.value.includes('Gravel')) return '#9a9488';
    if (elements.finish.value.includes('Smooth')) return '#bfc3c5';
    return '#c8c4bb';
  }

  function tracePolygon(context, points, { fill = true, close = true } = {}) {
    if (!points.length) return;
    context.beginPath();
    points.forEach((point, index) => {
      if (index) context.lineTo(point.x, point.y);
      else context.moveTo(point.x, point.y);
    });
    if (close) context.closePath();
    if (fill && close) {
      context.fillStyle = finishColor();
      context.globalAlpha = 0.82;
      context.fill();
      context.globalAlpha = 1;
    }
    context.strokeStyle = '#2c2822';
    context.lineWidth = 3;
    context.setLineDash(close ? [] : [9, 6]);
    context.stroke();
    context.setLineDash([]);
  }

  function fitPoints(points, width, height, padding = 70) {
    if (!points.length) return [];
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const scale = Math.min(
      (width - padding * 2) / Math.max(maxX - minX, 1),
      (height - padding * 2) / Math.max(maxY - minY, 1)
    );
    const usedWidth = (maxX - minX) * scale;
    const usedHeight = (maxY - minY) * scale;
    const offsetX = (width - usedWidth) / 2;
    const offsetY = (height - usedHeight) / 2;
    return points.map(point => ({
      x: offsetX + (point.x - minX) * scale,
      y: offsetY + (point.y - minY) * scale
    }));
  }

  function drawGrid(context, width, height) {
    const unit = number(elements.gridSize) || 5;
    context.strokeStyle = 'rgba(90,80,65,.15)';
    context.lineWidth = 1;
    for (let x = GRID_PADDING; x <= width - GRID_PADDING; x += GRID_PIXELS) {
      context.beginPath();
      context.moveTo(x, GRID_PADDING);
      context.lineTo(x, height - GRID_PADDING);
      context.stroke();
    }
    for (let y = GRID_PADDING; y <= height - GRID_PADDING; y += GRID_PIXELS) {
      context.beginPath();
      context.moveTo(GRID_PADDING, y);
      context.lineTo(width - GRID_PADDING, y);
      context.stroke();
    }
    context.fillStyle = '#777168';
    context.font = '700 13px Arial';
    context.textAlign = 'left';
    context.fillText(`${unit} ft`, GRID_PADDING + 8, GRID_PADDING - 14);
    context.beginPath();
    context.moveTo(GRID_PADDING, GRID_PADDING - 9);
    context.lineTo(GRID_PADDING + GRID_PIXELS, GRID_PADDING - 9);
    context.strokeStyle = '#8a6728';
    context.lineWidth = 3;
    context.stroke();
  }

  function worldToCanvas(point) {
    const pixelsPerFoot = GRID_PIXELS / (number(elements.gridSize) || 5);
    return {
      x: GRID_PADDING + point.x * pixelsPerFoot,
      y: GRID_PADDING + point.y * pixelsPerFoot
    };
  }

  function canvasToWorld(event) {
    const rect = elements.canvas.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left) * (elements.canvas.width / rect.width);
    const canvasY = (event.clientY - rect.top) * (elements.canvas.height / rect.height);
    const unit = number(elements.gridSize) || 5;
    const pixelsPerFoot = GRID_PIXELS / unit;
    const maxX = (elements.canvas.width - GRID_PADDING * 2) / pixelsPerFoot;
    const maxY = (elements.canvas.height - GRID_PADDING * 2) / pixelsPerFoot;
    return {
      x: Math.min(maxX, Math.max(0, Math.round((canvasX - GRID_PADDING) / pixelsPerFoot))),
      y: Math.min(maxY, Math.max(0, Math.round((canvasY - GRID_PADDING) / pixelsPerFoot)))
    };
  }

  function drawSegmentLabels(context, displayPoints, worldPoints, closed) {
    const limit = closed ? worldPoints.length : Math.max(0, worldPoints.length - 1);
    context.font = '700 13px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (let index = 0; index < limit; index += 1) {
      const next = (index + 1) % worldPoints.length;
      const firstDisplay = displayPoints[index];
      const secondDisplay = displayPoints[next];
      const label = `${distance(worldPoints[index], worldPoints[next]).toFixed(1)} ft`;
      const x = (firstDisplay.x + secondDisplay.x) / 2;
      const y = (firstDisplay.y + secondDisplay.y) / 2;
      const width = context.measureText(label).width + 12;
      context.fillStyle = 'rgba(255,255,255,.9)';
      context.fillRect(x - width / 2, y - 10, width, 20);
      context.fillStyle = '#5d4a27';
      context.fillText(label, x, y);
    }
  }

  function drawFreeform2D(context, width, height, measurement) {
    clear(context, width, height);
    drawGrid(context, width, height);
    const displayPoints = measurement.points.map(worldToCanvas);
    tracePolygon(context, displayPoints, {
      fill: freeformClosed,
      close: freeformClosed
    });
    drawSegmentLabels(context, displayPoints, measurement.points, freeformClosed);

    displayPoints.forEach((point, index) => {
      context.beginPath();
      context.arc(point.x, point.y, index === 0 ? 9 : 7, 0, Math.PI * 2);
      context.fillStyle = index === 0 ? '#c89a48' : '#11110f';
      context.fill();
      context.strokeStyle = '#fff';
      context.lineWidth = 2;
      context.stroke();
    });

    if (!displayPoints.length) {
      context.fillStyle = '#5f5a52';
      context.font = '700 20px Arial';
      context.textAlign = 'center';
      context.fillText('Toca el plano para colocar la primera esquina', width / 2, height / 2);
    }
  }

  function drawTemplate2D(context, width, height, measurement) {
    clear(context, width, height);
    const worldPoints = templatePoints(measurement);
    const displayPoints = fitPoints(worldPoints, width, height);
    tracePolygon(context, displayPoints);
    drawSegmentLabels(context, displayPoints, worldPoints, true);
    context.fillStyle = '#111';
    context.font = '700 22px Arial';
    context.textAlign = 'center';
    context.fillText(`${measurement.area.toFixed(1)} SQ FT`, width / 2, height / 2);
  }

  function isoPoint(x, y, z, centerX, centerY, scale) {
    return {
      x: centerX + (x - y) * scale,
      y: centerY + (x + y) * scale * 0.48 - z * scale
    };
  }

  function draw3D(context, width, height, measurement) {
    clear(context, width, height);
    let base = measurement.custom ? measurement.points : templatePoints(measurement);
    if (!measurement.ready || base.length < 3) {
      drawFreeform2D(context, width, height, measurement);
      return;
    }

    const minX = Math.min(...base.map(point => point.x));
    const minY = Math.min(...base.map(point => point.y));
    base = base.map(point => ({ x: point.x - minX, y: point.y - minY }));
    const maxX = Math.max(...base.map(point => point.x), 1);
    const maxY = Math.max(...base.map(point => point.y), 1);
    const scale = Math.min(width / (Math.max(maxX, maxY) * 3), height / (Math.max(maxX, maxY) * 2.2));
    const centerX = width / 2;
    const centerY = height * 0.32;
    const depthFeet = Math.max(0.5, measurement.thickness / 12);
    const top = base.map(point => isoPoint(point.x, point.y, depthFeet, centerX, centerY, scale));
    const bottom = base.map(point => isoPoint(point.x, point.y, 0, centerX, centerY, scale));

    for (let index = 0; index < base.length; index += 1) {
      const next = (index + 1) % base.length;
      context.beginPath();
      [top[index], top[next], bottom[next], bottom[index]].forEach((point, pointIndex) => {
        if (pointIndex) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
      });
      context.closePath();
      context.fillStyle = '#8f8a80';
      context.fill();
      context.strokeStyle = '#625d55';
      context.lineWidth = 2;
      context.stroke();
    }

    tracePolygon(context, top);
    context.fillStyle = '#111';
    context.font = '700 20px Arial';
    context.textAlign = 'center';
    context.fillText(
      `${measurement.area.toFixed(1)} SQ FT · ${measurement.thickness} IN`,
      width / 2,
      height - 34
    );
  }

  function shapeLabel(measurement, lang) {
    if (measurement.custom) return lang === 'es' ? 'Forma libre' : 'Custom shape';
    if (measurement.isL) return lang === 'es' ? 'Forma L' : 'L-shaped';
    return lang === 'es' ? 'Rectangular' : 'Rectangular';
  }

  function updateStatus(measurement) {
    if (!measurement.custom) return;
    const points = measurement.points.length;
    if (measurement.ready) {
      elements.status.textContent = `Forma cerrada · ${points} puntos · ${measurement.area.toFixed(1)} sq ft. Puedes arrastrar cualquier punto para corregirla.`;
    } else if (points >= 3) {
      elements.status.textContent = `${points} puntos agregados. Toca el punto dorado o presiona “Cerrar forma” para calcular el takeoff.`;
    } else if (points) {
      elements.status.textContent = `${points} de 3 puntos mínimos. Continúa agregando esquinas.`;
    } else {
      elements.status.textContent = 'Agrega por lo menos 3 esquinas para crear el área.';
    }
  }

  function render() {
    const custom = isFreeform();
    document.querySelectorAll('.preset-only').forEach(element => {
      element.hidden = custom;
    });
    document.querySelectorAll('.l-only').forEach(element => {
      element.hidden = custom || elements.shape.value !== 'lshape';
    });
    document.querySelectorAll('.freeform-only').forEach(element => {
      element.hidden = !custom;
    });
    elements.tools.hidden = !custom;

    const measurement = metrics();
    const lang = language();
    const label = shapeLabel(measurement, lang);
    elements.length.value = measurement.width;
    elements.width.value = measurement.height;
    elements.area.textContent = `${measurement.area.toFixed(1)} sq ft`;
    elements.yards.textContent = `${measurement.yards.toFixed(2)} yd³`;
    elements.orderYards.textContent = `${measurement.orderYards.toFixed(2)} yd³`;
    elements.baseYards.textContent = `${measurement.baseYards.toFixed(2)} yd³`;
    elements.perimeter.textContent = `${measurement.perimeter.toFixed(1)} linear ft`;
    elements.useTakeoff.disabled = !measurement.ready;
    elements.label.textContent = `${label} · ${measurement.area.toFixed(1)} sq ft · ${measurement.orderYards.toFixed(2)} yd³ a ordenar`;
    updateStatus(measurement);

    if (mode === '3d') {
      draw3D(elements.canvas.getContext('2d'), elements.canvas.width, elements.canvas.height, measurement);
    } else if (custom) {
      drawFreeform2D(elements.canvas.getContext('2d'), elements.canvas.width, elements.canvas.height, measurement);
    } else {
      drawTemplate2D(elements.canvas.getContext('2d'), elements.canvas.width, elements.canvas.height, measurement);
    }
    draw3D(elements.print.getContext('2d'), elements.print.width, elements.print.height, measurement);

    const summary = lang === 'es'
      ? `Takeoff: ${label} · ${measurement.area.toFixed(1)} sq ft · ${measurement.perimeter.toFixed(1)} ft lineales · ${measurement.yards.toFixed(2)} yd³ netas de concreto · ${measurement.orderYards.toFixed(2)} yd³ estimadas para ordenar con ${measurement.waste}% de desperdicio · ${measurement.baseYards.toFixed(2)} yd³ de base`
      : `Takeoff: ${label} · ${measurement.area.toFixed(1)} sq ft · ${measurement.perimeter.toFixed(1)} linear ft · ${measurement.yards.toFixed(2)} net yd³ of concrete · ${measurement.orderYards.toFixed(2)} estimated order yd³ with ${measurement.waste}% waste · ${measurement.baseYards.toFixed(2)} yd³ of base`;
    $('#measurement-summary').textContent = summary;
    window.ebcPlanMetrics = measurement;
  }

  function syncStoredDrawing() {
    elements.storedPoints.value = JSON.stringify(freeformPoints);
    elements.storedClosed.value = String(freeformClosed);
  }

  function notifyQuoteAndRender() {
    syncStoredDrawing();
    render();
    elements.length.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function readStoredDrawing() {
    try {
      const parsed = JSON.parse(elements.storedPoints.value || '[]');
      freeformPoints = Array.isArray(parsed)
        ? parsed
          .filter(point => Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)))
          .map(point => ({ x: Math.max(0, Number(point.x)), y: Math.max(0, Number(point.y)) }))
        : [];
    } catch {
      freeformPoints = [];
    }
    freeformClosed = elements.storedClosed.value === 'true' && freeformPoints.length >= 3;
  }

  function closestPointIndex(event) {
    const rect = elements.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (elements.canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (elements.canvas.height / rect.height);
    let bestIndex = -1;
    let bestDistance = 18;
    freeformPoints.map(worldToCanvas).forEach((point, index) => {
      const candidateDistance = Math.hypot(point.x - x, point.y - y);
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  elements.canvas.addEventListener('pointerdown', event => {
    if (!isFreeform() || mode !== '2d') return;
    event.preventDefault();
    elements.canvas.setPointerCapture?.(event.pointerId);
    const existingIndex = closestPointIndex(event);

    if (!freeformClosed && existingIndex === 0 && freeformPoints.length >= 3) {
      freeformClosed = true;
      notifyQuoteAndRender();
      return;
    }

    if (existingIndex >= 0) {
      draggingIndex = existingIndex;
      return;
    }

    if (freeformClosed) return;
    freeformPoints.push(canvasToWorld(event));
    draggingIndex = freeformPoints.length - 1;
    notifyQuoteAndRender();
  });

  elements.canvas.addEventListener('pointermove', event => {
    if (draggingIndex == null || !isFreeform() || mode !== '2d') return;
    event.preventDefault();
    freeformPoints[draggingIndex] = canvasToWorld(event);
    notifyQuoteAndRender();
  });

  function stopDragging(event) {
    if (draggingIndex == null) return;
    draggingIndex = null;
    if (event?.pointerId != null && elements.canvas.hasPointerCapture?.(event.pointerId)) {
      elements.canvas.releasePointerCapture(event.pointerId);
    }
  }

  elements.canvas.addEventListener('pointerup', stopDragging);
  elements.canvas.addEventListener('pointercancel', stopDragging);

  [
    'shape',
    'a',
    'b',
    'c',
    'd',
    'thickness',
    'finish',
    'waste',
    'baseDepth',
    'gridSize'
  ].forEach(key => {
    elements[key].addEventListener('input', () => {
      render();
      elements.length.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  elements.storedPoints.addEventListener('input', () => {
    readStoredDrawing();
    render();
  });
  elements.storedClosed.addEventListener('input', () => {
    readStoredDrawing();
    render();
  });
  elements.language?.addEventListener('input', render);

  $('#view-2d').addEventListener('click', () => {
    mode = '2d';
    $('#view-2d').classList.add('active');
    $('#view-3d').classList.remove('active');
    render();
  });

  $('#view-3d').addEventListener('click', () => {
    mode = '3d';
    $('#view-3d').classList.add('active');
    $('#view-2d').classList.remove('active');
    render();
  });

  $('#undo-plan-point').addEventListener('click', () => {
    if (freeformClosed) {
      freeformClosed = false;
    } else {
      freeformPoints.pop();
    }
    notifyQuoteAndRender();
  });

  $('#close-plan-shape').addEventListener('click', () => {
    if (freeformPoints.length < 3) {
      alert('Agrega por lo menos 3 puntos antes de cerrar la forma.');
      return;
    }
    freeformClosed = true;
    notifyQuoteAndRender();
  });

  $('#reset-plan-shape').addEventListener('click', () => {
    if (freeformPoints.length && !confirm('¿Borrar todos los puntos de este plano?')) return;
    freeformPoints = [];
    freeformClosed = false;
    notifyQuoteAndRender();
  });

  elements.useTakeoff.addEventListener('click', () => {
    const measurement = metrics();
    if (!measurement.ready) {
      alert('Completa y cierra la forma antes de agregar el takeoff.');
      return;
    }
    const isSpanish = language() === 'es';
    window.ebcApplyTakeoffItems?.([
      {
        key: 'surface',
        description: isSpanish ? 'Instalación y acabado de concreto' : 'Concrete installation and finish',
        qty: measurement.area.toFixed(1),
        unit: 'sq ft',
        rate: 0
      },
      {
        key: 'concrete',
        description: isSpanish ? 'Concreto premezclado (cantidad estimada)' : 'Ready-mix concrete (estimated quantity)',
        qty: measurement.orderYards.toFixed(2),
        unit: 'yd³',
        rate: 0
      },
      {
        key: 'base',
        description: isSpanish ? 'Base de grava compactada' : 'Compacted gravel base',
        qty: measurement.baseYards.toFixed(2),
        unit: 'yd³',
        rate: 0
      },
      {
        key: 'formwork',
        description: isSpanish ? 'Formaleta perimetral' : 'Perimeter formwork',
        qty: measurement.perimeter.toFixed(1),
        unit: 'linear ft',
        rate: 0
      }
    ]);
    alert('Takeoff agregado. Ahora solo completa tus precios por unidad.');
  });

  window.ebcRenderPlan = render;
  readStoredDrawing();
  render();
})();
