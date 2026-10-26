import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { formatBRL } from "@shared/discovery-options";

type CarouselProfile = {
  id: number;
  slug: string;
  stageName: string;
  avatarUrl?: string | null;
  age?: number | null;
  city?: string | null;
  neighborhood?: string | null;
  priceFromCents?: number | null;
  isAvailableNow?: boolean | null;
  isSponsored?: boolean | null;
};

const AUTOPLAY_MS = 5500;
const SWIPE_PX = 42;

// Carrossel de destaques do topo da home: passa sozinho, pausa ao tocar/passar o
// mouse, respeita "reduzir movimento" e funciona por setas, pontos e deslize.
export default function FeaturedCarousel({
  profiles,
}: {
  profiles: CarouselProfile[];
}) {
  const count = profiles.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reduced || hidden) return;
    const timer = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [count, index, paused, reduced, hidden, go]);

  if (!count) return null;

  return (
    <section
      className="ep-carousel"
      aria-roledescription="carrossel"
      aria-label="Perfis em destaque"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={event => {
        if (event.key === "ArrowLeft") go(index - 1);
        if (event.key === "ArrowRight") go(index + 1);
      }}
    >
      <div
        className="ep-carousel-viewport"
        onPointerDown={event => {
          start.current = { x: event.clientX, y: event.clientY };
          swiped.current = false;
          setPaused(true);
        }}
        onPointerUp={event => {
          const origin = start.current;
          start.current = null;
          setPaused(false);
          if (!origin) return;
          const dx = event.clientX - origin.x;
          const dy = event.clientY - origin.y;
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
            swiped.current = true;
            go(index + (dx < 0 ? 1 : -1));
          }
        }}
        onPointerCancel={() => {
          start.current = null;
          setPaused(false);
        }}
        onClickCapture={event => {
          if (swiped.current) {
            event.preventDefault();
            event.stopPropagation();
            swiped.current = false;
          }
        }}
      >
        <ul
          className="ep-carousel-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {profiles.map((profile, position) => {
            const place = [profile.neighborhood, profile.city]
              .filter(Boolean)
              .join(" · ");
            const active = position === index;
            return (
              <li
                key={profile.id}
                className="ep-carousel-slide"
                aria-roledescription="slide"
                aria-label={`${position + 1} de ${count}`}
                aria-hidden={!active}
                {...(active ? {} : { inert: true })}
              >
                <Link href={`/perfil/${profile.slug}`} className="ep-slide-link">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={`Foto de ${profile.stageName}`}
                      loading={position === 0 ? "eager" : "lazy"}
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <span className="ep-card-initial" aria-hidden="true">
                      {String(profile.stageName || "A").slice(0, 1)}
                    </span>
                  )}
                  <span className="ep-slide-shade" aria-hidden="true" />
                  <span className="ep-slide-caption">
                    <span className="ep-slide-tags">
                      {profile.isSponsored ? (
                        <b>Patrocinado</b>
                      ) : (
                        <b>Destaque</b>
                      )}
                      {profile.isAvailableNow ? (
                        <b className="ep-slide-now">Disponível agora</b>
                      ) : null}
                    </span>
                    <strong>
                      {profile.stageName}
                      {profile.age ? <em>, {profile.age}</em> : null}
                    </strong>
                    <span className="ep-slide-meta">
                      {place || "Perfil publicado"}
                      {typeof profile.priceFromCents === "number"
                        ? ` · a partir de ${formatBRL(profile.priceFromCents)}`
                        : ""}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            className="ep-carousel-arrow ep-carousel-prev"
            onClick={() => go(index - 1)}
            aria-label="Perfil anterior"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="ep-carousel-arrow ep-carousel-next"
            onClick={() => go(index + 1)}
            aria-label="Próximo perfil"
          >
            <span aria-hidden="true">›</span>
          </button>
          <div className="ep-carousel-dots">
            {profiles.map((profile, position) => (
              <button
                type="button"
                key={profile.id}
                className={position === index ? "is-active" : ""}
                aria-label={`Ir para o perfil ${position + 1}`}
                aria-current={position === index ? "true" : undefined}
                onClick={() => go(position)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
