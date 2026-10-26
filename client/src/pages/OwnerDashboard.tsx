import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import PortfolioEditor from "@/components/PortfolioEditor";
import StudioHeader from "@/components/StudioHeader";
import Seo from "@/components/Seo";
import { portfolioPublicationLabel } from "@shared/portfolio";
import { evaluateListingQuality } from "@shared/listing-quality";
const identityLabels: Record<string, string> = {
  pending: "Em análise pela equipe",
  approved: "Identidade verificada",
  rejected: "Verificação recusada",
  expired: "Verificação expirada",
  error: "Erro na verificação",
};

function AccountPanel({ user }: { user: any }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(user?.name || "");
  const updateAccount = trpc.auth.updateAccount.useMutation({
    onSuccess: async () => {
      toast.success("Dados da conta atualizados");
      await utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  return (
    <section className="studio-panel" aria-labelledby="owner-account-title">
      <p className="studio-kicker">Dados da conta</p>
      <h2 id="owner-account-title">Seus dados de acesso</h2>
      <p className="studio-muted">
        Atualize o nome da conta aqui. O e-mail de acesso é exibido somente para
        conferência e não é alterado nesta tela.
      </p>
      <form
        className="studio-account-form"
        onSubmit={event => {
          event.preventDefault();
          updateAccount.mutate({ name });
        }}
      >
        <label>
          Nome da conta
          <input
            autoComplete="name"
            value={name}
            onChange={event => setName(event.target.value)}
          />
        </label>
        <label>
          E-mail de acesso — somente leitura
          <input value={user?.email || "—"} readOnly aria-readonly="true" />
        </label>
        <div className="studio-actions">
          <button
            className="primary"
            disabled={updateAccount.isPending || name.trim().length < 2}
          >
            {updateAccount.isPending ? "Salvando…" : "Salvar dados"}
          </button>
          <Link href="/conta">Mais opções da conta</Link>
        </div>
      </form>
    </section>
  );
}

function IdentityPanel() {
  const identity = trpc.profiles.identity.useQuery();
  const request = trpc.profiles.requestIdentity.useMutation({
    onSuccess: async () => {
      toast.success(
        "Solicitação enviada. A equipe entrará em contato por e-mail."
      );
      await identity.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const row = identity.data;
  const expired = Boolean(
    row?.status === "approved" &&
      row.expiresAt &&
      new Date(row.expiresAt) <= new Date()
  );
  const status = expired ? "expired" : row?.status;
  const canRequest =
    !row || status === "rejected" || status === "expired" || status === "error";
  return (
    <section className="studio-panel" aria-label="Verificação de identidade">
      <p className="studio-kicker">Verificação de identidade</p>
      <h2>
        {status ? identityLabels[status] : "Verificação ainda não solicitada"}
      </h2>
      <p className="studio-muted">
        A verificação só será solicitada quando a configuração de segurança ou
        um caso específico exigir. Você pode preencher, salvar e editar o
        anúncio enquanto aguarda; nenhum documento é publicado.
      </p>
      {row?.status === "rejected" && row.reviewReason && (
        <p role="alert">Motivo informado: {row.reviewReason}</p>
      )}
      {canRequest && (
        <button
          className="studio-cta"
          disabled={request.isPending}
          onClick={() => request.mutate()}
        >
          {request.isPending ? "Enviando…" : "Solicitar verificação"}
        </button>
      )}
    </section>
  );
}

const deltaLabel = (current: number, previous: number) => {
  if (previous === 0)
    return current > 0 ? "novo período com atividade" : "sem atividade";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs. período anterior`;
};

function AvailabilityPanel({
  profile,
  onChanged,
}: {
  profile: any;
  onChanged: () => void;
}) {
  const set = trpc.profiles.setAvailability.useMutation({
    onSuccess: result => {
      toast.success(
        result.isAvailableNow
          ? "Você aparece como disponível agora"
          : "Disponibilidade desligada"
      );
      onChanged();
    },
    onError: error => toast.error(error.message),
  });
  const active =
    Boolean(profile.isAvailableNow) &&
    (!profile.availableUntil || new Date(profile.availableUntil) > new Date());
  return (
    <section className="studio-panel" aria-label="Disponível agora">
      <p className="studio-kicker">Disponível agora</p>
      <h2>
        {active
          ? "Você está aparecendo como disponível"
          : "Você não está marcada como disponível"}
      </h2>
      {active && profile.availableUntil && (
        <p className="studio-muted">
          Até {new Date(profile.availableUntil).toLocaleString("pt-BR")}.
        </p>
      )}
      <div className="studio-actions">
        {[2, 4, 8, 12].map(hours => (
          <button
            key={hours}
            disabled={set.isPending}
            onClick={() =>
              set.mutate({ id: profile.id, available: true, hours })
            }
          >
            Por {hours}h
          </button>
        ))}
        {active && (
          <button
            className="danger"
            disabled={set.isPending}
            onClick={() => set.mutate({ id: profile.id, available: false })}
          >
            Desligar
          </button>
        )}
      </div>
      <small className="studio-muted">
        Esta troca é imediata e não exige nova revisão.
      </small>
    </section>
  );
}

function QualityPanel({
  profile,
  media,
  identityVerified,
}: {
  profile: any;
  media: any[];
  identityVerified: boolean;
}) {
  const approved = media.filter(item => item.status === "approved");
  const result = evaluateListingQuality({
    description: profile.description,
    avatarUrl: profile.avatarUrl,
    priceFromCents: profile.priceFromCents,
    services: profile.services,
    attendancePlaces: profile.attendancePlaces,
    languages: profile.languages,
    availabilityLabel: profile.availabilityLabel,
    locationNote: profile.locationNote,
    photoCount: approved.filter(item => item.kind === "photo").length,
    videoCount: approved.filter(item => item.kind === "video").length,
    identityVerified,
  });
  return (
    <section className="studio-panel" aria-label="Qualidade do anúncio">
      <p className="studio-kicker">Qualidade do anúncio</p>
      <h2>{result.score}/100</h2>
      {result.tips.length === 0 ? (
        <p>Seu anúncio está completo.</p>
      ) : (
        <ul>
          {result.tips.map(tip => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatsPanel({ profileId }: { profileId: number }) {
  const [days, setDays] = useState<7 | 30>(30);
  const stats = trpc.profiles.stats.useQuery({ id: profileId, days });
  const max = Math.max(1, ...(stats.data?.daily.map(d => d.views) ?? [1]));
  return (
    <section className="studio-panel" aria-label="Desempenho do anúncio">
      <p className="studio-kicker">Desempenho</p>
      <h2>Visitas e contatos</h2>
      <div className="studio-actions">
        {([7, 30] as const).map(option => (
          <button
            key={option}
            className={days === option ? "primary" : ""}
            aria-pressed={days === option}
            onClick={() => setDays(option)}
          >
            Últimos {option} dias
          </button>
        ))}
      </div>
      {stats.isLoading ? (
        <p>Carregando métricas…</p>
      ) : stats.error ? (
        <p role="alert">{stats.error.message}</p>
      ) : stats.data ? (
        <>
          <p>
            <strong>{stats.data.totals.views}</strong> visualizações ·{" "}
            <strong>{stats.data.totals.contactClicks}</strong> cliques para
            contato
          </p>
          <small className="studio-muted">
            Visualizações:{" "}
            {deltaLabel(
              stats.data.totals.views,
              stats.data.previousTotals.views
            )}{" "}
            · Contatos:{" "}
            {deltaLabel(
              stats.data.totals.contactClicks,
              stats.data.previousTotals.contactClicks
            )}
          </small>
          <div
            role="img"
            aria-label={`Visualizações por dia nos últimos ${stats.data.days} dias`}
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 2,
              height: 64,
            }}
          >
            {stats.data.daily.map(d => (
              <span
                key={d.date}
                title={`${d.date}: ${d.views} visualizações`}
                style={{
                  flex: 1,
                  minWidth: 2,
                  height: `${Math.max(4, (d.views / max) * 100)}%`,
                  background: "var(--s-accent, #c0508c)",
                  borderRadius: 2,
                  opacity: d.views ? 1 : 0.25,
                }}
              />
            ))}
          </div>
          <small className="studio-muted">
            Contagem agregada por dia, sem identificar visitantes.
          </small>
        </>
      ) : null}
    </section>
  );
}

export default function OwnerDashboard() {
  const { user, loading, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [id, setId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const profileId = Number(
      new URLSearchParams(location.split("?")[1] || "").get("profileId")
    );
    if (Number.isInteger(profileId) && profileId > 0 && profileId !== id) {
      setId(profileId);
    }
  }, [location, id]);
  const mine = trpc.profiles.mine.useQuery(undefined, {
    enabled: !!user && !user.mustChangePassword,
  });
  const detail = trpc.profiles.mineById.useQuery(
    { id: id || 0 },
    { enabled: !!id && !user?.mustChangePassword }
  );
  const readiness = trpc.profiles.publicationReadiness.useQuery(
    { id: id || 0 },
    {
      enabled: Boolean(id && detail.data?.profile) && !user?.mustChangePassword,
    }
  );
  const identity = trpc.profiles.identity.useQuery(undefined, {
    enabled: !!user && !user.mustChangePassword,
  });
  const archive = trpc.profiles.archiveMine.useMutation({
    onSuccess: async () => {
      toast.success("Anúncio arquivado");
      setId(null);
      navigate("/titular");
      await mine.refetch();
    },
    onError: error => toast.error(error.message),
  });
  async function saved(next: number) {
    setId(next);
    navigate(`/titular?profileId=${next}`);
    await mine.refetch();
    if (id === next) await detail.refetch();
    setVersion(v => v + 1);
  }
  return (
    <div className="studio">
      <Seo
        title="Meus anúncios — Ero Models"
        description="Área privada do titular dos anúncios."
        noindex
      />
      <StudioHeader minimal>
        <nav
          aria-label="Navegação do titular"
          className="studio-header-account-nav"
        >
          <Link href="/conta">Minha conta</Link>
          <Link href="/">Explorar anúncios</Link>
          {user && <button onClick={() => void logout()}>Sair</button>}
        </nav>
      </StudioHeader>
      <main className="studio-main">
        <p className="studio-kicker">Área do titular</p>
        <h1>Seu anúncio, sob seu controle.</h1>
        <p className="studio-muted">
          Preencha o essencial, salve quando quiser e publique quando os
          requisitos estiverem completos. Revisão manual só entra em casos
          específicos.
        </p>
        {loading ? (
          <p>Carregando…</p>
        ) : !user ? (
          <Link href="/login?returnTo=/titular">Entre para continuar</Link>
        ) : user.mustChangePassword ? (
          <Link href="/alterar-senha?returnTo=/titular">
            Altere sua senha antes de continuar
          </Link>
        ) : (
          <>
            <div className="studio-actions">
              <button
                onClick={() => {
                  setId(null);
                  navigate("/titular");
                  setVersion(v => v + 1);
                }}
              >
                Novo anúncio
              </button>
              <Link href="/alterar-senha?returnTo=/titular">Alterar senha</Link>
            </div>
            <AccountPanel user={user} />
            <IdentityPanel />
            <div className="studio-split">
              <aside className="studio-panel">
                <h2>Meus anúncios</h2>
                {mine.error ? (
                  <p role="alert">{mine.error.message}</p>
                ) : mine.isLoading ? (
                  <p>Carregando…</p>
                ) : mine.data?.length ? (
                  mine.data.map((p: any) => (
                    <button
                      className={`studio-list-item ${id === p.id ? "selected" : ""}`}
                      key={p.id}
                      onClick={() => {
                        setId(p.id);
                        navigate(`/titular?profileId=${p.id}`);
                      }}
                    >
                      <strong>{p.stageName}</strong>
                      <small>
                        {p.city} · {portfolioPublicationLabel(p)}
                      </small>
                      <small>
                        {p.rejectionReason || "Atualizado recentemente"}
                      </small>
                    </button>
                  ))
                ) : (
                  <p>Nenhum anúncio cadastrado.</p>
                )}
              </aside>
              <section className="studio-panel">
                {id && detail.isLoading ? (
                  <p>Carregando ficha…</p>
                ) : detail.error || (id && !detail.data?.profile) ? (
                  <section className="studio-panel" role="alert">
                    <h2>Anúncio não encontrado</h2>
                    <p>
                      Este anúncio não pertence à conta atual, foi arquivado ou
                      não está disponível. Nenhum cadastro novo foi criado.
                    </p>
                    <button
                      onClick={() => {
                        setId(null);
                        navigate("/titular");
                      }}
                    >
                      Voltar para meus anúncios
                    </button>
                  </section>
                ) : (
                  <>
                    {id && detail.data?.profile && (
                      <section
                        className="studio-panel"
                        aria-label="Status de publicação"
                      >
                        <p className="studio-kicker">Status operacional</p>
                        <h2>
                          {portfolioPublicationLabel(detail.data.profile)}
                        </h2>
                        <p>
                          {detail.data.profile.isPublished
                            ? "Publicado na vitrine."
                            : detail.data.profile.rejectionReason ||
                              "Ainda não publicado."}
                        </p>
                        {detail.data.profile.isPublished && (
                          <Link
                            className="studio-cta"
                            href={`/perfil/${detail.data.profile.slug}`}
                          >
                            Abrir página pública
                          </Link>
                        )}
                        {!detail.data.profile.deletedAt && (
                          <button
                            className="danger"
                            disabled={archive.isPending}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "Arquivar este anúncio e tirá-lo da vitrine?"
                                )
                              )
                                return;
                              archive.mutate({ id, confirmation: "EXCLUIR" });
                            }}
                          >
                            {archive.isPending
                              ? "Arquivando…"
                              : "Arquivar anúncio"}
                          </button>
                        )}
                        {detail.data.profile.isPublished && (
                          <AvailabilityPanel
                            profile={detail.data.profile}
                            onChanged={() => void detail.refetch()}
                          />
                        )}
                        {detail.data.profile.isPublished && (
                          <StatsPanel profileId={id} />
                        )}
                        <QualityPanel
                          profile={detail.data.profile}
                          media={detail.data.media ?? []}
                          identityVerified={
                            identity.data?.status === "approved"
                          }
                        />
                        {readiness.isLoading ? (
                          <p>Calculando checklist…</p>
                        ) : readiness.data ? (
                          <div>
                            <h3>Checklist de publicação</h3>
                            <ul>
                              <li>
                                {readiness.data.terms.current
                                  ? "✓ Termo vigente aceito"
                                  : "○ Aceite do termo ainda pendente"}
                              </li>
                              <li>
                                {readiness.data.approvedMediaCount > 0
                                  ? "✓ Mídia pública aprovada"
                                  : "○ Aprove ao menos uma mídia pública"}
                              </li>
                              <li>
                                {readiness.data.pendingMediaCount === 0
                                  ? "✓ Sem mídia aguardando moderação"
                                  : `○ ${readiness.data.pendingMediaCount} mídia(s) aguardando moderação`}
                              </li>
                              {readiness.data.publicationBlockers.map(
                                blocker => (
                                  <li key={blocker}>○ {blocker}</li>
                                )
                              )}
                            </ul>
                          </div>
                        ) : null}
                      </section>
                    )}
                    <PortfolioEditor
                      key={`${id}-${version}`}
                      initial={id ? detail.data?.profile : undefined}
                      media={id ? detail.data?.media : []}
                      onSaved={saved}
                    />
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
