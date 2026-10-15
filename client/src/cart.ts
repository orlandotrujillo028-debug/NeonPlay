import type { CartItem, Game } from './types';

export function reconcileCart(
  cart: CartItem[],
  games: ReadonlyMap<string, Game | null>,
): CartItem[] {
  return cart.map((item) => {
    // Requests may finish after a different page added or removed another game.
    if (!games.has(item.slug)) return item;
    const game = games.get(item.slug);
    const platform = game?.platforms.find((p) => p.platformId === item.platformId)?.platform;
    if (!game || !platform) return { ...item, stock: 0 };
    return {
      ...item,
      name: game.name,
      image: game.image,
      price: Number(game.price),
      stock: game.stock,
      platformName: platform.name,
    };
  });
}
