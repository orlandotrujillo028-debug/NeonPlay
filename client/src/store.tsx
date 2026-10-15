import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { CartItem, Game, User } from './types';
import { api, cartKey, readCart } from './lib';

type Store = {
  user: User | null;
  authReady: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  cart: CartItem[];
  add: (game: Game, platformId?: string) => void;
  changeQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clearCart: () => void;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  notify: (message: string, error?: boolean) => void;
};
const Context = createContext<Store | null>(null);
export const useStore = () => {
  const value = useContext(Context);
  if (!value) throw new Error('Store missing');
  return value;
};
export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(false);
  const [cart, setCartState] = useState<CartItem[]>(() => {
    try {
      return readCart(localStorage.getItem('neonplay-cart-v1'));
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartRef = useRef(cart);
  function setCart(next: SetStateAction<CartItem[]>) {
    const updated = typeof next === 'function' ? next(cartRef.current) : next;
    cartRef.current = updated;
    setCartState(updated);
  }
  useEffect(() => {
    const controller = new AbortController();
    api<User>('/auth/me', { signal: controller.signal })
      .then(setUser)
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setAuthReady(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('neonplay-cart-v1', JSON.stringify(cart));
    } catch {}
  }, [cart]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function notify(message: string, error = false) {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, error });
    timer.current = setTimeout(() => setToast(null), 4500);
  }
  function add(game: Game, platformId = game.platforms[0]?.platformId) {
    const platform = game.platforms.find((p) => p.platformId === platformId)?.platform;
    if (!platform || game.archived || game.stock < 1)
      return notify('Este videojuego no está disponible.', true);
    const current = cartRef.current,
      quantity = current.filter((i) => i.gameId === game.id).reduce((s, i) => s + i.quantity, 0);
    const key = `${game.id}:${platform.id}`,
      old = current.find((i) => cartKey(i) === key);
    if (quantity >= game.stock || (old?.quantity || 0) >= 99)
      return notify('Alcanzaste el stock disponible para este videojuego.', true);
    const item: CartItem = {
      gameId: game.id,
      platformId: platform.id,
      platformName: platform.name,
      name: game.name,
      slug: game.slug,
      image: game.image,
      price: Number(game.price),
      stock: game.stock,
      quantity: (old?.quantity || 0) + 1,
    };
    const next = old ? current.map((i) => (cartKey(i) === key ? item : i)) : [...current, item];
    setCart(next);
    notify(`${game.name} añadido al carrito.`);
  }
  function changeQuantity(key: string, quantity: number) {
    const current = cartRef.current,
      target = current.find((i) => cartKey(i) === key);
    if (!target) return;
    const others = current
      .filter((i) => i.gameId === target.gameId && cartKey(i) !== key)
      .reduce((s, i) => s + i.quantity, 0);
    if (
      quantity < 1 ||
      quantity > 99 ||
      (quantity + others > target.stock && quantity >= target.quantity)
    )
      return notify('La cantidad supera el stock disponible.', true);
    const next = current.map((i) => (cartKey(i) === key ? { ...i, quantity } : i));
    setCart(next);
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    notify('Sesión cerrada.');
  }
  return (
    <Context.Provider
      value={{
        user,
        authReady,
        setUser,
        logout,
        cart,
        add,
        changeQuantity,
        remove: (key) => setCart((c) => c.filter((i) => cartKey(i) !== key)),
        clearCart: () => setCart([]),
        setCart,
        notify,
      }}
    >
      {children}
      {toast && (
        <div className={`toast ${toast.error ? 'toast-error' : ''}`} role="status">
          <span>{toast.error ? '!' : '✓'}</span>
          {toast.message}
          <button onClick={() => setToast(null)} aria-label="Cerrar notificación">
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
