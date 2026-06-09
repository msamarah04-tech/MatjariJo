/**
 * Jordan mobile phone validation/normalization, shared by backend (API boundary)
 * and frontend (form validation). Jordan mobile numbers are +962 7[789] xxxxxxx,
 * i.e. national form 07[789] followed by 7 digits.
 */

/** Returns the canonical international form (+9627XXXXXXXX) or null if invalid. */
export function normalizeJordanMobile(input: string): string | null {
  const cleaned = input.replace(/[^\d+]/g, '');
  let local: string;
  if (cleaned.startsWith('+962')) local = `0${cleaned.slice(4)}`;
  else if (cleaned.startsWith('00962')) local = `0${cleaned.slice(5)}`;
  else if (cleaned.startsWith('962')) local = `0${cleaned.slice(3)}`;
  else local = cleaned;
  // Tolerate a missing leading zero on the national form (7XXXXXXXX).
  if (/^7[789]\d{7}$/.test(local)) local = `0${local}`;
  if (!/^07[789]\d{7}$/.test(local)) return null;
  return `+962${local.slice(1)}`;
}

export function isJordanMobile(input: string): boolean {
  return normalizeJordanMobile(input) !== null;
}

/** Human-friendly national display: 07X XXX XXXX. */
export function formatJordanMobile(input: string): string {
  const canonical = normalizeJordanMobile(input);
  if (!canonical) return input;
  const national = `0${canonical.slice(4)}`;
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}
