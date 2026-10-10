import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Gamepad2,
  Compass,
  ChevronRight,
  Star,
  Check,
  ShoppingBag,
  Search,
  SlidersHorizontal,
  X,
  Monitor,
  Swords,
  Flag,
  Orbit,
  Target,
  Crown,
} from 'lucide-react';
import { useApi } from '../hooks';
import { GameCard, GameImage, Loading, ErrorState, Empty } from '../components';
import type { Catalog, Game, Meta } from '../types';
import { money, calendarDate, shortPlatform } from '../lib';
import { useStore } from '../store';

const genreIcons: Record<string, typeof Swords> = {
  Acción: Swords,
  RPG: Crown,
  Carreras: Flag,
  Aventura: Compass,
  Estrategia: Target,
};
export function Home() {
  const [tab, setTab] = useState('featured');
  const catalog = useApi<Catalog>(
      `/games?limit=8&sort=${tab === 'offers' ? 'featured' : tab}${tab === 'offers' ? '&offers=true' : ''}`,
    ),
    meta = useApi<Meta>('/meta');
  const highlight = useApi<Catalog>('/games?limit=1&sort=featured');
  const hero = highlight.data?.games[0];
  return (
    <div className="container home">
      <div className="page-intro">
        <span className="eyebrow">
          <span className="small-cross">✦</span> EL SIGUIENTE NIVEL TE ESPERA
        </span>
        <span className="intro-side">
          <span className="live-dot" /> PLAYER ONE, ¿LISTO?
        </span>
      </div>
      <section className="hero">
        <img
          className="hero-image"
          src={hero?.image || '/assets/nexus.png'}
          alt={`Arte del universo ${hero?.name || 'NeonPlay'}`}
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="hero-badge">
            <span /> DESTACADO DE LA SEMANA
          </div>
          <h1>
            Tu próximo
            <br />
            universo
            <br />
            <span>empieza aquí.</span>
          </h1>
          <p>
            Historias que te atrapan. Mundos que te sorprenden.
            <br className="desktop-br" /> Descubre el juego que no podrás dejar.
          </p>
          <div className="hero-buttons">
            <Link to="/catalog" className="btn btn-primary">
              Explorar videojuegos <ArrowUpRight size={19} />
            </Link>
            {hero && (
              <Link to={`/game/${hero.slug}`} className="hero-detail">
                Descubrir {hero.name.split(':')[0]} <ArrowRight size={17} />
              </Link>
            )}
          </div>
          <div className="hero-platforms">
            <span>ENCUENTRA TU MUNDO EN</span>
            <div>
              <Monitor size={14} /> PC <span className="platform-separator" />{' '}
              <Gamepad2 size={16} /> PlayStation <span className="platform-separator" /> Xbox
            </div>
          </div>
        </div>
        {hero && (
          <div className="hero-game">
            <div className="hero-game-label">
              <span className="live-dot" /> NUEVO UNIVERSO DISPONIBLE
            </div>
            <strong className={hero.slug !== 'nexus-beyond-the-void' ? 'hero-other' : ''}>
              {hero.slug === 'nexus-beyond-the-void' ? (
                <>
                  NEXUS<span>BEYOND THE VOID</span>
                </>
              ) : (
                hero.name
              )}
            </strong>
            <div>
              <span>{hero.category.name} · Destacado</span>
              <span>
                Desde <b>{money(hero.price)}</b>
              </span>
            </div>
          </div>
        )}
        <span className="hero-coordinate">SECTOR 07 // 20.26</span>
      </section>
      <section className="benefits" aria-label="Beneficios">
        <div>
          <Zap />
          <span>
            <strong>Compra en segundos</strong>
            <small>Un checkout simple y rápido</small>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <strong>Stock actualizado</strong>
            <small>Disponibilidad en tiempo real</small>
          </span>
        </div>
        <div>
          <Gamepad2 />
          <span>
            <strong>Tu plataforma, tu juego</strong>
            <small>PC, PlayStation, Xbox y Switch</small>
          </span>
        </div>
        <div>
          <Compass />
          <span>
            <strong>Siempre algo por descubrir</strong>
            <small>Encuentra tu próxima aventura</small>
          </span>
        </div>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ELIGE TU PRÓXIMA MISIÓN</span>
            <h2>
              Juegos que merecen <span>tu tiempo.</span>
            </h2>
          </div>
          <Link to="/catalog" className="text-link">
            Ver todos los juegos <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="catalog-tabs">
          <div role="tablist" aria-label="Colecciones">
            {[
              ['featured', 'Destacados'],
              ['newest', 'Novedades'],
              ['offers', 'En oferta'],
            ].map(([value, label]) => (
              <button
                role="tab"
                aria-selected={tab === value}
                className={tab === value ? 'active' : ''}
                onClick={() => setTab(value)}
                key={value}
              >
                {value === 'featured' && <Sparkles size={14} />} {label}
              </button>
            ))}
          </div>
          <span>{catalog.data?.total || 0} mundos por descubrir</span>
        </div>
        {catalog.loading ? (
          <Loading cards />
        ) : catalog.error ? (
          <ErrorState message={catalog.error} retry={catalog.reload} />
        ) : !catalog.data?.games.length ? (
          <Empty
            title="Pronto habrá nuevas aventuras"
            text="Todavía no hay videojuegos en esta colección."
          />
        ) : (
          <div className="game-grid">
            {catalog.data.games.slice(0, 4).map((game) => (
              <GameCard game={game} key={game.id} />
            ))}
          </div>
        )}
      </section>
      <section className="genre-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CADA PLAYER TIENE SU ESTILO</span>
            <h2>
              ¿Cuál es <span>el tuyo?</span>
            </h2>
          </div>
        </div>
        <div className="genre-grid">
          {meta.data?.categories.map((category, index) => {
            const Icon = genreIcons[category.name] || Gamepad2;
            return (
              <Link
                key={category.id}
                to={`/catalog?category=${category.id}`}
                className={`genre genre-${index}`}
              >
                <Icon size={29} />
                <span>{category.name}</span>
                <ArrowUpRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="cta-banner">
        <div className="cta-orbit">
          <Orbit size={120} />
        </div>
        <div>
          <span className="eyebrow">NO ES SOLO UN JUEGO. ES TU PRÓXIMA HISTORIA.</span>
          <h2>
            Sal de la rutina.
            <br />
            <span>Entra en otro mundo.</span>
          </h2>
        </div>
        <Link to="/catalog?offers=true" className="btn btn-secondary">
          Descubrir ofertas <ArrowUpRight size={18} />
        </Link>
        <div className="cta-grid" />
      </section>
    </div>
  );
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get('q') || ''),
    [filters, setFilters] = useState(false);
  const meta = useApi<Meta>('/meta');
  const query = new URLSearchParams(params);
  query.set('limit', '12');
  const catalog = useApi<Catalog>('/games?' + query.toString());
  useEffect(() => setSearch(params.get('q') || ''), [params]);
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    update('q', search);
  }
  return (
    <div className="container inner-page">
      <div className="breadcrumb">
        <Link to="/">Inicio</Link>
        <ChevronRight size={13} /> Explorar
      </div>
      <div className="page-title">
        <span className="eyebrow">TU PRÓXIMA AVENTURA</span>
        <h1>
          Explora <span>sin límites.</span>
        </h1>
        <p>Un mundo para cada forma de jugar.</p>
      </div>
      <div className="catalog-layout">
        <aside className={filters ? 'filter-panel filter-visible' : 'filter-panel'}>
          <div className="filter-heading">
            <SlidersHorizontal size={17} />
            <h3>Filtros</h3>
            <button
              onClick={() => {
                setParams({});
                setSearch('');
              }}
              className="subtle-button"
            >
              Limpiar
            </button>
          </div>
          <form onSubmit={submit} className="filter-search">
            <Search size={16} />
            <input
              aria-label="Buscar en catálogo"
              placeholder="Buscar videojuego"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button aria-label="Aplicar búsqueda">
              <ArrowRight size={16} />
            </button>
          </form>
          <fieldset>
            <legend>Categoría</legend>
            <label>
              <input
                type="radio"
                name="category"
                checked={!params.get('category')}
                onChange={() => update('category', '')}
              />{' '}
              Todas las categorías
            </label>
            {meta.data?.categories.map((c) => (
              <label key={c.id}>
                <input
                  type="radio"
                  name="category"
                  checked={params.get('category') === c.id}
                  onChange={() => update('category', c.id)}
                />
                {c.name}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Plataforma</legend>
            <label>
              <input
                type="radio"
                name="platform"
                checked={!params.get('platform')}
                onChange={() => update('platform', '')}
              />{' '}
              Todas las plataformas
            </label>
            {meta.data?.platforms.map((p) => (
              <label key={p.id}>
                <input
                  type="radio"
                  name="platform"
                  checked={params.get('platform') === p.id}
                  onChange={() => update('platform', p.id)}
                />
                {p.name}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Descubre más</legend>
            <label>
              <input
                type="checkbox"
                checked={params.get('offers') === 'true'}
                onChange={(e) => update('offers', e.target.checked ? 'true' : '')}
              />{' '}
              Solo juegos en oferta
            </label>
          </fieldset>
          {meta.error && <p className="form-error">{meta.error}</p>}
          <div className="filter-promo">
            <Gamepad2 size={28} />
            <strong>¿Listo para jugar?</strong>
            <p>Tu próximo universo está a un clic.</p>
          </div>
        </aside>
        <section className="catalog-results">
          <div className="results-top">
            <span>
              <b>{catalog.data?.total || 0}</b> videojuegos
            </span>
            <button
              className="mobile-filter btn btn-secondary"
              onClick={() => setFilters(!filters)}
            >
              {filters ? <X size={16} /> : <SlidersHorizontal size={16} />} Filtros
            </button>
            <label className="sort-label">
              <span>Ordenar por</span>
              <select
                aria-label="Ordenar videojuegos"
                value={params.get('sort') || 'featured'}
                onChange={(e) => update('sort', e.target.value)}
              >
                <option value="featured">Destacados</option>
                <option value="newest">Más recientes</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
              </select>
            </label>
          </div>
          {catalog.loading ? (
            <Loading cards />
          ) : catalog.error ? (
            <ErrorState message={catalog.error} retry={catalog.reload} />
          ) : !catalog.data?.games.length ? (
            <div className="state">
              <Search size={32} />
              <h3>No encontramos videojuegos</h3>
              <p>Prueba otra búsqueda o elimina algunos filtros.</p>
              <button className="btn btn-primary" onClick={() => setParams({})}>
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="game-grid">
                {catalog.data.games.map((g) => (
                  <GameCard game={g} key={g.id} />
                ))}
              </div>
              {catalog.data.pages > 1 && (
                <div className="pagination">
                  <button
                    disabled={catalog.data.page === 1}
                    onClick={() => update('page', String(catalog.data!.page - 1))}
                  >
                    Anterior
                  </button>
                  <span>
                    Página {catalog.data.page} de {catalog.data.pages}
                  </span>
                  <button
                    disabled={catalog.data.page === catalog.data.pages}
                    onClick={() => update('page', String(catalog.data!.page + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export function GamePage() {
  const { slug } = useParams(),
    result = useApi<Game>(`/games/${slug}`),
    { add } = useStore(),
    [platform, setPlatform] = useState('');
  useEffect(() => setPlatform(''), [slug]);
  if (result.loading) return <Loading />;
  if (result.error) return <ErrorState message={result.error} retry={result.reload} />;
  const game = result.data!;
  const discount =
    game.originalPrice && Number(game.originalPrice) > Number(game.price)
      ? Math.round((1 - Number(game.price) / Number(game.originalPrice)) * 100)
      : 0;
  return (
    <div className="container inner-page">
      <div className="breadcrumb">
        <Link to="/">Inicio</Link>
        <ChevronRight size={13} />
        <Link to="/catalog">Explorar</Link>
        <ChevronRight size={13} />
        {game.name}
      </div>
      <div className="detail-layout">
        <div className="detail-art">
          <GameImage src={game.image} alt={`Arte de ${game.name}`} />
          <span className="detail-art-caption">NEONPLAY ORIGINAL COLLECTION</span>
        </div>
        <section className="detail-info">
          <span className="eyebrow">{game.category.name} // TU PRÓXIMA MISIÓN</span>
          <h1>{game.name}</h1>
          <div className="detail-rating">
            <Star size={17} fill="currentColor" /> {Number(game.rating).toFixed(1)}{' '}
            <span>Valoración de demostración</span>
          </div>
          <p className="detail-description">{game.description}</p>
          <div className="detail-price">
            <strong>{money(game.price)}</strong>
            {discount > 0 && (
              <>
                <del>{money(game.originalPrice!)}</del>
                <span className="discount">−{discount}%</span>
              </>
            )}
          </div>
          <label className="field">
            Elige tu plataforma
            <select
              value={platform || game.platforms[0]?.platformId}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {game.platforms.map((p) => (
                <option key={p.platformId} value={p.platformId}>
                  {p.platform.name}
                </option>
              ))}
            </select>
          </label>
          <p className={`stock-label ${game.stock === 0 ? 'out' : ''}`}>
            <span />
            {game.stock > 0 ? `${game.stock} unidades disponibles` : 'Temporalmente agotado'}
          </p>
          <button
            disabled={!game.stock}
            className="btn btn-primary detail-buy"
            onClick={() => add(game, platform || game.platforms[0]?.platformId)}
          >
            <ShoppingBag size={19} /> Añadir al carrito <ArrowRight size={19} />
          </button>
          <div className="detail-reassurance">
            <span>
              <ShieldCheck size={15} /> Compra de demostración
            </span>
            <span>
              <Check size={15} /> Stock verificado al comprar
            </span>
          </div>
          <div className="detail-facts">
            <div>
              <span>Lanzamiento</span>
              <strong>{calendarDate(game.releaseDate)}</strong>
            </div>
            <div>
              <span>Género</span>
              <strong>{game.category.name}</strong>
            </div>
            <div>
              <span>Plataformas</span>
              <strong>
                {game.platforms.map((p) => shortPlatform(p.platform.name)).join(' · ')}
              </strong>
            </div>
          </div>
        </section>
      </div>
      <section className="about-game">
        <span className="eyebrow">DESCUBRE LA HISTORIA</span>
        <h2>
          Un nuevo mundo <span>te espera.</span>
        </h2>
        <p>{game.description}</p>
        <Link to="/catalog" className="text-link">
          Seguir explorando <ArrowUpRight size={17} />
        </Link>
      </section>
    </div>
  );
}
