import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const context = vm.createContext({});
vm.runInContext(
  fs.readFileSync(path.join(root, 'app/render-core.js'), 'utf8'),
  context
);
const core = context.EBCRenderCore;

assert.deepEqual(
  JSON.parse(JSON.stringify(core.scaledDimensions(4032, 3024))),
  { width: 1600, height: 1200 }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(core.scaledDimensions(900, 1200))),
  { width: 900, height: 1200 }
);

const userId = '11111111-1111-4111-8111-111111111111';
const key = '22222222-2222-4222-8222-222222222222';
const request = core.renderRequest({
  projectId: '',
  service: 'driveway',
  finish: 'broom',
  color: ' concrete gray ',
  scope: ' Extend the driveway to the right. ',
  quality: 'low',
  preserveStructures: true,
  hasMask: true
}, userId, key, { width: 1600, height: 1200 });

assert.equal(request.sourcePath, `${userId}/${key}/source.png`);
assert.equal(request.maskPath, `${userId}/${key}/mask.png`);
assert.equal(request.color, 'concrete gray');
assert.equal(request.scope, 'Extend the driveway to the right.');
assert.equal(request.projectId, null);
assert.equal(request.quality, 'low');
assert.match(core.errorMessage({ code: 'insufficient_quota' }), /saldo/i);

console.log('Render browser-core checks passed.');
