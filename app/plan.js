(() => {
  const $ = selector => document.querySelector(selector);
  const elements = {
    shape: $('#plan-shape'),
    a: $('#plan-a'),
    b: $('#plan-b'),
    c: $('#plan-c'),
    d: $('#plan-d'),
    thickness: $('#thickness'),
    finish: $('#plan-finish'),
    canvas: $('#plan-canvas'),
    print: $('#quote-plan-canvas'),
    area: $('#area'),
    yards: $('#yards'),
    perimeter: $('#perimeter'),
    label: $('#p-plan-label'),
    length: $('#length'),
    width: $('#width'),
    language: $('#quote-language')
  };

  let mode = '2d';

  function number(element) {
    return Math.max(0, Number(element.value) || 0);
  }

  function language() {
    return elements.language?.value === 'es' ? 'es' : 'en';
  }

  function metrics() {
    const a = number(elements.a);
    const b = number(elements.b);
    const c = Math.min(number(elements.c), a);
    const d = Math.min(number(elements.d), b);
    const thickness = number(elements.thickness);
    const isL = elements.shape.value === 'lshape';
    const area = Math.max(0, isL ? a * b - c * d : a * b);
    const perimeter = 2 * (a + b);
    const yards = area * (thickness / 12) / 27;
    return { a, b, c, d, thickness, isL, area, perimeter, yards };
  }

  function clear(context, width, height) {
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#f6f2ea';
    context.fillRect(0, 0, width, height);
  }

  function points2D(measurement, width, height) {
    const padding = 70;
    const scale = Math.min(
      (width - padding * 2) / Math.max(measurement.a, 1),
      (height - padding * 2) / Math.max(measurement.b, 1)
    );
    const x = (width - measurement.a * scale) / 2;
    const y = (height - measurement.b * scale) / 2;
    if (!measurement.isL) {
      return [
        [x, y],
        [x + measurement.a * scale, y],
        [x + measurement.a * scale, y + measurement.b * scale],
        [x, y + measurement.b * scale]
      ];
    }
    return [
      [x, y],
      [x + measurement.a * scale, y],
      [x + measurement.a * scale, y + (measurement.b - measurement.d) * scale],
      [x + (measurement.a - measurement.c) * scale, y + (measurement.b - measurement.d) * scale],
      [x + (measurement.a - measurement.c) * scale, y + measurement.b * scale],
      [x, y + measurement.b * scale]
    ];
  }

  function drawGrid(context, width, height) {
    context.strokeStyle = 'rgba(90,80,65,.12)';
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 25) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  function polygon(context, points, fill, stroke = '#2c2822') {
    context.beginPath();
    points.forEach((point, index) => {
      if (index) context.lineTo(...point);
      else context.moveTo(...point);
    });
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = 3;
    context.stroke();
  }

  function finishColor() {
    if (elements.finish.value.includes('Stamped')) return '#b48a56';
    if (elements.finish.value.includes('Gravel')) return '#9a9488';
    if (elements.finish.value.includes('Smooth')) return '#bfc3c5';
    return '#c8c4bb';
  }

  function draw2D(context, width, height, measurement) {
    clear(context, width, height);
    drawGrid(context, width, height);
    polygon(context, points2D(measurement, width, height), finishColor());
    context.fillStyle = '#111';
    context.font = '700 22px Arial';
    context.textAlign = 'center';
    context.fillText(`${measurement.area.toFixed(1)} SQ FT`, width / 2, height / 2);
    context.font = '16px Arial';
    context.fillText(`A ${measurement.a} ft × B ${measurement.b} ft`, width / 2, height - 24);
    if (measurement.isL) {
      const cutout = language() === 'es' ? 'Recorte' : 'Cutout';
      context.fillText(`${cutout} C ${measurement.c} ft × D ${measurement.d} ft`, width / 2, 34);
    }
  }

  function isoPoint(x, y, z, centerX, centerY, scale) {
    return [
      centerX + (x - y) * scale,
      centerY + (x + y) * scale * 0.48 - z * scale
    ];
  }

  function draw3D(context, width, height, measurement) {
    clear(context, width, height);
    const max = Math.max(measurement.a, measurement.b, 1);
    const scale = Math.min(width / (max * 3), height / (max * 2.2));
    const centerX = width / 2;
    const centerY = height * 0.34;
    const depth = Math.max(1, measurement.thickness / 12) * scale * 3;
    const base = measurement.isL
      ? [
          [0, 0],
          [measurement.a, 0],
          [measurement.a, measurement.b - measurement.d],
          [measurement.a - measurement.c, measurement.b - measurement.d],
          [measurement.a - measurement.c, measurement.b],
          [0, measurement.b]
        ]
      : [[0, 0], [measurement.a, 0], [measurement.a, measurement.b], [0, measurement.b]];
    const top = base.map(([x, y]) => isoPoint(x, y, depth / scale, centerX, centerY, scale));
    const bottom = base.map(([x, y]) => isoPoint(x, y, 0, centerX, centerY, scale));

    for (let index = 0; index < base.length; index += 1) {
      const next = (index + 1) % base.length;
      polygon(context, [top[index], top[next], bottom[next], bottom[index]], '#8f8a80', '#625d55');
    }
    polygon(context, top, finishColor(), '#2c2822');
    context.fillStyle = '#111';
    context.font = '700 20px Arial';
    context.textAlign = 'center';
    context.fillText(`${measurement.area.toFixed(1)} SQ FT · ${measurement.thickness} IN`, width / 2, height - 34);
  }

  function render() {
    document.querySelectorAll('.l-only').forEach(element => {
      element.style.display = elements.shape.value === 'lshape' ? 'grid' : 'none';
    });

    const measurement = metrics();
    const lang = language();
    elements.length.value = measurement.a;
    elements.width.value = measurement.b;
    elements.area.textContent = `${measurement.area.toFixed(1)} sq ft`;
    elements.yards.textContent = `${measurement.yards.toFixed(2)} yd³`;
    elements.perimeter.textContent = `${measurement.perimeter.toFixed(1)} linear ft`;

    const shapeLabel = measurement.isL
      ? (lang === 'es' ? 'Forma L' : 'L-shaped')
      : (lang === 'es' ? 'Rectangular' : 'Rectangular');
    elements.label.textContent = `${shapeLabel} · ${measurement.area.toFixed(1)} sq ft · ${measurement.yards.toFixed(2)} yd³`;

    const draw = mode === '3d' ? draw3D : draw2D;
    draw(elements.canvas.getContext('2d'), elements.canvas.width, elements.canvas.height, measurement);
    draw3D(elements.print.getContext('2d'), elements.print.width, elements.print.height, measurement);

    const cutout = measurement.isL
      ? (lang === 'es'
          ? ` menos ${measurement.c} ft × ${measurement.d} ft`
          : ` minus ${measurement.c} ft × ${measurement.d} ft`)
      : '';
    const summary = lang === 'es'
      ? `Plano: ${shapeLabel} · ${measurement.a} ft × ${measurement.b} ft${cutout} · ${measurement.thickness} in de espesor · ${measurement.area.toFixed(1)} sq ft · aproximadamente ${measurement.yards.toFixed(2)} yardas cúbicas`
      : `Plan: ${shapeLabel} · ${measurement.a} ft × ${measurement.b} ft${cutout} · ${measurement.thickness} in thick · ${measurement.area.toFixed(1)} sq ft · approximately ${measurement.yards.toFixed(2)} cubic yards`;
    $('#measurement-summary').textContent = summary;
    window.ebcPlanMetrics = measurement;
  }

  ['shape', 'a', 'b', 'c', 'd', 'thickness', 'finish'].forEach(key => {
    elements[key].addEventListener('input', () => {
      render();
      elements.length.dispatchEvent(new Event('input', { bubbles: true }));
    });
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

  $('#use-plan-area').addEventListener('click', () => {
    const row = document.querySelector('#items .item-row');
    if (!row) {
      alert('Primero agrega un concepto a la cotización.');
      return;
    }
    row.querySelector('.qty').value = metrics().area.toFixed(1);
    row.querySelector('.unit').value = 'sq ft';
    row.querySelector('.qty').dispatchEvent(new Event('input', { bubbles: true }));
  });

  window.ebcRenderPlan = render;
  render();
})();
