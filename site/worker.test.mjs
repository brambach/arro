// Tests for worker.js's routing, with a fake ASSETS binding.
// Run: node --test site/worker.test.mjs
// (wrangler dev rewrites every request to one host, so the hostname
// redirects can't be seen there. This checks them directly.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

const served = [];
const env = {
  ASSETS: {
    fetch: async (req) => {
      const url = typeof req === 'string' ? req : req.url ?? String(req);
      served.push(new URL(url).pathname);
      return new Response('asset', { status: 200 });
    },
  },
};
const get = (url) => worker.fetch(new Request(url), env);

const cases = [
  ['https://arrofamily.com/', 'https://saunafam.com/'],
  ['https://arrofamily.com/privacy/', 'https://saunafam.com/privacy/'],
  ['https://www.arrofamily.com/support/?a=1&b=2', 'https://saunafam.com/support/?a=1&b=2'],
  ['http://arrofamily.com/join/ABC23456', 'https://saunafam.com/join/ABC23456'],
  ['https://ARROFAMILY.com/join/?code=abc23456', 'https://saunafam.com/join/?code=abc23456'],
  ['https://www.saunafam.com/privacy/', 'https://saunafam.com/privacy/'],
  ['http://saunafam.com/support/?x=1', 'https://saunafam.com/support/?x=1'],
  ['https://saunafam.com/join/abc23456/', 'https://saunafam.com/join/abc23456'],
  ['https://saunafam.com/join/?code=abc23456', 'https://saunafam.com/join/ABC23456'],
];

for (const [from, to] of cases) {
  test(`301 ${from}`, async () => {
    const res = await get(from);
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('Location'), to);
  });
}

test('the apex serves files as they are', async () => {
  served.length = 0;
  const res = await get('https://saunafam.com/privacy/');
  assert.equal(res.status, 200);
  assert.deepEqual(served, ['/privacy/']);
});

test('/join/<code> serves the join page', async () => {
  served.length = 0;
  const res = await get('https://saunafam.com/join/ABC23456');
  assert.equal(res.status, 200);
  assert.deepEqual(served, ['/join/']);
});

test('a code with other characters is left to the files (404)', async () => {
  served.length = 0;
  await get('https://saunafam.com/join/AB%3Cx%3E');
  assert.deepEqual(served, ['/join/AB%3Cx%3E']);
});
