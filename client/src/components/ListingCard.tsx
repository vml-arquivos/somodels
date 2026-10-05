import { Link } from "wouter";

export default function ListingCard({ profile }: { profile: any }) {
  const categories = Array.isArray(profile.categories) ? profile.categories : [];
  const attributes = Array.isArray(profile.attributes) ? profile.attributes : [];
  const location = [profile.city, profile.region].filter(Boolean).join(" / ");

  return (
    <article className="studio-listing-card">
      <Link href={`/perfil/${profile.slug}`} className="studio-card-main">
        <div className="studio-cover">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={`Capa do anúncio de ${profile.stageName}`}
              loading="lazy"
            />
          ) : (
            <span>{String(profile.stageName || "A").slice(0, 1)}</span>
          )}
          <span className="studio-listing-age">+18</span>
          {profile.isAvailableNow && (
            <span className="studio-listing-availability">Disponível agora</span>
          )}
        </div>
        <div className="studio-listing-card-body">
          <div className="studio-listing-meta">
            <small>{categories.join(" · ") || "Acompanhante"}</small>
            {profile.isFeatured && <span>Destaque</span>}
          </div>
          <h3>{profile.stageName}</h3>
          <p className="studio-listing-location">
            {profile.age ? `${profile.age} anos · ` : ""}
            {location || "Localização não informada"}
          </p>
          {profile.description && (
            <p className="studio-listing-description">{profile.description}</p>
          )}
          {attributes.length > 0 && (
            <p className="studio-listing-attributes">
              {attributes.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
      </Link>
      <div className="studio-listing-card-footer">
        <span>{profile.availabilityLabel || "Anúncio publicado"}</span>
        <Link href={`/perfil/${profile.slug}`}>Ver anúncio</Link>
      </div>
    </article>
  );
}
