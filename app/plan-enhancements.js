(() => {
  const math = window.EbcPlanMath;
  const canvas = document.querySelector('#plan-canvas');
  const storedPoints = document.querySelector('#plan-points');
  const storedClosed = document.querySelector('#plan-closed');
  const tools = document.querySelector('#freeform-tools');
  const undoButton = document.querySelector('#undo-plan-point');
  const closeButton = document.querySelector('#close-plan-shape');
  const resetButton = document.querySelector('#reset-plan-shape');

  if (!math?.PlanHistory || !canvas || !storedPoints || !storedClosed || !tools || !undoButton) return;

  const STORAGE_KEY = 'ebc-manager-plan-precision';
  const DEFAULT_INCREMENT = 0.25;
  let syncing = false;
  let interactionStart = null;

  function readState() {
    let points = [];
    try {
      const parsed = JSON.parse(storedPoints.value || '[]');
      if (Array.isArray(parsed)) points = parsed;
    } catch {
      points = [];
    }
    return math.clonePlanState({
      points,
      closed: storedClosed.value === 'true'
    });
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
      closed: state.closed
    };
  }

  function updateButtons() {
    undoButton.disabled = !history.canUndo;
    redoButton.disabled = !history.canRedo;
    undoButton.setAttribute('aria-label', history.canUndo ? 'Deshacer último cambio del plano' : 'No hay cambios para deshacer');
    redoButton.setAttribute('aria-label', history.canRedo ? 'Rehacer cambio del plano' : 'No hay cambios para rehacer');
  }

  function applyState(state, { commit = false } = {}) {
    if (syncing) return;
    syncing = true;
    const normalized = snapState(state);
    storedPoints.value = JSON.stringify(normalized.points);
    storedClosed.value = String(normalized.closed && normalized.points.length >= 3);
    storedPoints.dispatchEvent(new Event('input', { bubbles: true }));
    storedClosed.dispatchEvent(new Event('input', { bubbles: true }));
    if (commit) history.commit(normalized);
    syncing = false;
    updateButtons();
  }

  function commitCurrent() {
    const snapped = snapState(readState());
    applyState(snapped);
    history.commit(snapped);
    updateButtons();
  }

  function restore(state) {
    applyState(state);
    updateButtons();
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

  canvas.addEventListener('pointerdown', () => {
    interactionStart = readState();
  }, true);

  canvas.addEventListener('pointermove', event => {
    if (!canvas.hasPointerCapture?.(event.pointerId)) return;
    applyState(readState());
  });

  function finishInteraction() {
    if (!interactionStart) return;
    const current = snapState(readState());
    history.replace(interactionStart);
    history.commit(current);
    applyState(current);
    interactionStart = null;
    updateButtons();
  }

  canvas.addEventListener('pointerup', finishInteraction);
  canvas.addEventListener('pointercancel', finishInteraction);

  closeButton?.addEventListener('click', () => queueMicrotask(commitCurrent));
  resetButton?.addEventListener('click', () => queueMicrotask(commitCurrent));

  precisionSelect.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY, precisionSelect.value);
    commitCurrent();
  });

  storedPoints.addEventListener('input', () => {
    if (!syncing && !interactionStart) {
      history.replace(snapState(readState()));
      updateButtons();
    }
  });

  applyState(readState());
  history.replace(readState());
  updateButtons();
})();
