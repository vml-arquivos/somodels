import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import PortfolioEditor from "@/components/PortfolioEditor";
import StudioHeader from "@/components/StudioHeader";
import Seo from "@/components/Seo";
import { portfolioPublicationLabel } from "@shared/portfolio";
export default function OwnerDashboard() {
  const { user, loading } = useAuth();
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
  async function saved(next: number) {
    setId(next);
    await mine.refetch();
    if (id === next) await detail.refetch();
    setVersion(v => v + 1);
  }
  return (
    <div className="studio">
      <Seo title="Meu portfólio — Só Models" description="Área privada do titular do portfólio." noindex />
      <StudioHeader />
      <main className="studio-main">
        <p className="studio-kicker">Área do titular</p>
        <h1>Seu trabalho em destaque.</h1>
        <p className="studio-muted">
          Prepare seu portfólio profissional. Você controla as informações; a
          publicação passa por revisão.
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
                Novo portfólio
              </button>
              <Link href="/alterar-senha?returnTo=/titular">Alterar senha</Link>
            </div>
            <div className="studio-split">
              <aside className="studio-panel">
                <h2>Meus portfólios</h2>
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
                  <p>Nenhum portfólio cadastrado.</p>
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
