import { Component, useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { Routes, Route, Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  ArrowUpRight,
  Gamepad2,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  UserRound,
  ArrowRight,
} from 'lucide-react';
import { useStore } from './store';
import { errorMessage } from './lib';
import { Loading } from './components';
import { Home, CatalogPage, GamePage } from './pages/Shop';
import { AuthPage, AccountPage, OrdersPage, CartPage } from './pages/Account';
import { AdminPage } from './pages/Admin';

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="NeonPlay inicio">
      <span className="brand-mark">N</span>
      <span>
        NEON<span className="brand-play">PLAY</span>
        <span className="brand-dot">®</span>
      </span>
    </Link>
  );
}
function Header() {
  const { user, cart, logout, notify } = useStore(),
    navigate = useNavigate(),
    location = useLocation();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState('');
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);
  function search(e: FormEvent) {
    e.preventDefault();
    navigate('/catalog?q=' + encodeURIComponent(query));
  }
  return (
    <>
      <div className="topline">
        <div className="container">
          <span>
            <i /> NEXT LEVEL GAMING
          </span>
          <span>
            Explora. Juega. Repite. <ArrowUpRight size={12} />
          </span>
        </div>
      </div>
      <header className="header">
        <div className="container nav-row">
          <Brand />
          <nav
            className={open ? 'nav-links nav-open' : 'nav-links'}
            aria-label="Navegación principal"
          >
            <NavLink to="/" end>
              Inicio
            </NavLink>
            <NavLink to="/catalog" end>
              Explorar
            </NavLink>
            <Link to="/catalog?sort=newest">Novedades</Link>
            <Link to="/catalog?offers=true" className="offers-link">
              Ofertas <span />
            </Link>
          </nav>
          <form className="nav-search" onSubmit={search}>
            <Search size={16} />
            <input
              aria-label="Buscar videojuegos"
              placeholder="Busca tu próximo juego"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="nav-actions">
            <Link
              to="/cart"
              className="icon-link cart-link"
              aria-label={`Carrito con ${cart.reduce((s, i) => s + i.quantity, 0)} artículos`}
            >
              <ShoppingBag size={20} />
              {cart.length > 0 && (
                <span className="cart-count">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              )}
            </Link>
            {user ? (
              <>
                <Link to="/account" className="avatar" aria-label="Mi cuenta">
                  {user.name.charAt(0).toUpperCase()}
                </Link>
                <button
                  className="logout-button"
                  aria-label="Cerrar sesión"
                  onClick={() => logout().catch((e) => notify(errorMessage(e), true))}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link to="/login" className="login-link" aria-label="Ingresar">
                <UserRound size={17} />
                <span>Ingresar</span>
              </Link>
            )}
            <button
              className="menu-toggle"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
function Footer() {
  const { user } = useStore();
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div>
          <Brand />
          <p>Tu próxima aventura empieza aquí.</p>
        </div>
        <div className="footer-links">
          <Link to="/catalog">Explorar</Link>
          <Link to="/orders">Mis pedidos</Link>
          <Link to="/account">Mi cuenta</Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin">
              <LayoutDashboard size={14} /> Administración
            </Link>
          )}
        </div>
        <span className="footer-signal">
          <i /> EL PRÓXIMO NIVEL TE ESPERA
        </span>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} NeonPlay. Proyecto de demostración.</span>
        <span>Videojuegos conceptuales · Precios en USD</span>
      </div>
    </footer>
  );
}
export function Protected({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, authReady } = useStore(),
    location = useLocation();
  if (!authReady) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user.role !== 'ADMIN')
    return (
      <div className="container state">
        <h1>Acceso restringido</h1>
        <p>Tu cuenta no tiene permisos de administrador.</p>
        <Link to="/" className="btn btn-primary">
          Volver al inicio
        </Link>
      </div>
    );
  return <>{children}</>;
}
function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="container state">
        <h1>No pudimos mostrar esta página</h1>
        <p>Recarga para volver a intentarlo.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  return (
    <Boundary>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <ScrollTop />
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/game/:slug" element={<GamePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route
            path="/account"
            element={
              <Protected>
                <AccountPage />
              </Protected>
            }
          />
          <Route
            path="/orders"
            element={
              <Protected>
                <OrdersPage />
              </Protected>
            }
          />
          <Route
            path="/admin/*"
            element={
              <Protected admin>
                <AdminPage />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <div className="container state">
                <Gamepad2 size={44} />
                <h1>Te saliste del mapa</h1>
                <p>Esta página no existe. Tu próxima aventura sigue aquí.</p>
                <Link to="/" className="btn btn-primary">
                  Volver al inicio <ArrowRight size={18} />
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </Boundary>
  );
}
