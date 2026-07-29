import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const context = vm.createContext({ URL });
vm.runInContext(fs.readFileSync(path.join(root, 'app/invoice-core.js'), 'utf8'), context);
const core = context.EBCInvoiceCore;

assert.equal(core.amountForPhase(19250, 30), 5775);
assert.equal(core.amountForPhase(19250, 45), 8662.5);
assert.equal(core.amountForPhase(19250, 25), 4812.5);
assert.equal(core.balance(8662.5, 2000), 6662.5);
assert.equal(core.balance(1000, 1200), 0);
assert.equal(core.phasePercent('progress', [30, 45, 25], 0), 45);
assert.equal(core.phasePercent('custom', [30, 45, 25], 12.5), 12.5);
assert.equal(core.validPaymentUrl('https://pay.example/inv-1'), 'https://pay.example/inv-1');
assert.equal(core.validPaymentUrl('http://pay.example/inv-1'), '');
assert.equal(core.validPaymentUrl('javascript:alert(1)'), '');
assert.equal(core.containsSensitiveFinancialNumber('Routing 123456789'), true);
assert.equal(core.containsSensitiveFinancialNumber('Use the secure invoice link.'), false);
assert.deepEqual(
  JSON.parse(JSON.stringify(core.acceptedMethodKeys({ ach: true, zelle: true, check: true, cash: false, online: true }))),
  ['ach', 'zelle', 'check', 'online']
);

console.log('Invoice core checks passed.');
