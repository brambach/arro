// The waitlist: POST /api/waitlist. parseSignup is the only place form
// fields are checked; past it the code trusts the Signup type.

/** @typedef {{ email: string, wantsBeta: boolean, source: 'hero' | 'closing' }} Signup */
/** @typedef {{ ok: true, signup: Signup } | { ok: true, bot: true } | { ok: false, reason: 'invalid_email' }} Parsed */

const SOURCES = ['hero', 'closing'];

/**
 * Raw form fields in, a Signup or a reason out. No I/O.
 * @param {URLSearchParams} fields
 * @returns {Parsed}
 */
export function parseSignup(fields) {
  if (fields.get('website')) return { ok: true, bot: true };

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
