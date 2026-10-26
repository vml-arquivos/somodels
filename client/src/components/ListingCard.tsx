import { Link } from "wouter";
import { formatBRL } from "@shared/discovery-options";

// Cartão da vitrine: foto, nome, idade, local e preço. O cartão inteiro é o link.
export default function ListingCard({ profile }: { profile: any }) {
  const place = [
    profile.age ? `${profile.age} anos` : null,
    profile.neighborhood || profile.city,
  ]
    .filter(Boolean)
    .join(" · ");
  const sponsored = Boolean(profile.isSponsored);
  const featured = !sponsored && Boolean(profile.isFeatured);
  return (
    <article className="ep-card">
      <Link
        href={`/perfil/${profile.slug}`}
        className="ep-card-link"
        aria-label={`Ver anúncio de ${profile.stageName}`}
      >
        <div className="ep-card-photo">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={`Foto de ${profile.stageName}`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="ep-card-initial" aria-hidden="true">
              {String(profile.stageName || "A").slice(0, 1)}
            </span>
          )}
          <div className="ep-card-tags">
            {sponsored && <span className="ep-tag ep-tag-dark">Patrocinado</span>}
            {featured && <span className="ep-tag ep-tag-accent">Destaque</span>}
            {profile.identityVerified && (
              <span className="ep-tag ep-tag-light">Verificada</span>
            )}
          </div>
          {profile.isAvailableNow && (
            <span className="ep-card-now">Disponível agora</span>
          )}
        </div>
        <div className="ep-card-body">
          <h3>{profile.stageName}</h3>
          <p className="ep-card-place">{place || "Localização não informada"}</p>
          {typeof profile.priceFromCents === "number" && (
            <p className="ep-card-price">
              a partir de <strong>{formatBRL(profile.priceFromCents)}</strong>
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
