import assert from 'node:assert/strict';
import {
  MAX_SOURCE_BYTES,
  PROMPT_VERSION,
  RENDER_MODEL,
  RenderRequestError,
  buildConstructionPrompt,
  matchesImageSignature,
  outputSize,
  validateRenderRequest
} from '../supabase/functions/generate-render/render-core.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const idempotencyKey = '22222222-2222-4222-8222-222222222222';
const valid = {
  sourcePath: `${userId}/${idempotencyKey}/source.png`,
  sourceMime: 'image/png',
  maskPath: `${userId}/${idempotencyKey}/mask.png`,
  width: 1600,
  height: 1200,
  service: 'driveway',
  finish: 'broom',
  color: 'natural gray',
  scope: 'Extend the driveway twelve feet toward the right side.',
  quality: 'low',
  preserveStructures: true,
  projectId: null,
  idempotencyKey
};

assert.equal(RENDER_MODEL, 'gpt-image-2');
assert.equal(PROMPT_VERSION, 'construction-v1');
assert.equal(MAX_SOURCE_BYTES, 12 * 1024 * 1024);
const parsed = validateRenderRequest(valid, userId);
assert.equal(parsed.sourcePath, valid.sourcePath);
assert.equal(parsed.quality, 'low');
assert.equal(outputSize(1600, 1200, 'low'), '1536x1024');
assert.equal(outputSize(1200, 1600, 'high'), '1152x2048');
assert.equal(matchesImageSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0]), 'image/png'), true);
assert.equal(matchesImageSignature(new Uint8Array([0xff, 0xd8, 0xff, 0]), 'image/jpeg'), true);
assert.equal(matchesImageSignature(new TextEncoder().encode('RIFF0000WEBP0'), 'image/webp'), true);
assert.equal(matchesImageSignature(new TextEncoder().encode('<svg></svg>'), 'image/png'), false);

const prompt = buildConstructionPrompt(parsed);
assert.match(prompt, /only construction work zone/i);
assert.match(prompt, /Preserve the exact camera position/i);
assert.match(prompt, /drainage direction/i);
assert.match(prompt, /not an engineering or permit drawing/i);
assert.doesNotMatch(prompt, /watermarks, workers, vehicles.*unless explicitly requested$/i);

function rejects(update, code) {
  assert.throws(
    () => validateRenderRequest({ ...valid, ...update }, userId),
    error => error instanceof RenderRequestError && error.code === code
  );
}

rejects({ sourcePath: 'another-user/source.png' }, 'invalid_source_path');
rejects({ sourcePath: `${userId}/../secret.png` }, 'invalid_source_path');
rejects({ maskPath: 'another-user/mask.png' }, 'invalid_mask_path');
rejects({ sourceMime: 'image/svg+xml' }, 'unsupported_image');
rejects({ width: 99 }, 'invalid_dimensions');
rejects({ service: 'roofing' }, 'invalid_service');
rejects({ finish: 'gold' }, 'invalid_finish');
rejects({ scope: 'short' }, 'scope_required');
rejects({ idempotencyKey: 'retry-me' }, 'invalid_idempotency_key');

console.log('Render server-core checks passed.');
