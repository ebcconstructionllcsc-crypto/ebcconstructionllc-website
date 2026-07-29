import assert from 'node:assert/strict';

await import('../app/plan-math.js');

const {
  polygonArea,
  polygonPerimeter,
  materialTakeoff
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

console.log('Plan math checks passed.');
