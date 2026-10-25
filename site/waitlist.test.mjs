// Tests for waitlist.js.
// Run: node --test site/waitlist.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSignup, handleWaitlist } from './waitlist.js';
import worker from './worker.js';

const parse = (fields) => parseSignup(new URLSearchParams(fields));
const signup = (email, wantsBeta = false, source = 'hero') => ({
  ok: true,
  signup: { email, wantsBeta, source },
});
const invalid = { ok: false, reason: 'invalid_email' };

test('parseSignup trims and lowercases the email', () => {
  assert.deepEqual(parse({ email: ' Maya@Example.COM ', source: 'hero' }), signup('maya@example.com'));
});

const badEmails = [
  ['empty', ''],
  ['only spaces', '   '],
  ['no @', 'maya.example.com'],
  ['two @', 'maya@home@example.com'],
  ['nothing before @', '@example.com'],
  ['no dot in domain', 'maya@example'],
  ['dot first in domain', 'maya@.example.com'],
  ['dot last in domain', 'maya@example.com.'],
  ['inner space', 'maya @example.com'],
  ['inner tab', 'maya@exa\tmple.com'],
  ['255 characters', `${'a'.repeat(243)}@example.com`],
];

for (const [name, email] of badEmails) {
  test(`parseSignup rejects an email with ${name}`, () => {
    assert.deepEqual(parse({ email, source: 'hero' }), invalid);
  });
}

test('parseSignup rejects a missing email', () => {
  assert.deepEqual(parse({ source: 'hero' }), invalid);
});

test('parseSignup accepts an email of exactly 254 characters', () => {
  const email = `${'a'.repeat(242)}@example.com`;
  assert.equal(email.length, 254);
  assert.deepEqual(parse({ email, source: 'hero' }), signup(email));
});

const betaValues = [
  ['1', true],
  ['0', false],
  ['true', false],
  ['on', false],
  [' 1', false],
  ['', false],
];

for (const [beta, wantsBeta] of betaValues) {
  test(`parseSignup reads beta=${JSON.stringify(beta)} as ${wantsBeta}`, () => {
    assert.deepEqual(parse({ email: 'jo@example.com', beta, source: 'hero' }), signup('jo@example.com', wantsBeta));
  });
}

test('parseSignup reads a missing beta as false', () => {
  assert.deepEqual(parse({ email: 'jo@example.com', source: 'hero' }), signup('jo@example.com', false));
});

for (const source of ['hero', 'closing']) {
  test(`parseSignup accepts source=${source}`, () => {
    assert.deepEqual(parse({ email: 'jo@example.com', source }), signup('jo@example.com', false, source));
  });
}

for (const source of ['', 'Hero', 'footer', ' hero']) {
  test(`parseSignup rejects source=${JSON.stringify(source)}`, () => {
    assert.deepEqual(parse({ email: 'jo@example.com', source }), invalid);
  });
}

test('parseSignup rejects a missing source', () => {
  assert.deepEqual(parse({ email: 'jo@example.com' }), invalid);
});

test('parseSignup returns bot when the honeypot is filled, even with a good email', () => {
  assert.deepEqual(parse({ email: 'jo@example.com', source: 'hero', website: 'x' }), { ok: true, bot: true });
});

test('parseSignup returns bot when the honeypot is filled and the rest is junk', () => {
  assert.deepEqual(parse({ website: 'https://example.com' }), { ok: true, bot: true });
});

test('parseSignup ignores an empty honeypot', () => {
  assert.deepEqual(parse({ email: 'jo@example.com', source: 'closing', website: '' }), signup('jo@example.com', false, 'closing'));
});

// A fake D1 that keeps one row per email, like the real primary key, and
// records every statement it runs.
function fakeDb({ fail = false } = {}) {
  const rows = new Map();
  const statements = [];
  const run = async (sql, params) => {
    statements.push({ sql, params });
    if (fail) throw new Error('D1_ERROR: database is locked');
    if (sql.startsWith('INSERT')) {
      const [email, wantsBeta, source] = params;
      if (rows.has(email)) return { meta: { changes: 0 } };
      rows.set(email, { wantsBeta, source });
      return { meta: { changes: 1 } };
    }
    const row = rows.get(params[0]);
    if (row) row.wantsBeta = 1;
    return { meta: { changes: row ? 1 : 0 } };
  };
  return {
    rows,
    statements,
    prepare: (sql) => ({ bind: (...params) => ({ run: () => run(sql, params) }) }),
  };
}

