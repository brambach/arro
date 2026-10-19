/** The server's alphabet (private.new_join_code): no 0, O, 1, I or L. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** An 8-character code for a family kept on this phone (no server). */
export function makeJoinCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}
