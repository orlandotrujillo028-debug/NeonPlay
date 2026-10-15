import { describe, expect, it } from 'vitest';
import { reconcileCart } from './cart';
import type { CartItem, Game } from './types';

const item: CartItem = {
  gameId: 'game',
  platformId: 'pc',
  platformName: 'PC anterior',
  name: 'Nombre anterior',
  slug: 'nexus',
  image: '/assets/nexus.png',
  price: 19.99,
  stock: 10,
  quantity: 2,
};
const game: Game = {
  id: 'game',
  name: 'Nombre actualizado',
  slug: 'nexus',
  description: 'Descripción del videojuego',
  price: '24.99',
  originalPrice: null,
  image: '/assets/titan.png',
  stock: 4,
  featured: false,
  rating: '4.5',
  releaseDate: '2026-10-15T00:00:00Z',
  archived: false,
  categoryId: 'category',
  category: { id: 'category', name: 'Acción' },
  platforms: [{ platformId: 'pc', platform: { id: 'pc', name: 'PC actualizado' } }],
};

describe('actualización del carrito', () => {
  it('actualiza los datos y el nombre de la plataforma conservando la cantidad elegida', () => {
    const [updated] = reconcileCart([item], new Map([[item.slug, game]]));
    expect(updated).toMatchObject({
      name: game.name,
      image: game.image,
      price: 24.99,
      stock: 4,
      platformName: 'PC actualizado',
      quantity: 2,
    });
    expect(item.price).toBe(19.99);
  });
  it('conserva juegos añadidos mientras la consulta de precios estaba pendiente', () => {
    const added = { ...item, gameId: 'other', slug: 'emberfall' };
    const updated = reconcileCart([item, added], new Map([[item.slug, game]]));
    expect(updated).toHaveLength(2);
    expect(updated[1]).toEqual(added);
  });
  it('no restaura un artículo eliminado antes de recibir la respuesta', () => {
    expect(reconcileCart([], new Map([[item.slug, game]]))).toEqual([]);
  });
  it('respeta las cantidades modificadas después de iniciar la consulta', () => {
    expect(
      reconcileCart([{ ...item, quantity: 1 }], new Map([[item.slug, game]]))[0].quantity,
    ).toBe(1);
  });
  it('marca un juego retirado como no disponible sin eliminarlo silenciosamente', () => {
    expect(reconcileCart([item], new Map([[item.slug, null]]))[0]).toMatchObject({
      gameId: item.gameId,
      quantity: 2,
      stock: 0,
    });
  });
  it('marca una plataforma retirada como no disponible', () => {
    expect(reconcileCart([item], new Map([[item.slug, { ...game, platforms: [] }]]))[0].stock).toBe(
      0,
    );
  });
});