function fakeLimiter(success = true) {
  const keys = [];
  return {
    keys,
    limit: async ({ key }) => {
      keys.push(key);
      return { success };
    },
  };
}

const API = 'https://saunafam.com/api/waitlist';
const FORM = 'application/x-www-form-urlencoded';
const good = { email: 'Jo@Example.com', source: 'hero' };
const env = (db = fakeDb(), limiter = fakeLimiter()) => ({ DB: db, WAITLIST_LIMIT: limiter });

/** A request as the page's JS (json) or a plain form post sends it. length null leaves Content-Length out. */
function post(fields, { json = true, type = FORM, length, method = 'POST', headers = {} } = {}) {
  const body = method === 'GET' ? undefined : new URLSearchParams(fields).toString();
  const h = new Headers(headers);
  if (type) h.set('Content-Type', type);
  if (json) h.set('Accept', 'application/json');
  if (length !== null && body !== undefined) h.set('Content-Length', length ?? String(Buffer.byteLength(body)));
  return new Request(API, { method, headers: h, body });
}

async function readJson(res) {
  assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  return res.json();
}

test('a new email gives 201 joined and one row', async () => {
  const e = env();
  const res = await handleWaitlist(post(good), e);
  assert.equal(res.status, 201);
  assert.deepEqual(await readJson(res), { status: 'joined' });
  assert.deepEqual([...e.DB.rows], [['jo@example.com', { wantsBeta: 0, source: 'hero' }]]);
});

test('the same email again gives 200 already, no second row and no update', async () => {
  const e = env();
  await handleWaitlist(post(good), e);
  const res = await handleWaitlist(post({ ...good, source: 'closing' }), e);
  assert.equal(res.status, 200);
  assert.deepEqual(await readJson(res), { status: 'already' });
  assert.equal(e.DB.rows.size, 1);
  assert.equal(e.DB.rows.get('jo@example.com').source, 'hero');
  assert.deepEqual(e.DB.statements.map((s) => s.sql.split(' ')[0]), ['INSERT', 'INSERT']);
});

test('the same email again with beta=1 sets wants_beta', async () => {
  const e = env();
  await handleWaitlist(post(good), e);
  const res = await handleWaitlist(post({ ...good, beta: '1' }), e);
  assert.equal(res.status, 200);
  assert.deepEqual(await readJson(res), { status: 'already' });
  assert.deepEqual(e.DB.statements.at(-1), {
    sql: 'UPDATE waitlist SET wants_beta = 1 WHERE email = ?1',
    params: ['jo@example.com'],
  });
  assert.equal(e.DB.rows.get('jo@example.com').wantsBeta, 1);
});

test('a new email with beta=1 is stored with wants_beta 1 in one statement', async () => {
  const e = env();
  const res = await handleWaitlist(post({ ...good, beta: '1' }), e);
  assert.equal(res.status, 201);
  assert.equal(e.DB.statements.length, 1);
  assert.equal(e.DB.rows.get('jo@example.com').wantsBeta, 1);
});

test('a filled honeypot gives 200 joined and writes nothing', async () => {
  const e = env();
  const res = await handleWaitlist(post({ ...good, website: 'x' }), e);
  assert.equal(res.status, 200);
  assert.deepEqual(await readJson(res), { status: 'joined' });
  assert.equal(e.DB.statements.length, 0);
});

test('a bad email gives 400 invalid_email and writes nothing', async () => {
  const e = env();
  const res = await handleWaitlist(post({ email: 'nope', source: 'hero' }), e);
  assert.equal(res.status, 400);
  assert.deepEqual(await readJson(res), { status: 'invalid_email' });
  assert.equal(e.DB.statements.length, 0);
});

test('the limiter saying no gives 429 slow_down and no DB call', async () => {
  const e = env(fakeDb(), fakeLimiter(false));
  const res = await handleWaitlist(post(good), e);
  assert.equal(res.status, 429);
  assert.deepEqual(await readJson(res), { status: 'slow_down' });
  assert.equal(e.DB.statements.length, 0);
});

test('the limiter is keyed on CF-Connecting-IP, or "local" without it', async () => {
  const e = env();
  await handleWaitlist(post(good, { headers: { 'CF-Connecting-IP': '203.0.113.7' } }), e);
  await handleWaitlist(post(good), e);
  assert.deepEqual(e.WAITLIST_LIMIT.keys, ['203.0.113.7', 'local']);
});

