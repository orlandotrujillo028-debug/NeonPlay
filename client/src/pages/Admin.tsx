import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Gamepad2,
  Tags,
  Monitor,
  Users,
  Package,
  ArrowUpRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  DollarSign,
  LoaderCircle,
  RotateCcw,
  Check,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useApi } from '../hooks';
import { useStore } from '../store';
import { api, date, errorMessage, money, shortPlatform } from '../lib';
import { ErrorState, GameImage, Loading, StatusBadge } from '../components';
import type { Dashboard, Game, Meta, Named, Order, User } from '../types';

const sections = [
  ['dashboard', 'Resumen', LayoutDashboard],
  ['games', 'Videojuegos', Gamepad2],
  ['categories', 'Categorías', Tags],
  ['platforms', 'Plataformas', Monitor],
  ['users', 'Usuarios', Users],
  ['orders', 'Pedidos', Package],
] as const;
type Tab = (typeof sections)[number][0];
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button onClick={onClose} aria-label="Cerrar ventana">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Confirm({
  title,
  message,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="confirm-content">
        <AlertTriangle size={32} />
        <p>{message}</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-danger" disabled={busy} onClick={confirm}>
            {busy ? 'Procesando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
function GameForm({
  game,
  meta,
  onSaved,
  onClose,
}: {
  game?: Game;
  meta: Meta;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [platforms, setPlatforms] = useState(game?.platforms.map((p) => p.platformId) || []),
    [image, setImage] = useState(game?.image || '/assets/nexus.png'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!platforms.length) return setError('Selecciona al menos una plataforma.');
    const f = new FormData(e.currentTarget);
    const data = {
      name: String(f.get('name')),
      description: String(f.get('description')),
      price: Number(f.get('price')),
      originalPrice: f.get('originalPrice') ? Number(f.get('originalPrice')) : null,
      image,
      stock: Number(f.get('stock')),
      rating: Number(f.get('rating')),
      releaseDate: new Date(String(f.get('releaseDate')) + 'T00:00:00Z').toISOString(),
      categoryId: f.get('categoryId'),
      platformIds: platforms,
      featured: f.get('featured') === 'on',
    };
    setBusy(true);
    try {
      await api('/admin/games' + (game ? '/' + game.id : ''), {
        method: game ? 'PUT' : 'POST',
        body: JSON.stringify(data),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={game ? 'Editar videojuego' : 'Nuevo videojuego'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} className="modal-form">
        <div className="form-two">
          <label className="field">
            Nombre
            <input name="name" defaultValue={game?.name} required minLength={2} maxLength={120} />
          </label>
          <label className="field">
            Categoría
            <select name="categoryId" defaultValue={game?.categoryId || ''} required>
              <option value="" disabled>
                Seleccionar categoría
              </option>
              {meta.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Descripción
          <textarea
            name="description"
            defaultValue={game?.description}
            required
            minLength={20}
            maxLength={5000}
            rows={3}
          />
        </label>
        <div className="form-three">
          <label className="field">
            Precio USD
            <input
              name="price"
              type="number"
              min="0.01"
              max="9999.99"
              step="0.01"
              defaultValue={game?.price || '29.99'}
              required
            />
          </label>
          <label className="field">
            Precio anterior (opcional)
            <input
              name="originalPrice"
              type="number"
              min="0.01"
              max="9999.99"
              step="0.01"
              defaultValue={game?.originalPrice || ''}
            />
          </label>
          <label className="field">
            Stock
            <input
              name="stock"
              type="number"
              min="0"
              max="100000"
              step="1"
              defaultValue={game?.stock ?? 10}
              required
            />
          </label>
        </div>
        <div className="form-two">
          <label className="field">
            Lanzamiento
            <input
              name="releaseDate"
              type="date"
              defaultValue={game?.releaseDate.slice(0, 10) || new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
          <label className="field">
            Valoración (0 a 5)
            <input
              name="rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              defaultValue={game?.rating || '4.5'}
              required
            />
          </label>
        </div>
        <fieldset className="platform-checks">
          <legend>Plataformas</legend>
          {meta.platforms.map((p) => (
            <label key={p.id}>
              <input
                type="checkbox"
                checked={platforms.includes(p.id)}
                onChange={(e) =>
                  setPlatforms(
                    e.target.checked ? [...platforms, p.id] : platforms.filter((id) => id !== p.id),
                  )
                }
              />
              {p.name}
            </label>
          ))}
        </fieldset>
        <div className="image-field">
          <GameImage src={image} alt="Vista previa de la portada" />
          <div>
            <label className="field">
              Imagen (ruta local o URL HTTPS)
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
                maxLength={2048}
              />
            </label>
            <div className="asset-choices">
              {['nexus', 'emberfall', 'velocity', 'titan', 'odyssey'].map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => setImage('/assets/' + name + '.png')}
                  className={image.includes(name) ? 'selected' : ''}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label className="check-label">
          <input name="featured" type="checkbox" defaultChecked={game?.featured} /> Destacar en la
          tienda
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{' '}
            {game ? 'Guardar cambios' : 'Crear videojuego'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function NamedForm({
  item,
  kind,
  onSaved,
  onClose,
}: {
  item?: Named;
  kind: 'categories' | 'platforms';
  onSaved: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get('name');
    setBusy(true);
    try {
      await api('/admin/' + kind + (item ? '/' + item.id : ''), {
        method: item ? 'PUT' : 'POST',
        body: JSON.stringify({ name }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${item ? 'Editar' : 'Crear'} ${kind === 'categories' ? 'categoría' : 'plataforma'}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="modal-form" onSubmit={submit}>
        <label className="field">
          Nombre
          <input name="name" defaultValue={item?.name} required minLength={2} maxLength={60} />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function UserForm({
  user,
  onSaved,
  onClose,
}: {
  user?: User;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { user: actor } = useStore(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      name: f.get('name'),
      email: f.get('email'),
      password: f.get('password'),
      role: user?.id === actor?.id ? 'ADMIN' : f.get('role'),
      active: user?.id === actor?.id ? true : f.get('active') === 'on',
    };
    setBusy(true);
    try {
      await api('/admin/users' + (user ? '/' + user.id : ''), {
        method: user ? 'PUT' : 'POST',
        body: JSON.stringify(data),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={user ? 'Editar usuario' : 'Crear usuario'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="modal-form" onSubmit={submit}>
        <label className="field">
          Nombre
          <input name="name" defaultValue={user?.name} required minLength={2} maxLength={80} />
        </label>
        <label className="field">
          Correo
          <input name="email" type="email" defaultValue={user?.email} required maxLength={160} />
        </label>
        {!user && (
          <label className="field">
            Contraseña inicial
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
            />
          </label>
        )}
        <label className="field">
          Rol
          <select
            name="role"
            defaultValue={user?.role || 'CUSTOMER'}
            disabled={user?.id === actor?.id}
          >
            <option value="CUSTOMER">Cliente</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>
        <label className="check-label">
          <input
            name="active"
            type="checkbox"
            defaultChecked={user?.active ?? true}
            disabled={user?.id === actor?.id}
          />{' '}
          Cuenta activa
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Overview({ data }: { data: Dashboard }) {
  return (
    <>
      <div className="stat-grid">
        {[
          [Gamepad2, 'Videojuegos', data.games],
          [Users, 'Usuarios activos', data.users],
          [Package, 'Pedidos', data.orders],
          [DollarSign, 'Ventas completadas', money(data.revenue)],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Gamepad2;
          return (
            <div className="stat-card" key={String(label)}>
              <div>
                <span>{String(label)}</span>
                <I size={18} />
              </div>
              <strong>{value as ReactNode}</strong>
              <small>
                {label === 'Ventas completadas'
                  ? 'Importe de demostración en USD'
                  : 'Datos actuales de PostgreSQL'}
              </small>
            </div>
          );
        })}
      </div>
      <div className="dashboard-panels">
        <section className="panel">
          <div className="panel-title">
            <h2>Últimos pedidos</h2>
            <Link to="/admin/orders" className="text-link">
              Ver todos <ArrowUpRight size={15} />
            </Link>
          </div>
          {!data.recentOrders.length ? (
            <div className="admin-empty">
              <Package size={28} />
              <p>Los primeros pedidos aparecerán aquí.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id.slice(-6).toUpperCase()}</td>
                      <td>{o.user?.name}</td>
                      <td>{money(o.total)}</td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Stock bajo</h2>
            <span className="count-pill">{data.lowStock.length}</span>
          </div>
          {!data.lowStock.length ? (
            <div className="admin-empty">
              <Check size={28} />
              <p>El inventario está en buen estado.</p>
            </div>
          ) : (
            data.lowStock.map((g) => (
              <div key={g.id} className="low-stock">
                <GameImage src={g.image} alt={g.name} />
                <div>
                  <strong>{g.name}</strong>
                  <small>{g.stock} unidades disponibles</small>
                </div>
                <Link to="/admin/games" aria-label={'Gestionar ' + g.name}>
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            ))
          )}
        </section>
      </div>
      <div className="admin-info">
        <ShieldIcon />
        <span>
          Las ventas corresponden a compras de demostración. Los pedidos cancelados se excluyen del
          importe de ventas.
        </span>
      </div>
    </>
  );
}
function ShieldIcon() {
  return <Check size={17} />;
}

export function AdminPage() {
  const location = useLocation(),
    { user, notify, setUser } = useStore();
  const path = location.pathname.split('/')[2] || 'dashboard',
    tab: Tab = sections.some((s) => s[0] === path) ? (path as Tab) : 'dashboard';
  const result = useApi<Dashboard | Game[] | Named[] | User[] | Order[]>('/admin/' + tab),
    meta = useApi<Meta>('/meta');
  const [search, setSearch] = useState(''),
    [editor, setEditor] = useState<{ item?: Game | Named | User } | null>(null),
    [confirm, setConfirm] = useState<{
      title: string;
      message: string;
      action: () => Promise<void>;
    } | null>(null);
  useEffect(() => {
    setSearch('');
    setEditor(null);
    setConfirm(null);
  }, [tab]);
  const title = sections.find((s) => s[0] === tab)![1];
  function saved() {
    result.reload();
    meta.reload();
    notify('Cambios guardados correctamente.');
  }
  function remove(item: Named) {
    setConfirm({
      title: tab === 'users' ? 'Desactivar usuario' : 'Eliminar registro',
      message:
        tab === 'games'
          ? `¿Eliminar “${item.name}”? Si tiene pedidos asociados, se archivará para conservar el historial.`
          : tab === 'users'
            ? `¿Desactivar la cuenta de ${item.name}? Se cerrarán sus sesiones y se conservará su historial.`
            : `¿Eliminar “${item.name}”? Solo puede eliminarse si no tiene registros asociados.`,
      action: async () => {
        const response = await api<{ message?: string }>('/admin/' + tab + '/' + item.id, {
          method: 'DELETE',
        });
        result.reload();
        meta.reload();
        notify(response?.message || 'Registro eliminado.');
      },
    });
  }
  function changeStatus(order: Order, status: string) {
    setConfirm({
      title: status === 'CANCELLED' ? 'Cancelar pedido' : 'Completar pedido',
      message:
        status === 'CANCELLED'
          ? 'El pedido se cancelará y sus unidades regresarán al inventario.'
          : 'El pedido quedará marcado como completado.',
      action: async () => {
        await api('/admin/orders/' + order.id, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        saved();
      },
    });
  }
  const rows = Array.isArray(result.data)
    ? result.data.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
      )
    : [];
  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-label">
          <LayoutDashboard size={18} />
          <span>CONTROL CENTER</span>
        </div>
        <nav aria-label="Administración">
          {sections.map(([key, label, Icon]) => (
            <NavLink
              to={'/admin/' + key}
              key={key}
              className={tab === key ? 'admin-nav active' : 'admin-nav'}
            >
              <Icon size={18} />
              {label}
              {tab === key && <ChevronRight size={15} />}
            </NavLink>
          ))}
        </nav>
        <div className="admin-operator">
          <span className="avatar">{user!.name.charAt(0)}</span>
          <div>
            <strong>{user!.name}</strong>
            <small>Administrador</small>
          </div>
          <span className="live-dot" />
        </div>
        <Link to="/" className="text-link">
          Volver a la tienda <ArrowUpRight size={15} />
        </Link>
      </aside>
      <section className="admin-content">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">NEONPLAY // ADMINISTRACIÓN</span>
            <h1>
              {title}
              <span>.</span>
            </h1>
            <p>
              {tab === 'dashboard'
                ? 'Una vista de todo tu universo.'
                : `Gestiona ${title.toLowerCase()} desde un solo lugar.`}
            </p>
          </div>
          {!['dashboard', 'orders'].includes(tab) && (
            <button className="btn btn-primary" onClick={() => setEditor({})} disabled={!meta.data}>
              <Plus size={17} />
              {tab === 'games'
                ? 'Nuevo videojuego'
                : tab === 'users'
                  ? 'Nuevo usuario'
                  : tab === 'categories'
                    ? 'Nueva categoría'
                    : 'Nueva plataforma'}
            </button>
          )}
        </div>
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <ErrorState message={result.error} retry={result.reload} />
        ) : tab === 'dashboard' ? (
          <Overview data={result.data as Dashboard} />
        ) : (
          <section className="admin-table-panel">
            <div className="admin-table-toolbar">
              <div className="filter-search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={'Buscar ' + title.toLowerCase()}
                  placeholder={'Buscar ' + title.toLowerCase() + '…'}
                />
              </div>
              <span>{rows.length} registros</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {tab === 'games' ? (
                      <>
                        <th>Videojuego</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </>
                    ) : tab === 'users' ? (
                      <>
                        <th>Usuario</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </>
                    ) : tab === 'orders' ? (
                      <>
                        <th>Pedido / Fecha</th>
                        <th>Cliente</th>
                        <th>Artículos</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </>
                    ) : (
                      <>
                        <th>Nombre</th>
                        <th>Identificador</th>
                        <th>Acciones</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tab === 'games'
                    ? (rows as Game[]).map((g) => (
                        <tr key={g.id}>
                          <td>
                            <div className="table-game">
                              <GameImage src={g.image} alt={g.name} />
                              <span>
                                <strong>{g.name}</strong>
                                <small>
                                  {g.platforms
                                    .map((p) => shortPlatform(p.platform.name))
                                    .join(' · ')}
                                </small>
                              </span>
                            </div>
                          </td>
                          <td>{g.category.name}</td>
                          <td>{money(g.price)}</td>
                          <td>
                            <span className={g.stock <= 5 ? 'stock-low' : ''}>{g.stock}</span>
                          </td>
                          <td>
                            <span
                              className={
                                'status-badge ' +
                                (g.archived ? 'status-cancelled' : 'status-completed')
                              }
                            >
                              {g.archived ? 'Archivado' : 'Activo'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                onClick={() => setEditor({ item: g })}
                                aria-label={'Editar ' + g.name}
                              >
                                <Pencil size={16} />
                              </button>
                              {g.archived ? (
                                <button
                                  onClick={() =>
                                    api('/admin/games/' + g.id + '/restore', { method: 'POST' })
                                      .then(saved)
                                      .catch((e) => notify(errorMessage(e), true))
                                  }
                                  aria-label={'Restaurar ' + g.name}
                                >
                                  <RotateCcw size={16} />
                                </button>
                              ) : (
                                <button
                                  className="danger"
                                  onClick={() => remove(g)}
                                  aria-label={'Eliminar ' + g.name}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    : tab === 'users'
                      ? (rows as User[]).map((u) => (
                          <tr key={u.id}>
                            <td>
                              <strong>{u.name}</strong>
                            </td>
                            <td>{u.email}</td>
                            <td>
                              <span className="role-badge">
                                {u.role === 'ADMIN' ? 'Administrador' : 'Cliente'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={
                                  'status-badge ' +
                                  (u.active ? 'status-completed' : 'status-cancelled')
                                }
                              >
                                {u.active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  onClick={() => setEditor({ item: u })}
                                  aria-label={'Editar ' + u.name}
                                >
                                  <Pencil size={16} />
                                </button>
                                {u.id !== user?.id && u.active && (
                                  <button
                                    className="danger"
                                    onClick={() => remove(u)}
                                    aria-label={'Desactivar ' + u.name}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      : tab === 'orders'
                        ? (rows as Order[]).map((o) => (
                            <tr key={o.id}>
                              <td>
                                <strong>#{o.id.slice(-8).toUpperCase()}</strong>
                                <small className="table-date">{date(o.createdAt)}</small>
                              </td>
                              <td>
                                {o.user?.name}
                                <small className="table-date">{o.user?.email}</small>
                              </td>
                              <td>
                                <div className="order-item-titles">
                                  {o.items.map((i) => (
                                    <small key={i.id}>
                                      {i.quantity} × {i.gameName}
                                      <span>{i.platformName}</span>
                                    </small>
                                  ))}
                                </div>
                              </td>
                              <td>{money(o.total)}</td>
                              <td>
                                <StatusBadge status={o.status} />
                              </td>
                              <td>
                                <div className="table-actions">
                                  {o.status === 'PENDING' && (
                                    <button
                                      onClick={() => changeStatus(o, 'COMPLETED')}
                                      aria-label="Completar pedido"
                                    >
                                      <Check size={16} />
                                    </button>
                                  )}
                                  {o.status !== 'CANCELLED' && (
                                    <button
                                      className="danger"
                                      onClick={() => changeStatus(o, 'CANCELLED')}
                                      aria-label="Cancelar pedido"
                                    >
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        : (rows as Named[]).map((item) => (
                            <tr key={item.id}>
                              <td>
                                <strong>{item.name}</strong>
                              </td>
                              <td>
                                <code>{item.id.slice(-10)}</code>
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    onClick={() => setEditor({ item })}
                                    aria-label={'Editar ' + item.name}
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    className="danger"
                                    onClick={() => remove(item)}
                                    aria-label={'Eliminar ' + item.name}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                </tbody>
              </table>
              {!rows.length && (
                <div className="admin-empty">
                  <Search size={28} />
                  <p>
                    {search
                      ? 'No hay resultados para esta búsqueda.'
                      : 'Todavía no hay registros en esta sección.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </section>
      {editor && tab === 'games' && meta.data && (
        <GameForm
          game={editor.item as Game | undefined}
          meta={meta.data}
          onSaved={saved}
          onClose={() => setEditor(null)}
        />
      )}{' '}
      {editor && (tab === 'categories' || tab === 'platforms') && (
        <NamedForm item={editor.item} kind={tab} onSaved={saved} onClose={() => setEditor(null)} />
      )}{' '}
      {editor && tab === 'users' && (
        <UserForm
          user={editor.item as User | undefined}
          onSaved={() => {
            saved();
            if (editor.item?.id === user?.id) api<User>('/auth/me').then(setUser);
          }}
          onClose={() => setEditor(null)}
        />
      )}{' '}
      {confirm && (
        <Confirm {...confirm} onConfirm={confirm.action} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}
