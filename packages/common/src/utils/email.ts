import validate from 'validate.js';

/**
 * Real email validation requires emailing the user but we can validate a good portion of email addresses
 * @param s
 */
export function emailValid(s: string): boolean {
  return validate({ from: s }, { from: { email: true } }) === undefined;
}
