import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  prepareCheckoutAttempt,
  loadCheckoutAttempt,
  saveCheckoutAttempt,
  clearCheckoutAttempt,
} from './checkout';
import type { CartItem } from './types';

const item: CartItem = {
  gameId: 'nexus',
  platformId: 'pc',
  platformName: 'PC',
  name: 'Nexus',
  slug: 'nexus',
  image: '/assets/nexus.png',
  price: 19.99,
  stock: 5,
  quantity: 1,
};
function storage() {
  const entries = new Map<string, string>();
  const value = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  };
  vi.stubGlobal('sessionStorage', value);
  return entries;
}
afterEach(() => vi.unstubAllGlobals());

describe('reintentos de compra', () => {
  it('conserva la clave después de guardar y recuperar un intento al recargar', () => {
    storage();
    const attempt = prepareCheckoutAttempt('customer', [item], null);
    saveCheckoutAttempt(attempt);
    const retry = prepareCheckoutAttempt('customer', [item], loadCheckoutAttempt());
    expect(retry.key).toBe(attempt.key);
  });
  it('no inicia otra compra al actualizar nombres, imágenes, stock u orden de las líneas', () => {
    const other = { ...item, gameId: 'emberfall', slug: 'emberfall' };
    const attempt = prepareCheckoutAttempt('customer', [item, other], null);
    const retry = prepareCheckoutAttempt(
      'customer',
      [
        other,
        {
          ...item,
          name: 'Nombre actualizado',
          platformName: 'Nuevo nombre de plataforma',
          stock: 4,
          image: '/assets/titan.png',
        },
      ],
      attempt,
    );
    expect(retry.key).toBe(attempt.key);
  });
  it.each([
    { ...item, quantity: 2 },
    { ...item, price: 24.99 },
    { ...item, platformId: 'ps5' },
    { ...item, gameId: 'emberfall' },
  ])('genera una clave nueva si cambia el contenido de la compra: %j', (changed) => {
    const attempt = prepareCheckoutAttempt('customer', [item], null);
    expect(prepareCheckoutAttempt('customer', [changed], attempt).key).not.toBe(attempt.key);
  });
  it('no reutiliza una solicitud de otra cuenta', () => {
    const attempt = prepareCheckoutAttempt('customer-a', [item], null);
    expect(prepareCheckoutAttempt('customer-b', [item], attempt).key).not.toBe(attempt.key);
  });
  it('retira el intento completado para permitir una compra posterior igual', () => {
    storage();
    const attempt = prepareCheckoutAttempt('customer', [item], null);
    saveCheckoutAttempt(attempt);
    clearCheckoutAttempt(attempt.key);
    expect(loadCheckoutAttempt()).toBeNull();
    expect(prepareCheckoutAttempt('customer', [item], loadCheckoutAttempt()).key).not.toBe(
      attempt.key,
    );
  });
  it('la respuesta de una compra anterior no borra un intento más reciente', () => {
    storage();
    const old = prepareCheckoutAttempt('customer', [item], null);
    const current = prepareCheckoutAttempt('customer', [{ ...item, quantity: 2 }], old);
    saveCheckoutAttempt(current);
    clearCheckoutAttempt(old.key);
    expect(loadCheckoutAttempt()).toEqual(current);
  });
  it.each(['{invalid', '[]', 'null', '{"userId":"customer","fingerprint":"[]","key":"invalid"}'])(
    'descarta intentos guardados inválidos: %s',
    (value) => {
      const entries = storage();
      const attempt = prepareCheckoutAttempt('customer', [item], null);
      saveCheckoutAttempt(attempt);
      for (const key of entries.keys()) entries.set(key, value);
      expect(loadCheckoutAttempt()).toBeNull();
    },
  );
  it('mantiene los reintentos en memoria cuando el navegador bloquea su almacenamiento', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    const attempt = prepareCheckoutAttempt('customer', [item], loadCheckoutAttempt());
    expect(() => saveCheckoutAttempt(attempt)).not.toThrow();
    expect(prepareCheckoutAttempt('customer', [item], attempt).key).toBe(attempt.key);
    expect(() => clearCheckoutAttempt(attempt.key)).not.toThrow();
  });
});
