import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api/join-waitlist.ts';

function createResponse() {
  let statusCode = 200;
  let payload: unknown;
  return {
    res: {
      status(code: number) { statusCode = code; return this; },
      json(body: unknown) { payload = body; },
      setHeader() { /* headers are not material to these tests */ }
    },
    result: () => ({ statusCode, payload })
  };
}

test('waitlist endpoint stores a validated interest record without exposing service credentials', async () => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let requestUrl = '';
  let requestBody: Record<string, unknown> = {};
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
  globalThis.fetch = async (url, init) => {
    requestUrl = String(url);
    requestBody = JSON.parse(String(init?.body));
    return new Response(null, { status: 201 });
  };

  try {
    const { res, result } = createResponse();
    await handler({ method: 'POST', body: { firstName: '  Nate ', email: 'NATE@EXAMPLE.COM', updatesOptIn: true } }, res);
    assert.equal(result().statusCode, 201);
    assert.match(requestUrl, /proofvault_waitlist\?on_conflict=email/);
    assert.equal(requestBody.first_name, 'Nate');
    assert.equal(requestBody.email, 'nate@example.com');
    assert.equal(requestBody.updates_opt_in, true);
    assert.equal(requestBody.launch_notification_consent, true);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});

test('waitlist endpoint rejects an invalid email before calling Supabase', async () => {
  const { res, result } = createResponse();
  await handler({ method: 'POST', body: { firstName: 'Nate', email: 'not-an-email' } }, res);
  assert.equal(result().statusCode, 400);
});
