import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import PortfolioEditor from "@/components/PortfolioEditor";
import StudioHeader from "@/components/StudioHeader";
import Seo from "@/components/Seo";
import { portfolioPublicationLabel } from "@shared/portfolio";
const identityLabels: Record<string, string> = {
  pending: "Em análise pela equipe",
  approved: "Identidade verificada",
  rejected: "Verificação recusada",
  expired: "Verificação expirada",
  error: "Erro na verificação",
};

function IdentityPanel() {
  const identity = trpc.profiles.identity.useQuery();
  const request = trpc.profiles.requestIdentity.useMutation({
    onSuccess: async () => {
      toast.success("Solicitação enviada. A equipe entrará em contato por e-mail.");
      await identity.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const row = identity.data;
  const expired = Boolean(
    row?.status === "approved" && row.expiresAt && new Date(row.expiresAt) <= new Date()
  );
  const status = expired ? "expired" : row?.status;
  const canRequest = !row || status === "rejected" || status === "expired" || status === "error";
  return (
    <section className="studio-panel" aria-label="Verificação de identidade">
      <p className="studio-kicker">Verificação de identidade</p>
      <h2>{status ? identityLabels[status] : "Verificação ainda não solicitada"}</h2>
      <p className="studio-muted">
        A verificação é exigida para enviar o anúncio para revisão e libera o
        selo “Identidade verificada”. Nossa equipe confirma seus dados em uma
        videochamada reservada; nenhum documento é publicado.
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
            <strong>{stats.data.totals.contactClicks}</strong> cliques para contato
          </p>
          <div
            role="img"
            aria-label={`Visualizações por dia nos últimos ${stats.data.days} dias`}
            style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 64 }}
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
  const [id, setId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const mine = trpc.profiles.mine.useQuery(undefined, {
    enabled: !!user && !user.mustChangePassword,
  });
  const detail = trpc.profiles.mineById.useQuery(
    { id: id || 0 },
    { enabled: !!id && !user?.mustChangePassword }
  );
  const readiness = trpc.profiles.publicationReadiness.useQuery(
    { id: id || 0 },
    { enabled: Boolean(id) && !user?.mustChangePassword }
  );
  const archive = trpc.profiles.archiveMine.useMutation({
    onSuccess: async () => {
      toast.success("Anúncio arquivado");
      setId(null);
      await mine.refetch();
    },
    onError: error => toast.error(error.message),
  });
  async function saved(next: number) {
    setId(next);
    await mine.refetch();
    if (id === next) await detail.refetch();
    setVersion(v => v + 1);
  }
  return (
    <div className="studio">
      <Seo title="Meus anúncios — Ero Models" description="Área privada do titular dos anúncios." noindex />
      <StudioHeader minimal>
        <nav aria-label="Navegação do titular" className="studio-header-account-nav">
          <Link href="/conta">Minha conta</Link>
          <Link href="/">Explorar anúncios</Link>
          {user && <button onClick={() => void logout()}>Sair</button>}
        </nav>
      </StudioHeader>
      <main className="studio-main">
        <p className="studio-kicker">Área do titular</p>
        <h1>Seu anúncio, sob seu controle.</h1>
        <p className="studio-muted">
          Prepare seu anúncio adulto. Você controla as informações, fotos e vídeos;
          a publicação passa por revisão.
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
                  setVersion(v => v + 1);
                }}
              >
                Novo anúncio
              </button>
              <Link href="/alterar-senha?returnTo=/titular">Alterar senha</Link>
            </div>
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
                      onClick={() => setId(p.id)}
                    >
                      <strong>{p.stageName}</strong>
                      <small>
                        {p.city} · {portfolioPublicationLabel(p)}
                      </small>
                      <small>{p.rejectionReason || "Atualizado recentemente"}</small>
                    </button>
                  ))
                ) : (
                  <p>Nenhum anúncio cadastrado.</p>
                )}
              </aside>
              <section className="studio-panel">
                {id && detail.isLoading ? (
                  <p>Carregando ficha…</p>
                ) : detail.error ? (
                  <p role="alert">{detail.error.message}</p>
                ) : (
                  <>
                    {id && detail.data?.profile && (
                      <section className="studio-panel" aria-label="Status de publicação">
                        <p className="studio-kicker">Status operacional</p>
                        <h2>{portfolioPublicationLabel(detail.data.profile)}</h2>
                        <p>
                          {detail.data.profile.isPublished
                            ? "Publicado na vitrine."
                            : detail.data.profile.rejectionReason || "Ainda não publicado."}
                        </p>
                        {detail.data.profile.isPublished && (
                          <Link className="studio-cta" href={`/perfil/${detail.data.profile.slug}`}>
                            Abrir página pública
                          </Link>
                        )}
                        {!detail.data.profile.deletedAt && (
                          <button
                            className="danger"
                            disabled={archive.isPending}
                            onClick={() => {
                              if (!window.confirm("Arquivar este anúncio e tirá-lo da vitrine?")) return;
                              archive.mutate({ id, confirmation: "EXCLUIR" });
                            }}
                          >
                            {archive.isPending ? "Arquivando…" : "Arquivar anúncio"}
                          </button>
                        )}
                        {detail.data.profile.isPublished && <StatsPanel profileId={id} />}
                        {readiness.isLoading ? (
                          <p>Calculando checklist…</p>
                        ) : readiness.data ? (
                          <div>
                            <h3>Checklist de publicação</h3>
                            <ul>
                              <li>{readiness.data.terms.current ? "✓ Termo vigente aceito" : "○ Aceite do termo ainda pendente"}</li>
                              <li>{readiness.data.approvedMediaCount > 0 ? "✓ Mídia pública aprovada" : "○ Aprove ao menos uma mídia pública"}</li>
                              <li>{readiness.data.pendingMediaCount === 0 ? "✓ Sem mídia aguardando moderação" : `○ ${readiness.data.pendingMediaCount} mídia(s) aguardando moderação`}</li>
                              {readiness.data.publicationBlockers.map(blocker => <li key={blocker}>○ {blocker}</li>)}
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
