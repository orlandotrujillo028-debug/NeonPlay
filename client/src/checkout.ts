import type { CartItem } from './types';

export type CheckoutAttempt = { userId: string; fingerprint: string; key: string };
const storageKey = 'neonplay-checkout-v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function checkoutItems(cart: CartItem[]) {
  return cart
    .map((item) => ({
      gameId: item.gameId,
      platformId: item.platformId,
      quantity: item.quantity,
      expectedPrice: item.price,
    }))
    .sort((a, b) => a.gameId.localeCompare(b.gameId) || a.platformId.localeCompare(b.platformId));
}

export function prepareCheckoutAttempt(
  userId: string,
  cart: CartItem[],
  previous: CheckoutAttempt | null,
) {
  const fingerprint = JSON.stringify(checkoutItems(cart));
  if (previous?.userId === userId && previous.fingerprint === fingerprint) return previous;
  return { userId, fingerprint, key: crypto.randomUUID() };
}

export function loadCheckoutAttempt(): CheckoutAttempt | null {
  try {
    const attempt: unknown = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (!attempt || typeof attempt !== 'object') return null;
    const candidate = attempt as CheckoutAttempt;
    if (
      typeof candidate.userId !== 'string' ||
      !candidate.userId ||
      typeof candidate.fingerprint !== 'string' ||
      typeof candidate.key !== 'string' ||
      !uuid.test(candidate.key)
    )
      return null;
    return { userId: candidate.userId, fingerprint: candidate.fingerprint, key: candidate.key };
  } catch {
    return null;
  }
}

export function saveCheckoutAttempt(attempt: CheckoutAttempt) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(attempt));
  } catch {
    // The page also keeps the attempt in memory when browser storage is unavailable.
  }
}

export function clearCheckoutAttempt(key: string) {
  try {
    if (loadCheckoutAttempt()?.key === key) sessionStorage.removeItem(storageKey);
  } catch {}
}
