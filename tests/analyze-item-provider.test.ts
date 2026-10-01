import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api/analyze-item.ts';

function createResponse() {
  let statusCode = 200;
  let payload: unknown;
  return {
    res: {
      status(code: number) { statusCode = code; return this; },
      json(body: unknown) { payload = body; },
      setHeader() { /* cache headers are not relevant to these behavior tests */ }
    },
    result: () => ({ statusCode, payload })
  };
}

async function withGeminiFetch(body: unknown, status: number, run: () => Promise<void>) {
  const before = {
    geminiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_VISION_MODEL,
    openAiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.OPENAI_VISION_MODEL,
    enforcement: process.env.AI_USAGE_ENFORCEMENT,
    fetch: globalThis.fetch
  };
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_VISION_MODEL = 'test-vision-model';
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_VISION_MODEL;
  delete process.env.AI_USAGE_ENFORCEMENT;
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  try {
    await run();
  } finally {
    before.geminiKey ? process.env.GEMINI_API_KEY = before.geminiKey : delete process.env.GEMINI_API_KEY;
    before.geminiModel ? process.env.GEMINI_VISION_MODEL = before.geminiModel : delete process.env.GEMINI_VISION_MODEL;
    before.openAiKey ? process.env.OPENAI_API_KEY = before.openAiKey : delete process.env.OPENAI_API_KEY;
    before.openAiModel ? process.env.OPENAI_VISION_MODEL = before.openAiModel : delete process.env.OPENAI_VISION_MODEL;
    before.enforcement ? process.env.AI_USAGE_ENFORCEMENT = before.enforcement : delete process.env.AI_USAGE_ENFORCEMENT;
    globalThis.fetch = before.fetch;
  }
}

test('provider recognition creates a reviewable description and marks extracted serials for verification', async () => {
  await withGeminiFetch({
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      itemName: 'Makita XDT19 impact driver', category: 'Tools', make: 'Makita', model: 'XDT19', serialNumber: 'MKT-48291',
      observedText: { make: 'Makita', model: 'XDT19', serialNumber: 'MKT-48291' },
      condition: 'used', distinguishingFeatures: 'Teal body and bit holder',
      suggestedDescription: 'Makita XDT19 impact driver with a teal body and attached bit holder.',
      confidence: { make: 'high', model: 'high', serialNumber: 'high', category: 'high', condition: 'medium' }
    }) }] } }]
  }, 200, async () => {
    const { res, result } = createResponse();
    await handler({ method: 'POST', body: { photos: [{ uri: 'data:image/jpeg;base64,photo' }], itemContext: { location: 'Garage', room: 'Workbench' }, includeValuation: true } }, res);
    const output = result();
    const payload = output.payload as any;
    assert.equal(output.statusCode, 200);
    assert.equal(payload.providersUsed[0], 'gemini-vision');
    assert.equal(payload.draft.userDescription, 'Makita XDT19 impact driver with a teal body and attached bit holder.');
    assert.equal(payload.draft.make, 'Makita');
    assert.equal(payload.draft.model, 'XDT19');
    assert.equal(payload.draft.serialNumber, 'VERIFY-MKT-48291');
    assert.equal(payload.needsSerialVerification, true);
    assert.match(payload.warnings.join(' '), /must be reviewed/i);
    assert.equal(payload.valuation.suggestedReplacementValue > 0, true);
  });
});

test('provider recognition preserves distinct detected items for user selection', async () => {
  await withGeminiFetch({
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      itemName: 'Makita XDT19 impact driver', category: 'Tools', make: 'Makita', model: 'XDT19', observedText: { make: 'Makita', model: 'XDT19' }, condition: 'used',
      detectedItems: [
        { itemName: 'Makita XDT19 impact driver', category: 'Tools', make: 'Makita', model: 'XDT19', observedText: { make: 'Makita', model: 'XDT19' }, condition: 'used' },
        { itemName: 'DeWalt DCB205 battery pack', category: 'Tools', make: 'DeWalt', model: 'DCB205', observedText: { make: 'DeWalt', model: 'DCB205' }, condition: 'used' }
      ]
    }) }] } }]
  }, 200, async () => {
    const { res, result } = createResponse();
    await handler({ method: 'POST', body: { photos: [{ uri: 'data:image/jpeg;base64,photo' }], includeValuation: false } }, res);
    const payload = result().payload as any;
    assert.equal(payload.candidates.length, 2);
    assert.deepEqual(payload.candidates.map((candidate: any) => candidate.itemName), ['Makita XDT19 impact driver', 'DeWalt DCB205 battery pack']);
  });
});

test('ungrounded make, model, and serial suggestions are removed while the photo still receives a useful description', async () => {
  await withGeminiFetch({
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      itemName: 'Cordless drill', category: 'Tools', make: 'Invented Brand', model: 'ZX-9000', serialNumber: 'NOT-VISIBLE',
      distinguishingFeatures: 'Red and black handheld drill with a battery pack', condition: 'used'
    }) }] } }]
  }, 200, async () => {
    const { res, result } = createResponse();
    await handler({ method: 'POST', body: { photos: [{ uri: 'data:image/jpeg;base64,photo' }], includeValuation: false } }, res);
    const payload = result().payload as any;
    assert.equal(payload.draft.make, '');
    assert.equal(payload.draft.model, '');
    assert.equal(payload.draft.serialNumber, '');
    assert.match(payload.suggestedDescription, /Photo shows Cordless drill/i);
    assert.match(payload.suggestedDescription, /Red and black handheld drill/i);
    assert.doesNotMatch(payload.suggestedDescription, /Photo analysis created this draft/i);
  });
});

test('an unmistakable visible logo can suggest a make without inventing a model', async () => {
  await withGeminiFetch({
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      itemName: 'Laptop', category: 'Electronics', make: 'Apple', model: 'MacBook Pro',
      observedBrandLogo: 'Apple', distinguishingFeatures: 'Silver laptop with a visible Apple logo'
    }) }] } }]
  }, 200, async () => {
    const { res, result } = createResponse();
    await handler({ method: 'POST', body: { photos: [{ uri: 'data:image/jpeg;base64,photo' }], includeValuation: false } }, res);
    const payload = result().payload as any;
    assert.equal(payload.draft.make, 'Apple');
    assert.equal(payload.draft.model, '');
    assert.match(payload.warnings.join(' '), /visible brand logo/i);
  });
});

test('a non-retryable provider error never becomes a fabricated successful description', async () => {
  await withGeminiFetch({ error: { message: 'invalid request' } }, 400, async () => {
    const { res, result } = createResponse();
    await handler({ method: 'POST', body: { photos: [{ uri: 'data:image/jpeg;base64,photo' }], includeValuation: false } }, res);
    const output = result();
    assert.equal(output.statusCode, 500);
    assert.equal((output.payload as any).code, 'AI_PROVIDER_REQUEST_FAILED');
    assert.match((output.payload as any).error, /Photo analysis failed: 400/);
  });
});
