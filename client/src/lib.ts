import type { CartItem } from './types';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'No pudimos conectar con NeonPlay. Comprueba que la API esté iniciada.');
  }
  if (response.status === 204) return undefined as T;
  const result = await response
    .json()
    .catch(() => ({ message: 'Respuesta del servidor no válida.' }));
  if (!response.ok)
    throw new ApiError(response.status, result.message || 'No se pudo completar la operación.');
  return result as T;
}
export const money = (value: string | number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
export const date = (value: string) =>
  new Intl.DateTimeFormat('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  }).format(new Date(value));
export const calendarDate = (value: string) =>
  new Intl.DateTimeFormat('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo nuevamente.';
export const shortPlatform = (name: string) =>
  name
    .replace('PlayStation 5', 'PS5')
    .replace('Xbox Series', 'Xbox')
    .replace('Nintendo Switch', 'Switch');
export const cartKey = (item: Pick<CartItem, 'gameId' | 'platformId'>) =>
  `${item.gameId}:${item.platformId}`;
export const cartTotal = (cart: CartItem[]) =>
  cart.reduce((total, i) => total + Math.round(i.price * 100) * i.quantity, 0) / 100;
export function readCart(value: string | null): CartItem[] {
  try {
    const cart: unknown = JSON.parse(value || '[]');
    if (!Array.isArray(cart)) return [];
    const seen = new Set<string>();
    return cart
      .filter((item): item is CartItem => {
        if (!item || typeof item !== 'object') return false;
        const i = item as CartItem;
        if (
          ![i.gameId, i.platformId, i.platformName, i.name, i.slug, i.image].every(
            (x) => typeof x === 'string',
          ) ||
          !Number.isFinite(i.price) ||
          i.price <= 0 ||
          i.price > 9999.99 ||
          !Number.isInteger(i.quantity) ||
          i.quantity < 1 ||
          i.quantity > 99 ||
          !Number.isInteger(i.stock) ||
          i.stock < 0
        )
          return false;
        const key = cartKey(i);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 100);
  } catch {
    return [];
  }
}
