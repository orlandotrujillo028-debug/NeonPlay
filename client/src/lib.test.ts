import { describe, expect, it } from 'vitest';
import { cartTotal, readCart, calendarDate } from './lib';
const item = {
  gameId: 'game',
  platformId: 'pc',
  platformName: 'PC',
  name: 'Nexus',
  slug: 'nexus',
  image: '/assets/nexus.png',
  price: 19.99,
  stock: 10,
  quantity: 3,
};
describe('carrito persistido', () => {
  it('calcula importes en centavos y evita errores de coma flotante', () => {
    expect(cartTotal([item, { ...item, platformId: 'ps', price: 0.1, quantity: 3 }])).toBe(60.27);
  });
  it('recupera artículos válidos', () => {
    expect(readCart(JSON.stringify([item]))).toEqual([item]);
  });
  it('descarta JSON inválido y objetos que no son listas', () => {
    expect(readCart('{invalid')).toEqual([]);
    expect(readCart('{}')).toEqual([]);
  });
  it('descarta cantidades y precios manipulados', () => {
    expect(
      readCart(
        JSON.stringify([
          { ...item, quantity: -1 },
          { ...item, price: null },
          { ...item, quantity: 100 },
        ]),
      ),
    ).toEqual([]);
  });
  it('elimina variantes duplicadas', () => {
    expect(readCart(JSON.stringify([item, item]))).toHaveLength(1);
  });
  it('conserva el día de lanzamiento sin desplazarlo por zona horaria', () => {
    expect(calendarDate('2026-10-01T00:00:00.000Z')).toMatch(/^1 .*2026$/);
  });
});
