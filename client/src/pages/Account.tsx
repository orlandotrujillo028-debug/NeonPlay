import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  UserRound,
  Package,
  Gamepad2,
  LayoutDashboard,
} from 'lucide-react';
import { useStore } from '../store';
import { api, ApiError, cartKey, cartTotal, date, errorMessage, money } from '../lib';
import type { Game, Order, User } from '../types';
import { useApi } from '../hooks';
import { Empty, ErrorState, GameImage, Loading, StatusBadge } from '../components';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, setUser, notify, authReady } = useStore(),
    navigate = useNavigate(),
    location = useLocation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [visible, setVisible] = useState(false);
  const from =
    typeof location.state?.from === 'string' &&
    location.state.from.startsWith('/') &&
    !location.state.from.startsWith('//')
      ? location.state.from
      : '/account';
  if (authReady && user) return <Navigate to={from} replace />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
    };
    try {
      const account = await api<User>(register ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setUser(account);
      notify(register ? 'Tu cuenta está lista. ¡Bienvenido a NeonPlay!' : '¡Bienvenido de nuevo!');
      navigate(from, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container auth-page">
      <section className="auth-art">
        <img src="/assets/nexus.png" alt="Ciudad futurista del universo Nexus" />
        <div />
        <span className="eyebrow">TU PRÓXIMA HISTORIA</span>
        <h2>
          Hay mundos
          <br />
          que solo esperan
          <br />
          <span>por ti.</span>
        </h2>
        <p>Un solo lugar. Todas tus aventuras.</p>
        <span className="auth-art-brand">NEONPLAY // PLAYER ACCESS</span>
      </section>
      <section className="auth-form">
        <span className="eyebrow">{register ? 'CREA TU PLAYER ID' : 'PLAYER ACCESS'}</span>
        <h1>{register ? 'Comienza tu aventura.' : 'Qué bueno verte.'}</h1>
        <p>
          {register
            ? 'Crea tu cuenta y descubre tu próximo universo.'
            : 'Inicia sesión y continúa donde lo dejaste.'}
        </p>
        <form onSubmit={submit} key={register ? 'register' : 'login'}>
          {register && (
            <label className="field">
              Tu nombre
              <input
                name="name"
                autoComplete="name"
                placeholder="¿Cómo te llamamos?"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
          )}
          <label className="field">
            Correo electrónico
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="player@ejemplo.com"
              required
              maxLength={160}
            />
          </label>
          <label className="field">
            Contraseña
            <span className="password-input">
              <input
                name="password"
                type={visible ? 'text' : 'password'}
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder={register ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                required
                minLength={8}
                maxLength={72}
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary full-width" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <>
                {register ? 'Crear mi cuenta' : 'Entrar a NeonPlay'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        <div className="auth-switch">
          {register ? '¿Ya tienes cuenta?' : '¿Primera vez por aquí?'}{' '}
          <Link to={register ? '/login' : '/register'} state={{ from }}>
            {register ? 'Inicia sesión' : 'Crea tu cuenta'}
          </Link>
        </div>
        <div className="auth-security">
          <ShieldCheck size={15} /> Tu sesión y tus datos, protegidos.
        </div>
      </section>
    </div>
  );
}

export function CartPage() {
  const { cart, remove, changeQuantity, setCart, clearCart, user, setUser, notify } = useStore(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState('');
  const checkoutKey = useRef(crypto.randomUUID());
  useEffect(() => {
    checkoutKey.current = crypto.randomUUID();
    setError('');
  }, [cart]);
  const total = cartTotal(cart);
  const invalid = cart.some(
    (i) => cart.filter((c) => c.gameId === i.gameId).reduce((s, c) => s + c.quantity, 0) > i.stock,
  );
  async function refresh() {
    setRefreshing(true);
    setError('');
    try {
      const slugs = [...new Set(cart.map((i) => i.slug))];
      const results = await Promise.all(
        slugs.map(async (slug) => {
          try {
            return { slug, game: await api<Game>('/games/' + slug) };
          } catch (e) {
            if (e instanceof ApiError && e.status === 404) return { slug, game: null };
            throw e;
          }
        }),
      );
      setCart(
        cart.map((item) => {
          const game = results.find((r) => r.slug === item.slug)?.game;
          return game && game.platforms.some((p) => p.platformId === item.platformId)
            ? {
                ...item,
                name: game.name,
                image: game.image,
                price: Number(game.price),
                stock: game.stock,
              }
            : { ...item, stock: 0 };
        }),
      );
      notify('Precios y disponibilidad actualizados.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }
  async function checkout() {
    if (!user) return navigate('/login', { state: { from: '/cart' } });
    setBusy(true);
    setError('');
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: checkoutKey.current,
          items: cart.map((i) => ({
            gameId: i.gameId,
            platformId: i.platformId,
            quantity: i.quantity,
            expectedPrice: i.price,
          })),
        }),
      });
      clearCart();
      notify('Compra de demostración completada.');
      navigate('/orders?success=' + order.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        navigate('/login', { state: { from: '/cart' } });
      } else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container inner-page">
      <div className="breadcrumb">
        <Link to="/">Inicio</Link>
        <ChevronRight size={13} /> Mi carrito
      </div>
      <div className="page-title">
        <span className="eyebrow">PREPARA TU PRÓXIMA MISIÓN</span>
        <h1>
          Tu carrito<span>.</span>
        </h1>
        <p>
          {cart.reduce((s, i) => s + i.quantity, 0)}{' '}
          {cart.reduce((s, i) => s + i.quantity, 0) === 1
            ? 'videojuego listo'
            : 'videojuegos listos'}{' '}
          para tu próxima aventura.
        </p>
      </div>
      {!cart.length ? (
        <Empty
          title="Tu próxima aventura aún no está aquí"
          text="Explora el catálogo y añade tus videojuegos favoritos."
        />
      ) : (
        <div className="cart-layout">
          <section className="cart-items">
            <div className="cart-toolbar">
              <h3>Tus videojuegos</h3>
              <button className="text-link" onClick={refresh} disabled={refreshing || busy}>
                <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Actualizar precios y
                stock
              </button>
            </div>
            {cart.map((item) => (
              <article className="cart-item" key={cartKey(item)}>
                <Link to={'/game/' + item.slug}>
                  <GameImage src={item.image} alt={item.name} />
                </Link>
                <div className="cart-item-info">
                  <span className="eyebrow">{item.platformName}</span>
                  <Link to={'/game/' + item.slug}>{item.name}</Link>
                  <span className={item.stock === 0 ? 'form-error' : 'muted'}>
                    {item.stock === 0
                      ? 'No disponible. Elimina este artículo.'
                      : `Stock: ${item.stock} unidades`}
                  </span>
                  <strong>{money(item.price)}</strong>
                </div>
                <div className="quantity-control">
                  <button
                    disabled={busy || refreshing || item.quantity === 1}
                    onClick={() => changeQuantity(cartKey(item), item.quantity - 1)}
                    aria-label={`Reducir cantidad de ${item.name}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span aria-label={`Cantidad de ${item.name}`}>{item.quantity}</span>
                  <button
                    disabled={busy || refreshing}
                    onClick={() => changeQuantity(cartKey(item), item.quantity + 1)}
                    aria-label={`Aumentar cantidad de ${item.name}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <strong className="line-total">{money(item.price * item.quantity)}</strong>
                <button
                  className="delete-icon"
                  onClick={() => remove(cartKey(item))}
                  disabled={busy || refreshing}
                  aria-label={`Eliminar ${item.name} del carrito`}
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
            <Link to="/catalog" className="text-link cart-continue">
              Seguir explorando <ArrowUpRight size={17} />
            </Link>
          </section>
          <aside className="order-summary">
            <span className="eyebrow">CASI EN OTRO UNIVERSO</span>
            <h2>Resumen del pedido</h2>
            <div>
              <span>Subtotal</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>Cargos adicionales</span>
              <span>{money(0)}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <p className="demo-note">
              <ShieldCheck size={17} /> Compra de demostración: sin cobro real ni entrega de claves
              digitales.
            </p>
            {invalid && (
              <p className="form-error">
                Ajusta las cantidades o elimina los juegos sin disponibilidad.
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="btn btn-primary full-width"
              onClick={checkout}
              disabled={busy || refreshing || invalid}
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  {user ? 'Confirmar compra demo' : 'Iniciar sesión para comprar'}{' '}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <small className="summary-caption">
              El stock y el precio se verifican al confirmar.
            </small>
          </aside>
        </div>
      )}
    </div>
  );
}

export function AccountPage() {
  const { user, setUser, notify } = useStore(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      setUser(
        await api<User>('/auth/me', {
          method: 'PATCH',
          body: JSON.stringify({ name: data.get('name'), email: data.get('email') }),
        }),
      );
      notify('Tu perfil se actualizó.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container inner-page">
      <div className="page-title">
        <span className="eyebrow">PLAYER PROFILE</span>
        <h1>
          Hola, <span>{user!.name.split(' ')[0]}.</span>
        </h1>
        <p>Este es tu espacio en NeonPlay.</p>
      </div>
      <div className="account-layout">
        <section className="panel">
          <div className="panel-title">
            <UserRound size={20} />
            <h2>Tu perfil</h2>
          </div>
          <form onSubmit={submit}>
            <label className="field">
              Nombre
              <input
                name="name"
                defaultValue={user!.name}
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
            <label className="field">
              Correo electrónico
              <input
                name="email"
                type="email"
                defaultValue={user!.email}
                autoComplete="email"
                required
                maxLength={160}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
              <ArrowRight size={17} />
            </button>
          </form>
        </section>
        <div className="account-shortcuts">
          <Link to="/orders" className="panel">
            <Package />
            <div>
              <h3>Mis pedidos</h3>
              <p>Tu historial de aventuras.</p>
            </div>
            <ArrowUpRight />
          </Link>
          <Link to="/catalog" className="panel">
            <Gamepad2 />
            <div>
              <h3>Seguir explorando</h3>
              <p>Encuentra tu próximo favorito.</p>
            </div>
            <ArrowUpRight />
          </Link>
          {user!.role === 'ADMIN' && (
            <Link to="/admin" className="panel">
              <LayoutDashboard />
              <div>
                <h3>Administración</h3>
                <p>Gestiona el universo NeonPlay.</p>
              </div>
              <ArrowUpRight />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function OrdersPage() {
  const result = useApi<Order[]>('/orders'),
    [params] = useSearchParams();
  return (
    <div className="container inner-page">
      <div className="page-title">
        <span className="eyebrow">TU HISTORIAL DE AVENTURAS</span>
        <h1>
          Mis pedidos<span>.</span>
        </h1>
        <p>Cada compra, una nueva historia.</p>
      </div>
      {params.get('success') && (
        <div className="success-banner" role="status">
          <CheckCircle2 size={22} />
          <div>
            <strong>¡Tu compra de demostración está lista!</strong>
            <span>El pedido se registró y el stock se actualizó.</span>
          </div>
        </div>
      )}
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.reload} />
      ) : !result.data?.length ? (
        <Empty
          title="Tu historia está por comenzar"
          text="Cuando realices una compra, encontrarás aquí sus detalles."
        />
      ) : (
        <div className="orders-list">
          {result.data.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-header">
                <div>
                  <span className="eyebrow">PEDIDO #{order.id.slice(-8).toUpperCase()}</span>
                  <span>{date(order.createdAt)}</span>
                </div>
                <StatusBadge status={order.status} />
                <strong>{money(order.total)}</strong>
              </div>
              <div className="order-lines">
                {order.items.map((item) => (
                  <div key={item.id}>
                    <GameImage src={item.image} alt={item.gameName} />
                    <span>
                      <strong>{item.gameName}</strong>
                      <small>
                        {item.platformName} · {item.quantity}{' '}
                        {item.quantity === 1 ? 'unidad' : 'unidades'}
                      </small>
                    </span>
                    <strong>{money(Number(item.price) * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
