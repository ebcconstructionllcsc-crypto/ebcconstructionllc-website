import assert from 'node:assert/strict';

await import('../app/proposal-core.js');

const { buildProposalModel, normalizeLines } = globalThis.EbcProposalCore;

const proposal = buildProposalModel({
  fields: {
    'quote-number': 'EBC-TEST-001',
    'quote-date': '2026-07-30',
    'valid-through': '2026-08-14',
    'quote-language': 'en',
    'client-name': 'Test Client LLC',
    'client-phone': '(864) 555-0100',
    'client-email': 'client@example.com',
    'project-address': '8 Test Dr, Greenville, SC 29605',
    'plan-shape': 'rectangle',
    'plan-a': '18',
    'plan-b': '40',
    thickness: '4',
    discount: '1000',
    tax: '0',
    'payment-1': '30',
    'payment-2': '45',
    'payment-3': '25'
  },
  items: [
    { key: 'slab', description: '18 FT x 40 FT reinforced floor slab', qty: 1, unit: 'lump sum', rate: 13500 },
    { key: 'entrance', description: 'Concrete entrance', qty: 1, unit: 'lump sum', rate: 17500 }
  ]
});

assert.equal(proposal.quoteNumber, 'EBC-TEST-001');
assert.equal(proposal.clientName, 'Test Client LLC');
assert.equal(proposal.projectAddress, '8 Test Dr, Greenville, SC 29605');
assert.equal(proposal.subtotal, 31000);
assert.equal(proposal.discount, 1000);
assert.equal(proposal.total, 30000);
assert.equal(proposal.area, 720);
assert.equal(proposal.perimeter, 116);
assert.equal(proposal.packages.length, 2);
assert.equal(proposal.paymentRows.length, 3);
assert.equal(proposal.paymentRows[0].amount, 9000);
assert.match(proposal.summary, /8 Test Dr/);
assert.match(proposal.acceptance, /separate construction agreement/);
assert.ok(proposal.includedScope.length >= 4);
assert.ok(proposal.exclusions.length >= 4);
assert.ok(proposal.assumptions.length >= 4);

assert.deepEqual(
  normalizeLines('• First item\n- Second item\n\nThird item'),
  ['First item', 'Second item', 'Third item']
);

const spanish = buildProposalModel({
  fields: {
    'quote-language': 'es',
    'project-address': 'Greer, SC',
    'payment-1': '50',
    'payment-2': '0',
    'payment-3': '50'
  },
  items: [{ description: 'Instalación de concreto', qty: 1, unit: 'lump sum', rate: 10000 }]
});
assert.match(spanish.title, /PROPUESTA/);
assert.match(spanish.acceptance, /contrato de construcción separado/);
assert.equal(spanish.paymentRows.length, 2);

console.log('Professional proposal model checks passed.');
