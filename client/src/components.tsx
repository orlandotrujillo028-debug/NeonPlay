import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShoppingCart,
  Star,
  Monitor,
  Gamepad2,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react';
import type { Game } from './types';
import { money, shortPlatform } from './lib';
import { useStore } from './store';

export function GameImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith('/assets/fallback.svg')) img.src = '/assets/fallback.svg';
      }}
    />
  );
}
export function GameCard({ game }: { game: Game }) {
  const { add } = useStore();
  const discount =
    game.originalPrice && Number(game.originalPrice) > Number(game.price)
      ? Math.round((1 - Number(game.price) / Number(game.originalPrice)) * 100)
      : 0;
  return (
    <article className="game-card">
      <Link to={`/game/${game.slug}`} className="game-art">
        <GameImage src={game.image} alt={`Portada de ${game.name}`} />
        {discount > 0 && <span className="discount">−{discount}%</span>}
        <span className="art-arrow">
          <ArrowRight size={18} />
        </span>
      </Link>
      <div className="game-info">
        <div className="game-meta">
          <span>{game.category.name}</span>
          <span className="rating">
            <Star size={11} fill="currentColor" />
            {Number(game.rating).toFixed(1)}
          </span>
        </div>
        <Link to={`/game/${game.slug}`} className="game-title">
          {game.name}
        </Link>
        <div className="platforms">
          {game.platforms.map((p) => (
            <span key={p.platformId}>
              {p.platform.name === 'PC' ? <Monitor size={11} /> : <Gamepad2 size={12} />}{' '}
              {shortPlatform(p.platform.name)}
            </span>
          ))}
        </div>
        <div className="game-bottom">
          <div>
            <strong>{money(game.price)}</strong>
            {discount > 0 && <del>{money(game.originalPrice!)}</del>}
          </div>
          <button
            className="add-cart"
            onClick={() => add(game)}
            disabled={game.stock === 0}
            aria-label={`Añadir ${game.name} al carrito`}
          >
            <ShoppingCart size={17} />
          </button>
        </div>
        {game.stock === 0 && <small className="sold-out">Agotado</small>}
      </div>
    </article>
  );
}
export function Loading({ cards = false }: { cards?: boolean }) {
  return cards ? (
    <div className="game-grid" aria-label="Cargando videojuegos">
      {[1, 2, 3, 4].map((n) => (
        <div className="skeleton-card" key={n}>
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  ) : (
    <div className="state">
      <LoaderCircle className="spin" size={28} />
      <p>Cargando tu próximo universo…</p>
    </div>
  );
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state error-state" role="alert">
      <AlertCircle size={30} />
      <h3>No pudimos cargar esta sección</h3>
      <p>{message}</p>
      {retry && (
        <button className="btn btn-secondary" onClick={retry}>
          Volver a intentar
        </button>
      )}
    </div>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="state">
      <Gamepad2 size={36} />
      <h3>{title}</h3>
      <p>{text}</p>
      <Link to="/catalog" className="btn btn-primary">
        Explorar videojuegos <ArrowRight size={17} />
      </Link>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {(
        { COMPLETED: 'Completado', PENDING: 'Pendiente', CANCELLED: 'Cancelado' } as Record<
          string,
          string
        >
      )[status] || status}
    </span>
  );
}
