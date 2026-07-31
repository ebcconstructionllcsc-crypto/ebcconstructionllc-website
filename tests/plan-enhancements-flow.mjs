import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const dom = new JSDOM(`<!doctype html><html><body>
  <select id="plan-shape"><option value="freeform" selected>Freeform</option></select>
  <select id="plan-grid-size"><option value="5" selected>5</option></select>
  <button id="view-2d" class="active">2D</button>
  <div id="freeform-tools">
    <div><strong>Draw</strong></div>
    <div class="freeform-actions">
      <button id="undo-plan-point" type="button">Undo</button>
      <button id="close-plan-shape" type="button">Close</button>
      <button id="reset-plan-shape" type="button">Reset</button>
    </div>
  </div>
  <input id="plan-points" type="hidden" value="[]">
  <input id="plan-closed" type="hidden" value="false">
  <canvas id="plan-canvas" width="900" height="520"></canvas>
</body></html>`, {
  url: 'http://terminal.local/app/quote.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});

const { window } = dom;
const canvas = window.document.querySelector('#plan-canvas');
canvas.getBoundingClientRect = () => ({
  left: 0,
  top: 0,
  right: 900,
  bottom: 520,
  width: 900,
  height: 520
});
canvas.setPointerCapture = () => {};
canvas.hasPointerCapture = () => false;
canvas.releasePointerCapture = () => {};

window.eval(fs.readFileSync(path.join(root, 'app/plan-math.js'), 'utf8'));
window.eval(fs.readFileSync(path.join(root, 'app/plan-enhancements.js'), 'utf8'));

const pointsInput = window.document.querySelector('#plan-points');
const closedInput = window.document.querySelector('#plan-closed');
const undoButton = window.document.querySelector('#undo-plan-point');
const redoButton = window.document.querySelector('#redo-plan-point');
const precision = window.document.querySelector('#plan-precision');

assert.ok(precision, 'precision selector should be added');
assert.ok(redoButton, 'redo button should be added');
assert.equal(precision.value, '0.25');
assert.equal(undoButton.disabled, true);
assert.equal(redoButton.disabled, true);

function pointer(type, clientX, clientY) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  canvas.dispatchEvent(event);
}

pointer('pointerdown', 152.6, 102.4);
pointer('pointerup', 152.6, 102.4);

assert.deepEqual(JSON.parse(pointsInput.value), [{ x: 10.25, y: 5.25 }]);
assert.equal(undoButton.disabled, false);
undoButton.click();
assert.deepEqual(JSON.parse(pointsInput.value), []);
assert.equal(redoButton.disabled, false);
redoButton.click();
assert.deepEqual(JSON.parse(pointsInput.value), [{ x: 10.25, y: 5.25 }]);

pointsInput.value = JSON.stringify([{ x: 2, y: 2 }]);
closedInput.value = 'false';
pointsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
closedInput.dispatchEvent(new window.Event('input', { bubbles: true }));

assert.equal(undoButton.disabled, true, 'loading another quote should clear prior undo history');
undoButton.click();
assert.deepEqual(JSON.parse(pointsInput.value), [{ x: 2, y: 2 }]);

precision.value = '0.5';
precision.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.equal(window.localStorage.getItem('ebc-manager-plan-precision'), '0.5');

console.log('Plan enhancement flow passed.');
