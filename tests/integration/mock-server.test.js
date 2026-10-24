// Starts the mock Bayline Loop server and sends real HTTP requests to it using
// the example client, so the two example scripts are tested together.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createMockServer } from '../../examples/mock-bayline-server.mjs';
import { buildConversion, sendConversion, signBody } from '../../examples/send-test-conversion.mjs';
import { DEMO_SIGNING_SECRET } from '../../src/lib/signature.js';

const run = promisify(execFile);
const clientScript = fileURLToPath(
  new URL('../../examples/send-test-conversion.mjs', import.meta.url),
);

let server;
let url;

beforeAll(async () => {
  server = createMockServer();
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://127.0.0.1:${server.address().port}/v1/conversions`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

/** Signs and sends an event with the given secret. */
function send(event, secret = DEMO_SIGNING_SECRET) {
  const body = typeof event === 'string' ? event : JSON.stringify(event);
  return sendConversion({ url, body, signature: signBody(body, secret) });
}

describe('mock Bayline Loop server + example client', () => {
  const event = buildConversion();

  it('accepts a valid signed event with 202', async () => {
    const response = await send(event);
    expect(response.status).toBe(202);
    expect(response.json).toEqual({ status: 'accepted', event_id: event.event_id });
  });

  it('rejects the same event_id again with 409', async () => {
    const response = await send(event);
    expect(response.status).toBe(409);
    expect(response.json).toMatchObject({ error: 'duplicate_event' });
  });

  it('rejects a bad signature with 401', async () => {
    const response = await send(buildConversion(), 'wrong-secret');
    expect(response.status).toBe(401);
  });

  it('rejects a missing signature with 401', async () => {
    const response = await sendConversion({ url, body: '{}', signature: '' });
    expect(response.status).toBe(401);
  });

  it('rejects invalid fields with 400 and lists the failed checks', async () => {
    const response = await send(buildConversion({ currency: 'US$' }));
    expect(response.status).toBe(400);
    expect(response.json.failed.map((f) => f.check)).toEqual(['currency_iso4217']);
  });

  it('rejects a body that is not JSON with 400', async () => {
    const response = await send('not json');
    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: 'invalid_json' });
  });

  it('answers 404 for other routes', async () => {
    const response = await fetch(url.replace('/v1/conversions', '/other'));
    expect(response.status).toBe(404);
  });

  it('the command-line client prints 202 for a good event', async () => {
    const { stdout } = await run(process.execPath, [clientScript], {
      env: { ...process.env, BAYLINE_URL: url },
    });
    expect(stdout).toMatch(/^202 /);
  });

  it('the command-line client prints 202 then 409 for a duplicate', async () => {
    const { stdout } = await run(process.execPath, [clientScript, 'duplicate'], {
      env: { ...process.env, BAYLINE_URL: url },
    });
    expect(
      stdout
        .trim()
        .split('\n')
        .map((line) => line.slice(0, 3)),
    ).toEqual(['202', '409']);
  });

  it('the command-line client prints 401 for a bad signature', async () => {
    const { stdout } = await run(process.execPath, [clientScript, 'bad-signature'], {
      env: { ...process.env, BAYLINE_URL: url },
    });
    expect(stdout).toMatch(/^401 /);
  });
});