test('GET gives 405 with Allow: POST', async () => {
  const e = env();
  const res = await handleWaitlist(post({}, { method: 'GET', type: null }), e);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'POST');
  assert.deepEqual(await readJson(res), { status: 'method_not_allowed' });
  assert.equal(e.WAITLIST_LIMIT.keys.length, 0);
});

test('a JSON body gives 415 unsupported', async () => {
  const e = env();
  const res = await handleWaitlist(post(good, { type: 'application/json' }), e);
  assert.equal(res.status, 415);
  assert.deepEqual(await readJson(res), { status: 'unsupported' });
  assert.equal(e.WAITLIST_LIMIT.keys.length, 0);
});

test('form encoding with a charset parameter is accepted', async () => {
  const res = await handleWaitlist(post(good, { type: `${FORM}; charset=UTF-8` }), env());
  assert.equal(res.status, 201);
});

for (const [name, length] of [['missing', null], ['over 2048', '2049'], ['non-numeric', 'abc']]) {
  test(`a ${name} Content-Length gives 413 too_large`, async () => {
    const e = env();
    const res = await handleWaitlist(post(good, { length }), e);
    assert.equal(res.status, 413);
    assert.deepEqual(await readJson(res), { status: 'too_large' });
    assert.equal(e.WAITLIST_LIMIT.keys.length, 0);
  });
}

test('a D1 error gives 500 error and logs without the email', async (t) => {
  const logged = [];
  t.mock.method(console, 'error', (...args) => logged.push(args.join(' ')));
  const res = await handleWaitlist(post(good), env(fakeDb({ fail: true })));
  assert.equal(res.status, 500);
  assert.deepEqual(await readJson(res), { status: 'error' });
  assert.equal(logged.length, 1);
  assert.ok(!logged[0].toLowerCase().includes('jo@example.com'), logged[0]);
});

function listed() {
  const db = fakeDb();
  db.rows.set('jo@example.com', { wantsBeta: 0, source: 'hero' });
  return db;
}

// No Accept: application/json, as a plain HTML form posts. page null means
// the same JSON response as the JS caller gets.
const formCases = [
  ['a new email', post(good, { json: false }), env, 303, '/thanks/'],
  ['an email already on the list', post(good, { json: false }), () => env(listed()), 303, '/thanks/'],
  ['a filled honeypot', post({ ...good, website: 'x' }, { json: false }), env, 303, '/thanks/'],
  ['a bad email', post({ email: 'nope', source: 'hero' }, { json: false }), env, 303, '/#join-bad'],
  ['the limiter saying no', post(good, { json: false }), () => env(fakeDb(), fakeLimiter(false)), 303, '/#join-later'],
  ['a D1 error', post(good, { json: false }), () => env(fakeDb({ fail: true })), 303, '/#join-later'],
  ['a missing Content-Length', post(good, { json: false, length: null }), env, 413, null],
  ['a JSON body', post(good, { json: false, type: 'application/json' }), env, 415, null],
  ['GET', post({}, { json: false, method: 'GET', type: null }), env, 405, null],
];

for (const [name, req, makeEnv, status, page] of formCases) {
  test(`form post: ${name} gives ${status}${page ? ` to ${page}` : ''}`, async (t) => {
    t.mock.method(console, 'error', () => {});
    const res = await handleWaitlist(req, makeEnv());
    assert.equal(res.status, status);
    if (page) {
      assert.equal(res.headers.get('Location'), `https://saunafam.com${page}`);
    } else {
      assert.equal(res.headers.get('Location'), null);
      assert.equal(typeof (await readJson(res)).status, 'string');
    }
  });
}

test('worker.js sends POST /api/waitlist to the handler', async () => {
  const e = env();
  const res = await worker.fetch(post(good), e);
  assert.equal(res.status, 201);
  assert.ok(e.DB.rows.has('jo@example.com'));
});

test('worker.js answers GET /api/waitlist with 405, not a file', async () => {
  const res = await worker.fetch(new Request(API), env());
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'POST');
});

test('worker.js still redirects www before the waitlist route', async () => {
  const e = env();
  const res = await worker.fetch(new Request('https://www.saunafam.com/api/waitlist', { method: 'POST' }), e);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://saunafam.com/api/waitlist');
  assert.equal(e.WAITLIST_LIMIT.keys.length, 0);
});
