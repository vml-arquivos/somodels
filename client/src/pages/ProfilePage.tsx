import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import Seo from "@/components/Seo";
import AdultGate, { useAdultAccess } from "@/components/AdultGate";
import ListingCard from "@/components/ListingCard";
import {
  reportCategories,
  reportCategoryLabels,
  type ReportCategory,
} from "@shared/safety";

const contactMethods = ["whatsapp", "phone", "telegram"] as const;
type ContactMethod = (typeof contactMethods)[number];

const contactLabels: Record<ContactMethod, string> = {
  whatsapp: "Abrir WhatsApp",
  phone: "Ligar agora",
  telegram: "Abrir Telegram",
};

function isContactMethod(value: unknown): value is ContactMethod {
  return (
    typeof value === "string" &&
    contactMethods.includes(value as ContactMethod)
  );
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items: unknown;
}) {
  const values = Array.isArray(items)
    ? items.filter(value => typeof value === "string" && value.trim())
    : [];
  if (!values.length) return null;
  return (
    <div className="studio-profile-detail-group">
      <dt>{title}</dt>
      <dd>{values.join(" · ")}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const adultAccess = useAdultAccess();
  const result = trpc.profiles.bySlug.useQuery(
    { slug },
    { enabled: adultAccess.ready }
  );
  const config = trpc.system.config.useQuery();
  const data = result.data;
  const profileId = data?.profile.id ?? 0;
  const flags = config.data?.featureFlags;
  const [reportOpen, setReportOpen] = useState(false);
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
      if (response.href.startsWith("tel:")) window.location.href = response.href;
      else window.open(response.href, "_blank", "noopener,noreferrer");
    },
    onError: error => toast.error(error.message),
  });

  const availableContactMethods = useMemo<ContactMethod[]>(() => {
    const methods = (data?.profile as { availableContactMethods?: unknown[] } | undefined)
      ?.availableContactMethods ?? [];
    return methods.filter(isContactMethod);
  }, [data]);

  const refreshSafety = async () => {
    await utils.safety.invalidate();
  };

  if (!adultAccess.ready) return <AdultGate access={adultAccess}>{null}</AdultGate>;

  return (
    <div className="studio">
      <StudioHeader />
      <main className="studio-main">
        <Link href="/">← Voltar aos anúncios</Link>
        {result.isLoading ? (
          <p>Carregando anúncio…</p>
        ) : result.error ? (
          <p role="alert">Não foi possível carregar o anúncio.</p>
        ) : !data ? (
          <section className="studio-panel">
            <h1>Anúncio indisponível</h1>
            <p>Este anúncio pode estar em revisão, inativo ou ainda não publicado.</p>
          </section>
        ) : (
          <>
            <Seo
              title={`${data.profile.stageName} — Ero Models`}
              description={data.profile.description || "Anúncio adulto na Ero Models"}
              path={`/perfil/${slug}`}
              image={data.profile.avatarUrl || undefined}
              jsonLd={{
                "@context": "https://schema.org",
                "@type": "ProfilePage",
                name: data.profile.stageName,
                url: new URL(`/perfil/${slug}`, window.location.origin).toString(),
                dateModified: new Date(data.profile.updatedAt).toISOString(),
                mainEntity: {
                  "@type": "Person",
                  name: data.profile.stageName,
                  jobTitle: "Acompanhante",
                  description: data.profile.description || undefined,
                  image: data.profile.avatarUrl || undefined,
                  worksFor: { "@type": "Organization", name: "Ero Models" },
                },
              }}
              noindex={Boolean(
                config.data?.robotsNoIndex ||
                  config.data?.ageVerificationRequired ||
                  !config.data?.publicLaunchEnabled
              )}
            />
            <section className="studio-profile-hero studio-listing-detail-hero">
              <div className="studio-profile-cover">
                <div className="studio-cover">
                  {data.profile.avatarUrl ? (
                    <img
                      src={data.profile.avatarUrl}
                      alt={`Capa do anúncio de ${data.profile.stageName}`}
                    />
                  ) : (
                    <span>{data.profile.stageName.slice(0, 1)}</span>
                  )}
                  <span className="studio-listing-age">+18</span>
                  {data.profile.isAvailableNow && (
                    <span className="studio-listing-availability">Disponível agora</span>
                  )}
                </div>
              </div>
              <div>
                <p className="studio-kicker">
                  {(data.profile.categories || []).join(" · ") || "Acompanhante"}
                </p>
                <h1>{data.profile.stageName}</h1>
                <p className="studio-profile-location">
                  {data.profile.city}
                  {data.profile.region ? ` / ${data.profile.region}` : ""}
                </p>
                {data.profile.age && <p>{data.profile.age} anos</p>}
                {data.profile.availabilityLabel && (
                  <p className="studio-listing-status">
                    {data.profile.availabilityLabel}
                  </p>
                )}
                <p className="studio-description">
                  {data.profile.description ||
                    "O titular ainda não adicionou uma apresentação pública para este anúncio."}
                </p>

                <div className="studio-actions" aria-label="Ações de segurança do anúncio">
                  {user && flags?.favoritesEnabled && (
                    <button
                      disabled={favorite.isPending || unfavorite.isPending}
                      onClick={async () => {
                        if (favoriteStatus.data?.favorited)
                          await unfavorite.mutateAsync({ profileId: data.profile.id });
                        else await favorite.mutateAsync({ profileId: data.profile.id });
                        await refreshSafety();
                      }}
                    >
                      {favoriteStatus.data?.favorited
                        ? "Remover favorito"
                        : "Salvar anúncio"}
                    </button>
                  )}
                  {user && flags?.blockingEnabled && (
                    <button
                      disabled={block.isPending || unblock.isPending}
                      onClick={() =>
                        blockStatus.data?.blocked
                          ? unblock.mutate({ profileId: data.profile.id })
                          : block.mutate({ profileId: data.profile.id })
                      }
                    >
                      {blockStatus.data?.blocked ? "Desbloquear" : "Bloquear"}
                    </button>
                  )}
                  {user && flags?.reportsEnabled && (
                    <button onClick={() => setReportOpen(value => !value)}>
                      Denunciar
                    </button>
                  )}
                </div>

                {!user &&
                  (flags?.secureContactEnabled ||
                    flags?.favoritesEnabled ||
                    flags?.blockingEnabled ||
                    flags?.reportsEnabled) && (
                    <p className="studio-muted">
                      <Link href={`/login?returnTo=/perfil/${slug}`}>
                        Entre na sua conta
                      </Link>{" "}
                      para usar contato e recursos de segurança.
                    </p>
                  )}

                {user && flags?.secureContactEnabled && !blockStatus.data?.blocked && (
                  <section className="studio-contact-panel" aria-label="Contato do anúncio">
                    <p className="studio-kicker">Contato direto</p>
                    <h2>Fale com este anúncio</h2>
                    <p className="studio-muted">
                      A saída para o canal externo é registrada para segurança. A
                      conversa passa a ocorrer fora da Ero Models.
                    </p>
                    {availableContactMethods.length ? (
                      <div className="studio-actions">
                        {availableContactMethods.map(method => (
                          <button
                            className="studio-cta"
                            key={method}
                            disabled={contact.isPending}
                            onClick={() =>
                              contact.mutate({ profileId: data.profile.id, method })
                            }
                          >
                            {contactLabels[method]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p>Nenhum canal autorizado está disponível neste momento.</p>
                    )}
                  </section>
                )}

                {reportOpen && user && flags?.reportsEnabled && (
                  <section className="studio-panel" aria-label="Formulário de denúncia">
                    <h3>Denunciar este anúncio</h3>
                    <label>
                      Categoria
                      <select
                        value={reportCategory}
                        onChange={event =>
                          setReportCategory(event.target.value as ReportCategory)
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
                      Descrição
                      <textarea
                        rows={5}
                        maxLength={200}
                        value={reportDescription}
                        onChange={event => setReportDescription(event.target.value)}
                        placeholder="Explique objetivamente o que aconteceu. Não inclua documentos, senhas ou dados sensíveis."
                      />
                    </label>
                    <div className="studio-actions">
                      <button
                        className="primary"
                        disabled={report.isPending || reportDescription.trim().length < 10}
                        onClick={() =>
                          report.mutate({
                            profileId: data.profile.id,
                            category: reportCategory,
                            description: reportDescription,
                          })
                        }
                      >
                        Enviar denúncia
                      </button>
                      <button onClick={() => setReportOpen(false)}>Cancelar</button>
                    </div>
                  </section>
                )}
              </div>
            </section>

            <section className="studio-profile-details" aria-labelledby="details-title">
              <div className="studio-panel">
                <p className="studio-kicker">Informações públicas</p>
                <h2 id="details-title">Especificações do anúncio</h2>
                <dl className="studio-details">
                  <dt>Localização</dt>
                  <dd>
                    {data.profile.city}
                    {data.profile.region ? ` / ${data.profile.region}` : ""}
                  </dd>
                  {data.profile.locationNote && (
                    <>
                      <dt>Região de atendimento</dt>
                      <dd>{data.profile.locationNote}</dd>
                    </>
                  )}
                  {data.profile.age && (
                    <>
                      <dt>Idade</dt>
                      <dd>{data.profile.age} anos</dd>
                    </>
                  )}
                  <dt>Disponibilidade</dt>
                  <dd>
                    {data.profile.isAvailableNow
                      ? "Disponível agora"
                      : data.profile.availabilityLabel || "Consultar no contato"}
                  </dd>
                  <DetailList title="Categorias" items={data.profile.categories} />
                  <DetailList title="Características" items={data.profile.attributes} />
                  <DetailList title="Idiomas" items={data.profile.languages} />
                  <DetailList title="Preferências" items={data.profile.preferences} />
                  <DetailList title="Formas de atendimento" items={data.profile.contactOptions} />
                </dl>
              </div>
              <div className="studio-panel studio-profile-trust">
                <p className="studio-kicker">Uso responsável</p>
                <h2>Antes de entrar em contato</h2>
                <p>
                  Confirme informações, limites e condições diretamente com o
                  titular. Não faça pagamentos antecipados para a plataforma e
                  interrompa a interação diante de pressão, ameaça ou pedido
                  suspeito.
                </p>
                <Link href="/seguranca">Ver orientações de segurança</Link>
              </div>
            </section>

            <section aria-labelledby="gallery-title">
              <div className="studio-title">
                <div>
                  <p className="studio-kicker">Conteúdo autorizado</p>
                  <h2 id="gallery-title">Fotos e vídeos do anúncio</h2>
                </div>
                <small>{data.media.length} arquivo(s) publicado(s)</small>
              </div>
              <div className="studio-gallery studio-ad-gallery">
                {data.media
                  .filter(media => !media.isPremium && media.url)
                  .map(media => (
                    <figure key={media.id}>
                      {media.kind === "photo" ? (
                        <img
                          src={media.url}
                          alt={media.title || `Foto de ${data.profile.stageName}`}
                          loading="lazy"
                        />
                      ) : (
                        <video
                          src={media.url}
                          controls
                          preload="metadata"
                          aria-label={media.title || `Vídeo de ${data.profile.stageName}`}
                        />
                      )}
                      {media.title && <figcaption>{media.title}</figcaption>}
                    </figure>
                  ))}
              </div>
              {!data.media.filter(media => !media.isPremium && media.url).length && (
                <div className="studio-panel">
                  <p>Este anúncio ainda não possui mídia pública aprovada.</p>
                </div>
              )}
            </section>

            {data.related?.length > 0 && (
              <section aria-labelledby="related-title">
                <div className="studio-title">
                  <div>
                    <p className="studio-kicker">Mais na mesma cidade</p>
                    <h2 id="related-title">Outros anúncios próximos</h2>
                  </div>
                </div>
                <div className="studio-cards">
                  {data.related.map(profile => (
                    <ListingCard key={profile.id} profile={profile} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
