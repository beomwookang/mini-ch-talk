const COOKIE = 'mctk_anon';
const LS_BACKUP = 'mctk_anon_backup';
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function generateAnonId(): string {
  const arr = crypto.getRandomValues(new Uint8Array(12));
  let id = 'anon_';
  for (const n of arr) id += ALPHABET[n % 62];
  return id;
}

export function readAnonIdFromBrowser(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(^|;\\s*)${COOKIE}=([^;]+)`));
  if (m) return m[2];
  return localStorage.getItem(LS_BACKUP);
}

export function writeAnonIdToBrowser(id: string): void {
  document.cookie = `${COOKIE}=${id}; Max-Age=31536000; Path=/; SameSite=Lax`;
  localStorage.setItem(LS_BACKUP, id);
}
