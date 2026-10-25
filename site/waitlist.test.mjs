// Tests for waitlist.js.
// Run: node --test site/waitlist.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSignup } from './waitlist.js';

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
