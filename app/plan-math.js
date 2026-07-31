((root) => {
  function polygonArea(points) {
    if (points.length < 3) return 0;
    return Math.abs(points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0)) / 2;
  }

  function distance(first, second) {
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function polygonPerimeter(points, closed = true) {
    if (points.length < 2) return 0;
    const limit = closed ? points.length : points.length - 1;
    let total = 0;
    for (let index = 0; index < limit; index += 1) {
      total += distance(points[index], points[(index + 1) % points.length]);
    }
    return total;
  }

  function materialTakeoff({ area, perimeter, thickness, waste, baseDepth }) {
    const safeArea = Math.max(0, Number(area) || 0);
    const safePerimeter = Math.max(0, Number(perimeter) || 0);
    const safeThickness = Math.max(0, Number(thickness) || 0);
    const safeWaste = Math.max(0, Number(waste) || 0);
    const safeBaseDepth = Math.max(0, Number(baseDepth) || 0);
    const yards = safeArea * (safeThickness / 12) / 27;
    return {
      area: safeArea,
      perimeter: safePerimeter,
      yards,
      orderYards: yards * (1 + safeWaste / 100),
      baseYards: safeArea * (safeBaseDepth / 12) / 27 * (1 + safeWaste / 100)
    };
  }

  function snapToIncrement(value, increment = 0.25) {
    const safeValue = Number(value) || 0;
    const safeIncrement = Math.max(0.01, Number(increment) || 0.25);
    const snapped = Math.round(safeValue / safeIncrement) * safeIncrement;
    return Number(snapped.toFixed(4));
  }

  function formatFeetInches(value) {
    const totalInches = Math.round(Math.max(0, Number(value) || 0) * 12);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    if (feet && inches) return `${feet}' ${inches}"`;
    if (feet) return `${feet}'`;
    return `${inches}"`;
  }

  function clonePlanState(state = {}) {
    return {
      points: Array.isArray(state.points)
        ? state.points.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }))
        : [],
      closed: Boolean(state.closed)
    };
  }

  function samePlanState(first, second) {
    return JSON.stringify(clonePlanState(first)) === JSON.stringify(clonePlanState(second));
  }

  class PlanHistory {
    constructor(initialState = { points: [], closed: false }, limit = 50) {
      this.limit = Math.max(1, Number(limit) || 50);
      this.current = clonePlanState(initialState);
      this.undoStack = [];
      this.redoStack = [];
    }

    replace(state) {
      this.current = clonePlanState(state);
      this.undoStack = [];
      this.redoStack = [];
      return this.value();
    }

    sync(state) {
      this.current = clonePlanState(state);
      return this.value();
    }

    commit(state) {
      const next = clonePlanState(state);
      if (samePlanState(next, this.current)) return this.value();
      this.undoStack.push(clonePlanState(this.current));
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.current = next;
      this.redoStack = [];
      return this.value();
    }

    undo() {
      if (!this.undoStack.length) return this.value();
      this.redoStack.push(clonePlanState(this.current));
      this.current = this.undoStack.pop();
      return this.value();
    }

    redo() {
      if (!this.redoStack.length) return this.value();
      this.undoStack.push(clonePlanState(this.current));
      this.current = this.redoStack.pop();
      return this.value();
    }

    value() {
      return clonePlanState(this.current);
    }

    get canUndo() {
      return this.undoStack.length > 0;
    }

    get canRedo() {
      return this.redoStack.length > 0;
    }
  }

  root.EbcPlanMath = {
    polygonArea,
    distance,
    polygonPerimeter,
    materialTakeoff,
    snapToIncrement,
    formatFeetInches,
    clonePlanState,
    samePlanState,
    PlanHistory
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      import('./plan-enhancements.js').catch(error => {
        console.error('Could not load plan field enhancements.', error);
      });
    }, { once: true });
  }
})(typeof window === 'undefined' ? globalThis : window);
