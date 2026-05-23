/* ─── PII Masking (demo / hackathon) ───
 * Local-only mapping of sensitive user input → a semantic token.
 *
 * Narrative for demo:
 *   "Your NRIC is encrypted on this device. The cloud only sees [NRIC_001]."
 *
 * This is not real cryptography — it's a Map kept in module memory. For a
 * real product you'd use WebCrypto AES-GCM keyed off a device secret, but
 * the storyline (and the displayed UX) is the same. */

export type PiiKind = 'nric' | 'phone' | 'email' | 'name' | 'address' | 'generic';

export interface MaskResult {
  /** The semantic placeholder uploaded to the cloud, e.g. "[NRIC_001]". */
  token: string;
  /** The redacted form shown in the UI, e.g. "S••••••A". */
  display: string;
  /** The kind we detected from the field name. */
  kind: PiiKind;
}

const store = new Map<string, string>(); // token → original value
const counters: Record<PiiKind, number> = {
  nric: 0,
  phone: 0,
  email: 0,
  name: 0,
  address: 0,
  generic: 0,
};

function detectKind(field: string): PiiKind {
  const f = field.toLowerCase();
  if (/(nric|fin|ic\b)/i.test(f)) return 'nric';
  if (/(phone|mobile|hp|tel)/i.test(f)) return 'phone';
  if (/email/i.test(f)) return 'email';
  if (/(name|姓名)/i.test(f)) return 'name';
  if (/(address|postal|地址)/i.test(f)) return 'address';
  return 'generic';
}

/** First + last char, middle replaced with bullets. Min 4 bullets, max 8. */
function redact(value: string): string {
  const v = value.trim();
  if (v.length <= 2) return '••';
  const head = v.charAt(0);
  const tail = v.charAt(v.length - 1);
  const middle = '•'.repeat(Math.min(8, Math.max(4, v.length - 2)));
  return `${head}${middle}${tail}`;
}

/** Mask a user-provided value. Stores the original locally and returns a token + display form. */
export function maskValue(field: string, value: string): MaskResult {
  const kind = detectKind(field);
  counters[kind] += 1;
  const token = `[${kind.toUpperCase()}_${String(counters[kind]).padStart(3, '0')}]`;
  store.set(token, value);
  return { token, display: redact(value), kind };
}

/** Look up the original value behind a token (used at submit time). */
export function unmaskValue(token: string): string | undefined {
  return store.get(token);
}

/** Wipe the local store + counter. Call when starting a fresh chat. */
export function resetPiiStore() {
  store.clear();
  counters.nric = 0;
  counters.phone = 0;
  counters.email = 0;
  counters.name = 0;
  counters.address = 0;
  counters.generic = 0;
}
