import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import Seo from "@/components/Seo";
import {
  reportCategories,
  reportCategoryLabels,
  type ReportCategory,
} from "@shared/safety";

const contactMethods = ["whatsapp", "phone", "telegram"] as const;
type ContactMethod = (typeof contactMethods)[number];

const contactLabels: Record<ContactMethod, string> = {
  whatsapp: "Abrir WhatsApp",
  phone: "Ligar",
  telegram: "Abrir Telegram",
};

function isContactMethod(value: unknown): value is ContactMethod {
  return (
    typeof value === "string" &&
    contactMethods.includes(value as ContactMethod)
  );
}

export default function ProfilePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const result = trpc.profiles.bySlug.useQuery({ slug });
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
      toast.success("Perfil salvo nos favoritos");
      await favoriteStatus.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const unfavorite = trpc.safety.unfavorite.useMutation({
    onSuccess: async () => {
      toast.success("Perfil removido dos favoritos");
      await favoriteStatus.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const block = trpc.safety.blockProfile.useMutation({
    onSuccess: async () => {
      toast.success("Perfil bloqueado para sua conta");
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

  return (
    <div className="studio">
      <StudioHeader />
      <main className="studio-main">
        <Link href="/">← Voltar à vitrine</Link>
        {result.isLoading ? (
          <p>Carregando portfólio…</p>
        ) : result.error ? (
          <p role="alert">Não foi possível carregar o portfólio.</p>
        ) : !data ? (
          <section className="studio-panel">
            <h1>Portfólio indisponível</h1>
            <p>Este portfólio pode estar em revisão ou não estar publicado.</p>
          </section>
        ) : (
          <>
            <Seo
              title={`${data.profile.stageName} — Só Models`}
              description={data.profile.description || "Portfólio profissional"}
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
                  jobTitle: data.profile.categories.join(", "),
                  description: data.profile.description || undefined,
                  image: data.profile.avatarUrl || undefined,
                  worksFor: { "@type": "Organization", name: "Só Models" },
                },
              }}
              noindex={Boolean(
                config.data?.robotsNoIndex ||
                  config.data?.ageVerificationRequired ||
                  !config.data?.publicLaunchEnabled
              )}
            />
            <section className="studio-profile-hero">
              <div className="studio-cover">
                {data.profile.avatarUrl ? (
                  <img src={data.profile.avatarUrl} alt={data.profile.stageName} />
                ) : (
                  <span>{data.profile.stageName.slice(0, 1)}</span>
                )}
              </div>
              <div>
                <p className="studio-kicker">{data.profile.categories.join(" · ")}</p>
                <h1>{data.profile.stageName}</h1>
                <p>
                  {data.profile.city} {data.profile.region ? `/ ${data.profile.region}` : ""}
                </p>
                <p className="studio-description">{data.profile.description}</p>
                <p>{data.profile.languages.join(" · ")}</p>
                <p>{data.profile.attributes.join(" · ")}</p>

                {user && (
                  <div className="studio-actions" aria-label="Ações de segurança do perfil">
                    {flags?.favoritesEnabled && (
                      <button
                        disabled={favorite.isPending || unfavorite.isPending}
                        onClick={async () => {
                          if (favoriteStatus.data?.favorited)
                            await unfavorite.mutateAsync({ profileId: data.profile.id });
                          else await favorite.mutateAsync({ profileId: data.profile.id });
                          await refreshSafety();
                        }}
                      >
                        {favoriteStatus.data?.favorited ? "Remover favorito" : "Salvar favorito"}
                      </button>
                    )}
                    {flags?.blockingEnabled && (
                      <button
                        disabled={block.isPending || unblock.isPending}
                        onClick={() =>
                          blockStatus.data?.blocked
                            ? unblock.mutate({ profileId: data.profile.id })
                            : block.mutate({ profileId: data.profile.id })
                        }
                      >
                        {blockStatus.data?.blocked ? "Desbloquear perfil" : "Bloquear perfil"}
                      </button>
                    )}
                    {flags?.reportsEnabled && (
                      <button onClick={() => setReportOpen(value => !value)}>Denunciar</button>
                    )}
                  </div>
                )}

                {!user &&
                  (flags?.secureContactEnabled ||
                    flags?.favoritesEnabled ||
                    flags?.blockingEnabled ||
                    flags?.reportsEnabled) && (
                    <p className="studio-muted">
                      <Link href={`/login?returnTo=/perfil/${slug}`}>Entre na sua conta</Link>{" "}
                      para usar contato e recursos de segurança.
                    </p>
                  )}

                {user && flags?.secureContactEnabled && !blockStatus.data?.blocked && (
                  <section className="studio-panel">
                    <h3>Contato externo controlado</h3>
                    <p className="studio-muted">
                      A plataforma registra apenas a saída para o canal escolhido. A conversa passa a ocorrer fora da Só Models e não é controlada pela plataforma.
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
                      <p>Nenhum canal externo autorizado está disponível neste momento.</p>
                    )}
                  </section>
                )}

                {reportOpen && user && flags?.reportsEnabled && (
                  <section className="studio-panel" aria-label="Formulário de denúncia">
                    <h3>Denunciar este perfil</h3>
                    <label>
                      Categoria
                      <select
                        value={reportCategory}
                        onChange={event => setReportCategory(event.target.value as ReportCategory)}
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
                        placeholder="Explique objetivamente o que aconteceu. Não inclua documentos, senhas ou outros dados sensíveis."
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

            <h2>Trabalhos e apresentação</h2>
            <div className="studio-gallery">
              {data.media
                .filter(m => !m.isPremium)
                .map(m => (
                  <figure key={m.id}>
                    {m.kind === "photo" ? (
                      <img
                        src={m.url}
                        alt={m.title || `Trabalho de ${data.profile.stageName}`}
                        loading="lazy"
                      />
                    ) : (
                      <video src={m.url} controls preload="metadata" />
                    )}
                    {m.title && <figcaption>{m.title}</figcaption>}
                  </figure>
                ))}
            </div>
            {!data.media.length && <p>Nenhum arquivo público neste portfólio.</p>}
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
