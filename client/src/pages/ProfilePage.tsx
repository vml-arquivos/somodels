import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import Seo from "@/components/Seo";
import AdultGate, { useAdultAccess } from "@/components/AdultGate";
import { usePublicLight } from "@/contexts/ThemeContext";
import ListingCard from "@/components/ListingCard";
import ProfileReviews, { Stars } from "@/components/ProfileReviews";
import PhotoLightbox from "@/components/PhotoLightbox";
import { frameStyle } from "@/lib/frame";
import { cityPath } from "@/lib/discovery";
import { ratingLabel } from "@shared/reviews";
import { formatBRL } from "@shared/discovery-options";
import {
  reportCategories,
  reportCategoryLabels,
  type ReportCategory,
} from "@shared/safety";

const contactMethods = ["whatsapp", "phone", "telegram"] as const;
type ContactMethod = (typeof contactMethods)[number];

const contactLabels: Record<ContactMethod, string> = {
  whatsapp: "Chamar no WhatsApp",
  phone: "Ligar agora",
  telegram: "Chamar no Telegram",
};

const contactClass: Record<ContactMethod, string> = {
  whatsapp: "ep-btn ep-btn-wa",
  phone: "ep-btn ep-btn-primary",
  telegram: "ep-btn ep-btn-ghost",
};

function isContactMethod(value: unknown): value is ContactMethod {
  return (
    typeof value === "string" && contactMethods.includes(value as ContactMethod)
  );
}

function listOf(items: unknown) {
  return Array.isArray(items)
    ? items.filter(
        (value): value is string => typeof value === "string" && Boolean(value.trim())
      )
    : [];
}

function AboutCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ep-about-card">
      <h3>{title}</h3>
      <dl className="ep-facts">{children}</dl>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="ep-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Chips({ label, items }: { label: string; items: unknown }) {
  const values = listOf(items);
  if (!values.length) return null;
  return (
    <div className="ep-fact">
      <dt>{label}</dt>
      <dd>
        {values.map(value => (
          <span className="ep-chip-static" key={value}>
            {value}
          </span>
        ))}
      </dd>
    </div>
  );
}

