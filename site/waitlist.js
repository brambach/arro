// The waitlist: POST /api/waitlist. parseSignup is the only place form
// fields are checked; past it the code trusts the Signup type.

/** @typedef {{ email: string, wantsBeta: boolean, source: 'hero' | 'closing' }} Signup */
/** @typedef {{ ok: true, signup: Signup } | { ok: true, bot: true } | { ok: false, reason: 'invalid_email' }} Parsed */

const SOURCES = ['hero', 'closing'];
const MAX_BODY = 2048;

// Every way a post can end. `code` and `status` go to the JS caller as JSON;
// a plain form post goes to `page` instead, or gets the JSON when there's no
// page. A new email, one already on the list and a bot all end as `joined`,
// so neither the API nor the page says whether an email was on the list.
const OUTCOMES = {
  joined: { code: 200, status: 'joined', page: '/thanks/' },
  invalid: { code: 400, status: 'invalid_email', page: '/#join-bad' },
  slowDown: { code: 429, status: 'slow_down', page: '/#join-later' },
  lengthRequired: { code: 411, status: 'length_required' },
  tooLarge: { code: 413, status: 'too_large' },
  unsupported: { code: 415, status: 'unsupported' },
  method: { code: 405, status: 'method_not_allowed' },
  error: { code: 500, status: 'error', page: '/#join-later' },
};

const INSERT = `INSERT INTO waitlist (email, wants_beta, source) VALUES (?1, ?2, ?3)
ON CONFLICT(email) DO NOTHING`;
const SET_BETA = 'UPDATE waitlist SET wants_beta = 1 WHERE email = ?1';

/**
 * POST /api/waitlist. The IP is only the rate limit key and the email only
 * goes to D1; neither is logged.
 * @param {Request} request
 * @param {{ DB: D1Database, WAITLIST_LIMIT: RateLimit }} env
 */
export async function handleWaitlist(request, env) {
  return respond(request, await decide(request, env));
}

/** @returns {Promise<keyof typeof OUTCOMES>} */
async function decide(request, env) {
  if (request.method !== 'POST') return 'method';

  const type = (request.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/x-www-form-urlencoded') return 'unsupported';

  const length = request.headers.get('Content-Length');
  if (length === null) return 'lengthRequired';
  if (!/^\d+$/.test(length) || Number(length) > MAX_BODY) return 'tooLarge';

  const body = await readBody(request);
  if (body === null) return 'tooLarge';

  const key = request.headers.get('CF-Connecting-IP') || 'local';
  const { success } = await env.WAITLIST_LIMIT.limit({ key });
  if (!success) return 'slowDown';

  const parsed = parseSignup(new URLSearchParams(body));
  if (!parsed.ok) return 'invalid';
  if ('bot' in parsed) return 'joined';

  const { email, wantsBeta, source } = parsed.signup;
  try {
    const { meta } = await env.DB.prepare(INSERT).bind(email, wantsBeta ? 1 : 0, source).run();
    if (meta.changes === 0 && wantsBeta) await env.DB.prepare(SET_BETA).bind(email).run();
    return 'joined';
  } catch (err) {
    console.error('waitlist write failed:', err instanceof Error ? err.message : 'unknown error');
    return 'error';
  }
}

/**
 * The body as text, or null past MAX_BODY bytes. Counts the bytes that
 * arrive, so a Content-Length that undercounts can't get more through.
 * @param {Request} request
 * @returns {Promise<string | null>}
 */
async function readBody(request) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

function respond(request, name) {
  const { code, status, page } = OUTCOMES[name];
  const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');
  if (page && !wantsJson) {
    return new Response(null, { status: 303, headers: { Location: page } });
  }
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  if (name === 'method') headers.Allow = 'POST';
  return new Response(JSON.stringify({ status }), { status: code, headers });
}

/**
 * @param {URLSearchParams} fields
 * @returns {Parsed}
 */
export function parseSignup(fields) {
  if (fields.get('hp_field_x')) return { ok: true, bot: true };

  const email = (fields.get('email') ?? '').trim().toLowerCase();
  const source = fields.get('source');
  if (!isEmail(email) || !SOURCES.includes(source)) {
    return { ok: false, reason: 'invalid_email' };
  }
  return {
    ok: true,
    signup: { email, wantsBeta: fields.get('beta') === '1', source },
  };
}

/** @param {string} email already trimmed and lowercased */
function isEmail(email) {
  if (email.length > 254 || /\s/.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  const dot = domain.indexOf('.');
  return local !== '' && dot > 0 && !domain.endsWith('.');
}
