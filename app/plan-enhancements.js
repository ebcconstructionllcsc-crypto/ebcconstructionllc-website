(() => {
  const math = window.EbcPlanMath;
  const canvas = document.querySelector('#plan-canvas');
  const storedPoints = document.querySelector('#plan-points');
  const storedClosed = document.querySelector('#plan-closed');
  const tools = document.querySelector('#freeform-tools');
  const undoButton = document.querySelector('#undo-plan-point');
  const closeButton = document.querySelector('#close-plan-shape');
  const resetButton = document.querySelector('#reset-plan-shape');
  const shape = document.querySelector('#plan-shape');
  const gridSize = document.querySelector('#plan-grid-size');
  const view2d = document.querySelector('#view-2d');

  if (!math?.PlanHistory || !canvas || !storedPoints || !storedClosed || !tools || !undoButton) return;

  const STORAGE_KEY = 'ebc-manager-plan-precision';
  const DEFAULT_INCREMENT = 0.25;
  const GRID_PIXELS = 50;
  const GRID_PADDING = 50;
  let syncing = false;
  let pointerStart = null;
  let draggingIndex = null;

  function readState() {
    let points = [];
    try {
      const parsed = JSON.parse(storedPoints.value || '[]');
      if (Array.isArray(parsed)) points = parsed;
    } catch {
      points = [];
    }
    return math.clonePlanState({ points, closed: storedClosed.value === 'true' });
  }

  const history = new math.PlanHistory(readState(), 50);

  const precisionLabel = document.createElement('label');
  precisionLabel.className = 'plan-precision-control';
  precisionLabel.textContent = 'Precisión del plano';

  const precisionSelect = document.createElement('select');
  precisionSelect.id = 'plan-precision';
  precisionSelect.innerHTML = `
    <option value="1">1 pie</option>
    <option value="0.5">6 pulgadas</option>
    <option value="0.25">3 pulgadas</option>
  `;
  precisionSelect.value = localStorage.getItem(STORAGE_KEY) || String(DEFAULT_INCREMENT);
  if (![...precisionSelect.options].some(option => option.value === precisionSelect.value)) {
    precisionSelect.value = String(DEFAULT_INCREMENT);
  }
  precisionLabel.append(precisionSelect);

  const actions = tools.querySelector('.freeform-actions');
  actions?.parentElement?.insertBefore(precisionLabel, actions);

  const redoButton = document.createElement('button');
  redoButton.id = 'redo-plan-point';
  redoButton.type = 'button';
  redoButton.className = 'secondary';
  redoButton.textContent = 'Rehacer';
  undoButton.insertAdjacentElement('afterend', redoButton);

  const historyHint = document.createElement('small');
  historyHint.className = 'plan-history-hint';
  historyHint.textContent = 'Historial protegido: hasta 50 cambios.';
  tools.append(historyHint);

  function increment() {
    return Math.max(0.01, Number(precisionSelect.value) || DEFAULT_INCREMENT);
  }

  function snapState(state) {
    const step = increment();
    return {
      points: state.points.map(point => ({
        x: Math.max(0, math.snapToIncrement(point.x, step)),
        y: Math.max(0, math.snapToIncrement(point.y, step))
      })),
      closed: Boolean(state.closed)
    };
  }

  function writeState(state) {
    const normalized = snapState(state);
    syncing = true;
    storedPoints.value = JSON.stringify(normalized.points);
    storedClosed.value = String(normalized.closed && normalized.points.length >= 3);
    storedPoints.dispatchEvent(new Event('input', { bubbles: true }));
    storedClosed.dispatchEvent(new Event('input', { bubbles: true }));
    syncing = false;
    return normalized;
  }

  function updateButtons() {
    undoButton.disabled = !history.canUndo;
    redoButton.disabled = !history.canRedo;
    undoButton.setAttribute('aria-label', history.canUndo ? 'Deshacer último cambio del plano' : 'No hay cambios para deshacer');
    redoButton.setAttribute('aria-label', history.canRedo ? 'Rehacer cambio del plano' : 'No hay cambios para rehacer');
  }

  function commitCurrent(previousState = history.value()) {
    const next = snapState(readState());
    history.sync(previousState);
    history.commit(next);
    writeState(next);
    updateButtons();
  }

  function restore(state) {
    writeState(state);
    updateButtons();
  }

  function drawingEnabled() {
    return shape?.value === 'freeform' && view2d?.classList.contains('active');
  }

  function pixelsPerFoot() {
    return GRID_PIXELS / (Math.max(0.01, Number(gridSize?.value) || 5));
  }

  function eventPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / Math.max(rect.width, 1)),
      y: (event.clientY - rect.top) * (canvas.height / Math.max(rect.height, 1))
    };
  }

  function worldToCanvas(point) {
    const scale = pixelsPerFoot();
    return { x: GRID_PADDING + point.x * scale, y: GRID_PADDING + point.y * scale };
  }

  function canvasToWorld(event) {
    const point = eventPosition(event);
    const scale = pixelsPerFoot();
    const maxX = (canvas.width - GRID_PADDING * 2) / scale;
    const maxY = (canvas.height - GRID_PADDING * 2) / scale;
    return {
      x: math.snapToIncrement(Math.min(maxX, Math.max(0, (point.x - GRID_PADDING) / scale)), increment()),
      y: math.snapToIncrement(Math.min(maxY, Math.max(0, (point.y - GRID_PADDING) / scale)), increment())
    };
  }

  function closestPointIndex(event, state) {
    const pointer = eventPosition(event);
    let closest = -1;
    let bestDistance = 24;
    state.points.map(worldToCanvas).forEach((point, index) => {
      const candidate = Math.hypot(point.x - pointer.x, point.y - pointer.y);
      if (candidate < bestDistance) {
        bestDistance = candidate;
        closest = index;
      }
    });
    return closest;
  }

  undoButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    restore(history.undo());
  }, true);

  redoButton.addEventListener('click', event => {
    event.preventDefault();
    restore(history.redo());
  });

  canvas.addEventListener('pointerdown', event => {
    if (!drawingEnabled()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pointerStart = readState();
    const state = math.clonePlanState(pointerStart);
    const existingIndex = closestPointIndex(event, state);

    if (!state.closed && existingIndex === 0 && state.points.length >= 3) {
      state.closed = true;
      writeState(state);
      commitCurrent(pointerStart);
      pointerStart = null;
      return;
    }

    if (existingIndex >= 0) {
      draggingIndex = existingIndex;
    } else if (!state.closed) {
      state.points.push(canvasToWorld(event));
      draggingIndex = state.points.length - 1;
      writeState(state);
    } else {
      pointerStart = null;
      return;
    }
    canvas.setPointerCapture?.(event.pointerId);
  }, true);

  canvas.addEventListener('pointermove', event => {
    if (draggingIndex == null || !drawingEnabled()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = readState();
    state.points[draggingIndex] = canvasToWorld(event);
    writeState(state);
  }, true);

  function finishPointerInteraction(event) {
    if (draggingIndex == null || !pointerStart) return;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    draggingIndex = null;
    if (event?.pointerId != null && canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    commitCurrent(pointerStart);
    pointerStart = null;
  }

  canvas.addEventListener('pointerup', finishPointerInteraction, true);
  canvas.addEventListener('pointercancel', finishPointerInteraction, true);

  closeButton?.addEventListener('click', () => {
    const before = readState();
    queueMicrotask(() => commitCurrent(before));
  }, true);

  resetButton?.addEventListener('click', () => {
    const before = readState();
    queueMicrotask(() => commitCurrent(before));
  }, true);

  precisionSelect.addEventListener('change', () => {
    const before = readState();
    localStorage.setItem(STORAGE_KEY, precisionSelect.value);
    commitCurrent(before);
  });

  storedPoints.addEventListener('input', () => {
    if (!syncing && !pointerStart) history.sync(snapState(readState()));
  });
  storedClosed.addEventListener('input', () => {
    if (!syncing && !pointerStart) history.sync(snapState(readState()));
  });

  const initial = writeState(readState());
  history.replace(initial);
  updateButtons();
})();
