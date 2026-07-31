import assert from 'node:assert/strict';

await import('../app/plan-math.js');

const {
  polygonArea,
  polygonPerimeter,
  materialTakeoff,
  snapToIncrement,
  PlanHistory
} = globalThis.EbcPlanMath;

const rectangle = [
  { x: 0, y: 0 },
  { x: 30, y: 0 },
  { x: 30, y: 20 },
  { x: 0, y: 20 }
];
assert.equal(polygonArea(rectangle), 600);
assert.equal(polygonPerimeter(rectangle), 100);

const lShape = [
  { x: 0, y: 0 },
  { x: 30, y: 0 },
  { x: 30, y: 12 },
  { x: 20, y: 12 },
  { x: 20, y: 20 },
  { x: 0, y: 20 }
];
assert.equal(polygonArea(lShape), 520);
assert.equal(polygonPerimeter(lShape), 100);

const takeoff = materialTakeoff({
  area: 600,
  perimeter: 100,
  thickness: 4,
  waste: 10,
  baseDepth: 4
});
assert.ok(Math.abs(takeoff.yards - 7.4074074074) < 1e-9);
assert.ok(Math.abs(takeoff.orderYards - 8.1481481481) < 1e-9);
assert.ok(Math.abs(takeoff.baseYards - 8.1481481481) < 1e-9);

assert.equal(snapToIncrement(10.13, 0.25), 10.25);
assert.equal(snapToIncrement(10.13, 0.5), 10);
assert.equal(snapToIncrement(10.6, 1), 11);

const history = new PlanHistory({ points: [], closed: false }, 2);
history.commit({ points: [{ x: 1, y: 1 }], closed: false });
history.commit({ points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], closed: false });
history.commit({ points: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }], closed: true });
assert.equal(history.canUndo, true);
assert.deepEqual(history.undo(), {
  points: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
  closed: false
});
assert.deepEqual(history.undo(), {
  points: [{ x: 1, y: 1 }],
  closed: false
});
assert.equal(history.canUndo, false);
assert.equal(history.canRedo, true);
assert.deepEqual(history.redo(), {
  points: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
  closed: false
});
history.commit({ points: [{ x: 9, y: 9 }], closed: false });
assert.equal(history.canRedo, false);

console.log('Plan math checks passed.');