export default function ProfilePage() {
  usePublicLight();
  const { slug = "" } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const adultAccess = useAdultAccess();
  const result = trpc.profiles.bySlug.useQuery(
    { slug },
    { enabled: adultAccess.ready }
  );
  const config = trpc.system.config.useQuery();
  const settings = trpc.management.settings.useQuery();
  const data = result.data;
  const ratingSummary = trpc.reviews.forProfile.useQuery(
    { profileId: data?.profile.id ?? 0, sort: "recent", page: 1 },
    { enabled: Boolean(data?.profile.id) }
  );
  const profileId = data?.profile.id ?? 0;
  const flags = config.data?.featureFlags;
  const [reportOpen, setReportOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategory>("other");
  const [reportDescription, setReportDescription] = useState("");

  const favoriteStatus = trpc.safety.favoriteStatus.useQuery(
    { profileId },
    { enabled: Boolean(user && profileId && flags?.favoritesEnabled) }
  );
  const blockStatus = trpc.safety.blockStatus.useQuery(
    { profileId },
    { enabled: Boolean(user && profileId && flags?.blockingEnabled) }
  );

  const favorite = trpc.safety.favorite.useMutation({
    onSuccess: async () => {
      toast.success("Anúncio salvo nos favoritos");
      await favoriteStatus.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const unfavorite = trpc.safety.unfavorite.useMutation({
    onSuccess: async () => {
      toast.success("Anúncio removido dos favoritos");
      await favoriteStatus.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const block = trpc.safety.blockProfile.useMutation({
    onSuccess: async () => {
      toast.success("Anúncio bloqueado para sua conta");
      await Promise.all([blockStatus.refetch(), favoriteStatus.refetch()]);
    },
    onError: error => toast.error(error.message),
  });
  const unblock = trpc.safety.unblockProfile.useMutation({
    onSuccess: async () => {
      toast.success("Bloqueio removido");
      await blockStatus.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const report = trpc.safety.reportProfile.useMutation({
    onSuccess: response => {
      toast.success(
        response.duplicate
          ? "Sua denúncia anterior continua em análise"
          : "Denúncia registrada para moderação"
      );
      setReportDescription("");
      setReportOpen(false);
    },
    onError: error => toast.error(error.message),
  });
  const contact = trpc.safety.contactIntent.useMutation({
    onSuccess: response => {
      if (response.href.startsWith("tel:"))
        window.location.href = response.href;
      else window.open(response.href, "_blank", "noopener,noreferrer");
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => setActivePhoto(0), [slug]);

  const trackView = trpc.profiles.trackView.useMutation();
  const publicProfileId = data?.profile.id;
  useEffect(() => {
    // Uma contagem por abertura da página; o servidor ainda aplica limite por visitante.
    if (publicProfileId) trackView.mutate({ slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicProfileId, slug]);

  const availableContactMethods = useMemo<ContactMethod[]>(() => {
    const methods =
      (data?.profile as { availableContactMethods?: unknown[] } | undefined)
        ?.availableContactMethods ?? [];
    return methods.filter(isContactMethod);
  }, [data]);

  const refreshSafety = async () => {
    await utils.safety.invalidate();
  };

  async function shareProfile() {
    const url = window.location.href;
    const name = data?.profile.stageName || "Anúncio";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} — Ero Models`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      // Quem cancela o compartilhamento não precisa de aviso.
    }
  }

  if (!adultAccess.ready)
    return <AdultGate access={adultAccess}>{null}</AdultGate>;

  const profile = data?.profile;
  const photoUrls = data
    ? Array.from(
        new Set(
          [
            profile?.avatarUrl,
            ...data.media
              .filter(media => !media.isPremium && media.kind === "photo")
              .map(media => media.url),
          ].filter((url): url is string => Boolean(url))
        )
      )
    : [];
  const videos = data
    ? data.media.filter(
        media => !media.isPremium && media.kind === "video" && media.url
      )
    : [];
  const currentPhoto = photoUrls[Math.min(activePhoto, photoUrls.length - 1)];
  const canContact =
    flags?.secureContactEnabled === true &&
    settings.data?.showContact === true &&
    !blockStatus.data?.blocked;

  return (
    <div className="studio studio-public ep-page">
      <StudioHeader />
      <main className="ep-main ep-profile-page">
        <div className="ep-wrap">
          <nav className="ep-breadcrumb" aria-label="Você está em">
            <Link href="/">Início</Link>
            {profile?.city && (
              <>
                <span aria-hidden="true">›</span>
                <Link href={cityPath(profile.city)}>{profile.city}</Link>
              </>
            )}
            <span aria-hidden="true">›</span>
            <span aria-current="page">{profile?.stageName || "Anúncio"}</span>
          </nav>
          {result.isLoading ? (
            <p className="ep-note">Carregando anúncio…</p>
          ) : result.error ? (
            <p className="ep-note" role="alert">
              Não foi possível carregar o anúncio. Tente de novo.
            </p>
          ) : !data || !profile ? (
            <section className="ep-empty">
              <h1>Anúncio indisponível</h1>
              <p>Este anúncio saiu do ar ou o endereço está errado.</p>
              <Link className="ep-btn ep-btn-primary" href="/">
                Ver outros anúncios
              </Link>
            </section>
          ) : (
            <>
              <Seo
                title={`${profile.stageName} — Ero Models`}
                description={
                  profile.description || "Anúncio de acompanhante na Ero Models"
                }
                path={`/perfil/${slug}`}
                image={profile.avatarUrl || undefined}
                jsonLd={{
                  "@context": "https://schema.org",
                  "@graph": [
                    {
                      "@type": "ProfilePage",
                      name: profile.stageName,
                      url: new URL(
                        `/perfil/${slug}`,
                        window.location.origin
                      ).toString(),
                      dateModified: new Date(profile.updatedAt).toISOString(),
                      mainEntity: {
                        "@type": "Person",
                        name: profile.stageName,
                        jobTitle: "Acompanhante",
                        description: profile.description || undefined,
                        image: profile.avatarUrl || undefined,
                        worksFor: {
                          "@type": "Organization",
                          name: "Ero Models",
                        },
                      },
                    },
                    {
                      "@type": "BreadcrumbList",
                      itemListElement: [
                        {
                          "@type": "ListItem",
                          position: 1,
                          name: "Início",
                          item: new URL("/", window.location.origin).toString(),
                        },
                        {
                          "@type": "ListItem",
                          position: 2,
                          name: profile.city,
                          item: new URL(
                            cityPath(profile.city),
                            window.location.origin
                          ).toString(),
                        },
                        {
                          "@type": "ListItem",
                          position: 3,
                          name: profile.stageName,
                        },
                      ],
                    },
                  ],
                }}
                noindex={Boolean(
                  config.data?.robotsNoIndex ||
                    config.data?.ageVerificationRequired ||
                    !config.data?.publicLaunchEnabled
                )}
              />

              <div className="ep-profile-grid">
                <section className="ep-gallery" aria-label="Fotos do anúncio">
                  <div
                    className="ep-gallery-main"
                    style={frameStyle(currentPhoto)}
                  >
                    {currentPhoto ? (
                      <>
                        <img
                          src={currentPhoto}
                          alt={`Foto de ${profile.stageName}`}
                        />
                        <button
                          type="button"
                          className="ep-gallery-zoom"
                          aria-label="Ampliar foto"
                          onClick={() => setLightbox(true)}
                        />
                      </>
                    ) : (
                      <span className="ep-gallery-empty">
                        {profile.stageName.slice(0, 1)}
                      </span>
                    )}
                    {profile.isAvailableNow && (
                      <span className="ep-card-now">Disponível agora</span>
                    )}
                    {photoUrls.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="ep-gallery-arrow is-prev"
                          aria-label="Foto anterior"
                          onClick={() =>
                            setActivePhoto(
                              (activePhoto - 1 + photoUrls.length) %
                                photoUrls.length
                            )
                          }
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="ep-gallery-arrow is-next"
                          aria-label="Próxima foto"
                          onClick={() =>
                            setActivePhoto((activePhoto + 1) % photoUrls.length)
                          }
                        >
                          ›
                        </button>
                        <span className="ep-gallery-count">
                          {Math.min(activePhoto, photoUrls.length - 1) + 1} /{" "}
                          {photoUrls.length}
                        </span>
                      </>
                    )}
                  </div>
                  {photoUrls.length > 1 && (
                    <ul className="ep-thumbs">
                      {photoUrls.map((url, index) => (
                        <li key={url}>
                          <button
                            type="button"
                            className={index === activePhoto ? "is-on" : ""}
                            style={frameStyle(url)}
                            aria-label={`Ver foto ${index + 1}`}
                            onClick={() => setActivePhoto(index)}
                          >
                            <img src={url} alt="" loading="lazy" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <aside className="ep-profile-info">
                  <p className="ep-eyebrow">
                    {(profile.categories || []).join(" · ") || "Acompanhante"}
                  </p>
                  <h1>{profile.stageName}</h1>
                  <p className="ep-profile-place">
                    {profile.age ? `${profile.age} anos · ` : ""}
                    {profile.neighborhood ? `${profile.neighborhood}, ` : ""}
                    {profile.city}
                    {profile.region ? ` / ${profile.region}` : ""}
                  </p>
                  {ratingSummary.data && ratingSummary.data.summary.count > 0 && (
                    <a className="ep-rating-line" href="#avaliacoes">
                      <Stars value={ratingSummary.data.summary.average} />
                      <strong>
                        {String(ratingSummary.data.summary.average).replace(
                          ".",
                          ","
                        )}
                      </strong>
                      <span>
                        {ratingLabel(ratingSummary.data.summary.average)} ·{" "}
                        {ratingSummary.data.summary.count} avaliaç
                        {ratingSummary.data.summary.count === 1 ? "ão" : "ões"}
                      </span>
                    </a>
                  )}
                  <div className="ep-slide-tags">
                    {profile.identityVerified && (
                      <span className="ep-tag ep-tag-light">
                        Documentos verificados
                      </span>
                    )}
                    {profile.availabilityLabel && (
                      <span className="ep-tag ep-tag-dark">
                        {profile.availabilityLabel}
                      </span>
                    )}
                  </div>
                  <div className="ep-info-cards">
                    {typeof profile.priceFromCents === "number" && (
                      <div className="ep-info-card">
                        <small>A partir de</small>
                        <strong>{formatBRL(profile.priceFromCents)}</strong>
                        <span>por hora</span>
                      </div>
                    )}
                    <div className="ep-info-card">
                      <small>Localização</small>
                      <strong>
                        {profile.neighborhood || profile.locationNote || profile.city}
                      </strong>
                      <span>
                        {profile.neighborhood || profile.locationNote
                          ? `${profile.city}${profile.region ? ` / ${profile.region}` : ""}`
                          : profile.region || "Local aproximado"}
                      </span>
                    </div>
                  </div>

                  {canContact && (
                    <div className="ep-contact" aria-label="Contato do anúncio">
                      {availableContactMethods.length ? (
                        availableContactMethods.map(method => (
                          <button
                            key={method}
                            type="button"
                            className={contactClass[method]}
                            disabled={contact.isPending}
                            onClick={() =>
                              contact.mutate({
                                profileId: profile.id,
                                method,
                              })
                            }
                          >
                            {contactLabels[method]}
                          </button>
                        ))
                      ) : (
                        <p className="ep-note">
                          Este anúncio ainda não informou um contato.
                        </p>
                      )}
                      <p className="ep-contact-note">
                        A conversa acontece fora da Ero Models. Combine tudo
                        direto e nunca pague adiantado.
                      </p>
                    </div>
                  )}

                  <div className="ep-profile-links">
                    <button type="button" onClick={() => void shareProfile()}>
                      Compartilhar
                    </button>
                    {user && flags?.favoritesEnabled && (
                      <button
                        type="button"
                        disabled={favorite.isPending || unfavorite.isPending}
                        onClick={async () => {
                          if (favoriteStatus.data?.favorited)
                            await unfavorite.mutateAsync({
                              profileId: profile.id,
                            });
                          else
                            await favorite.mutateAsync({
                              profileId: profile.id,
                            });
                          await refreshSafety();
                        }}
                      >
                        {favoriteStatus.data?.favorited
                          ? "Remover dos favoritos"
                          : "Salvar nos favoritos"}
                      </button>
                    )}
                    {user && flags?.blockingEnabled && (
                      <button
                        type="button"
                        disabled={block.isPending || unblock.isPending}
                        onClick={() =>
                          blockStatus.data?.blocked
                            ? unblock.mutate({ profileId: profile.id })
                            : block.mutate({ profileId: profile.id })
                        }
                      >
                        {blockStatus.data?.blocked ? "Desbloquear" : "Bloquear"}
                      </button>
                    )}
                    {flags?.reportsEnabled && (
                      <button
                        type="button"
                        onClick={() => setReportOpen(value => !value)}
                      >
                        Denunciar anúncio
                      </button>
                    )}
                  </div>

                  {reportOpen && flags?.reportsEnabled && (
                    <form
                      className="ep-report"
                      aria-label="Denunciar este anúncio"
                      onSubmit={event => {
                        event.preventDefault();
                        report.mutate({
                          profileId: profile.id,
                          category: reportCategory,
                          description: reportDescription,
                        });
                      }}
                    >
                      <h2>Denunciar este anúncio</h2>
                      <label>
                        Motivo
                        <select
                          value={reportCategory}
                          onChange={event =>
                            setReportCategory(
                              event.target.value as ReportCategory
                            )
                          }
                        >
                          {reportCategories.map(category => (
                            <option key={category} value={category}>
                              {reportCategoryLabels[category]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        O que aconteceu
                        <textarea
                          rows={4}
                          maxLength={200}
                          value={reportDescription}
                          onChange={event =>
                            setReportDescription(event.target.value)
                          }
                          placeholder="Conte em poucas palavras. Não envie documentos nem senhas."
                        />
                      </label>
                      <div className="ep-report-actions">
                        <button
                          type="submit"
                          className="ep-btn ep-btn-primary"
                          disabled={
                            report.isPending ||
                            reportDescription.trim().length < 10
                          }
                        >
                          Enviar denúncia
                        </button>
                        <button
                          type="button"
                          className="ep-btn ep-btn-ghost"
                          onClick={() => setReportOpen(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </aside>
              </div>

              <section className="ep-profile-block" aria-labelledby="about-title">
                <h2 id="about-title">Sobre {profile.stageName}</h2>
                <div className="ep-about-grid">
                  <div className="ep-about-card is-wide">
                    <h3>Descrição</h3>
                    <p className="ep-profile-about">
                      {profile.description ||
                        "Esta pessoa ainda não escreveu uma apresentação."}
                    </p>
                  </div>
                  <AboutCard title="Características">
                    {profile.age ? (
                      <Fact label="Idade" value={`${profile.age} anos`} />
                    ) : null}
                    <Chips label="Perfil" items={profile.attributes} />
                    <Chips label="Idiomas" items={profile.languages} />
                    <Chips label="Preferências" items={profile.preferences} />
                  </AboutCard>
                  <AboutCard title="Serviços oferecidos">
                    <Chips label="Categorias" items={profile.categories} />
                    <Chips label="Serviços" items={profile.services} />
                  </AboutCard>
                  <AboutCard title="Atendimento">
                    <Fact
                      label="Cidade"
                      value={`${profile.city}${profile.region ? ` / ${profile.region}` : ""}`}
                    />
                    {(profile.neighborhood || profile.locationNote) && (
                      <Fact
                        label="Bairro"
                        value={profile.neighborhood || profile.locationNote || ""}
                      />
                    )}
                    <Chips label="Onde atende" items={profile.attendancePlaces} />
                    <Chips label="Como atende" items={profile.contactOptions} />
                  </AboutCard>
                  <AboutCard title="Horário e pagamento">
                    <Fact
                      label="Disponibilidade"
                      value={
                        profile.isAvailableNow
                          ? "Disponível agora"
                          : profile.availabilityLabel || "Combine pelo contato"
                      }
                    />
                    <Chips label="Pagamento" items={profile.paymentMethods} />
                  </AboutCard>
                </div>
                {profile.createdAt && (
                  <p className="ep-created">
                    Anúncio criado em{" "}
                    {new Date(profile.createdAt).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                      timeZone: "America/Sao_Paulo",
                    })}
                  </p>
                )}
              </section>

              {profile.identityVerified && (
                <section className="ep-verify-block" aria-labelledby="verify-title">
                  <h2 id="verify-title">Verificação</h2>
                  <p>
                    A equipe da Ero Models conferiu os documentos desta pessoa.
                  </p>
                  <ul>
                    <li>Perfil verificado</li>
                    <li>Idade confirmada (18 anos ou mais)</li>
                    <li>Documento conferido pela equipe</li>
                  </ul>
                </section>
              )}

              {videos.length > 0 && (
                <section className="ep-profile-block">
                  <h2>Vídeos</h2>
                  <div className="ep-videos">
                    {videos.map(media => (
                      <video
                        key={media.id}
                        src={media.url!}
                        controls
                        preload="metadata"
                        aria-label={
                          media.title || `Vídeo de ${profile.stageName}`
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              <ProfileReviews
                profileId={profile.id}
                stageName={profile.stageName}
                slug={slug}
              />

              <section className="ep-safety-note">
                <h2>Cuidados ao marcar</h2>
                <p>
                  Confirme valores e condições direto com a pessoa. Não faça
                  pagamento adiantado nem Pix para &ldquo;garantir&rdquo; horário.
                  Desconfie de pressa, ameaça ou pedido estranho e{" "}
                  <Link href="/seguranca">veja as dicas de segurança</Link>.
                </p>
              </section>

              {data.related?.length > 0 && (
                <section className="ep-profile-block" aria-labelledby="related-title">
                  <h2 id="related-title">Outros anúncios em {profile.city}</h2>
                  <div className="ep-grid">
                    {data.related.map(item => (
                      <ListingCard key={item.id} profile={item} />
                    ))}
                  </div>
                </section>
              )}
              {lightbox && photoUrls.length > 0 && (
                <PhotoLightbox
                  urls={photoUrls}
                  index={Math.min(activePhoto, photoUrls.length - 1)}
                  name={profile.stageName}
                  onIndex={setActivePhoto}
                  onClose={() => setLightbox(false)}
                />
              )}
            </>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
