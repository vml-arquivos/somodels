import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import Seo from "@/components/Seo";
import ListingCard from "@/components/ListingCard";

const formatDate = (value: unknown) =>
  value ? new Date(String(value)).toLocaleDateString("pt-BR") : "—";

const reportStatusLabels: Record<string, string> = {
  open: "Aberta",
  in_review: "Em análise",
  approved: "Ação aprovada",
  rejected: "Não aprovada",
  appealed: "Em recurso",
  closed: "Encerrada",
};

export default function ClientDashboard() {
  const { user, loading, logout } = useAuth();
  const config = trpc.system.config.useQuery();
  const flags = config.data?.featureFlags;
  const ready = Boolean(user && !user.mustChangePassword);
  const favorites = trpc.safety.favorites.useQuery(undefined, {
    enabled: ready && Boolean(flags?.favoritesEnabled),
  });
  const blocks = trpc.safety.blocks.useQuery(undefined, {
    enabled: ready && Boolean(flags?.blockingEnabled),
  });
  const reports = trpc.safety.myReports.useQuery(undefined, {
    enabled: ready && Boolean(flags?.reportsEnabled),
  });
  const unblock = trpc.safety.unblockProfile.useMutation({
    onSuccess: async () => {
      toast.success("Bloqueio removido");
      await blocks.refetch();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <div className="studio">
      <Seo
        title="Minha conta — Ero Models"
        description="Área privada para preferências, anúncios salvos e segurança da conta Ero Models."
        noindex
      />
      <StudioHeader minimal>
        <nav
          aria-label="Navegação da conta"
          className="studio-header-account-nav"
        >
          <Link href="/">Explorar anúncios</Link>
          <Link href="/titular">Área do titular</Link>
          {user && <button onClick={() => void logout()}>Sair</button>}
        </nav>
      </StudioHeader>
      <main className="studio-main">
        <p className="studio-kicker">Área do cliente</p>
        <h1>Uma conta para explorar com mais controle.</h1>
        <p className="studio-muted">
          Seus anúncios salvos, bloqueios e registros de segurança pertencem
          somente a esta conta. A Ero Models não mostra dados de um cliente para
          outro.
        </p>

        {loading ? (
          <p role="status">Carregando sua conta…</p>
        ) : !user ? (
          <section className="studio-panel">
            <h2>Entre para continuar</h2>
            <p>O espaço privado do cliente exige uma sessão autenticada.</p>
            <Link className="studio-cta" href="/login?returnTo=/conta">
              Entrar na conta
            </Link>
          </section>
        ) : user.mustChangePassword ? (
          <section className="studio-panel">
            <h2>Atualize sua senha</h2>
            <p>
              Por segurança, conclua a troca de senha antes de acessar sua
              conta.
            </p>
            <Link className="studio-cta" href="/alterar-senha?returnTo=/conta">
              Alterar senha
            </Link>
          </section>
        ) : (
          <>
            <section className="studio-stats" aria-label="Resumo da conta">
              <div className="studio-panel">
                <span>Conta</span>
                <strong>{user.name || "Cliente Ero Models"}</strong>
                <small>{user.email || "E-mail não informado"}</small>
              </div>
              <div className="studio-panel">
                <span>Favoritos</span>
                <strong>
                  {flags?.favoritesEnabled
                    ? (favorites.data?.length ?? "—")
                    : "Desligados"}
                </strong>
                <small>Somente anúncios que você salvou</small>
              </div>
              <div className="studio-panel">
                <span>Bloqueios</span>
                <strong>
                  {flags?.blockingEnabled
                    ? (blocks.data?.length ?? "—")
                    : "Desligados"}
                </strong>
                <small>Preferências privadas desta conta</small>
              </div>
            </section>

            <div className="studio-actions">
              <Link href="/alterar-senha?returnTo=/conta">Alterar senha</Link>
              <Link href="/privacidade">Privacidade e dados</Link>
            </div>

            {!flags?.favoritesEnabled &&
              !flags?.blockingEnabled &&
              !flags?.reportsEnabled && (
                <section className="studio-notice" role="status">
                  Os recursos de favoritos, bloqueios e acompanhamento de
                  denúncias estão desligados neste ambiente. Nenhum item
                  fictício é exibido.
                </section>
              )}

            <section className="studio-panel" aria-labelledby="favorites-title">
              <p className="studio-kicker">Lista salva</p>
              <h2 id="favorites-title">Meus favoritos</h2>
              {!flags?.favoritesEnabled ? (
                <p className="studio-muted">
                  Favoritos só aparecerão depois que a capability for homologada
                  e ativada.
                </p>
              ) : favorites.isLoading ? (
                <p role="status">Carregando favoritos…</p>
              ) : favorites.error ? (
                <p className="studio-error" role="alert">
                  {favorites.error.message}
                </p>
              ) : favorites.data?.length ? (
                <div className="studio-cards">
                  {favorites.data.map(profile => (
                    <ListingCard key={profile.id} profile={profile} />
                  ))}
                </div>
              ) : (
                <p className="studio-muted">
                  Você ainda não salvou anúncios. Explore a vitrine para criar
                  sua lista.
                </p>
              )}
            </section>

            <section className="studio-panel" aria-labelledby="blocks-title">
              <p className="studio-kicker">Segurança da conta</p>
              <h2 id="blocks-title">Perfis bloqueados</h2>
              {!flags?.blockingEnabled ? (
                <p className="studio-muted">
                  Bloqueios só aparecerão depois que a capability for homologada
                  e ativada.
                </p>
              ) : blocks.isLoading ? (
                <p role="status">Carregando bloqueios…</p>
              ) : blocks.error ? (
                <p className="studio-error" role="alert">
                  {blocks.error.message}
                </p>
              ) : blocks.data?.length ? (
                <ul className="studio-list" aria-label="Perfis bloqueados">
                  {blocks.data.map(block => (
                    <li className="studio-row" key={block.id}>
                      <div>
                        <strong>
                          {block.stageName || "Anúncio indisponível"}
                        </strong>
                        <small>
                          Bloqueado em {formatDate(block.createdAt)}
                        </small>
                      </div>
                      {block.profileId && (
                        <button
                          className="secondary"
                          disabled={unblock.isPending}
                          onClick={() =>
                            unblock.mutate({ profileId: block.profileId! })
                          }
                        >
                          Desbloquear
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="studio-muted">
                  Nenhum perfil bloqueado nesta conta.
                </p>
              )}
            </section>

            <section className="studio-panel" aria-labelledby="reports-title">
              <p className="studio-kicker">Registros enviados por você</p>
              <h2 id="reports-title">Minhas denúncias</h2>
              {!flags?.reportsEnabled ? (
                <p className="studio-muted">
                  O acompanhamento de denúncias aparecerá quando o fluxo de
                  segurança estiver ativo.
                </p>
              ) : reports.isLoading ? (
                <p role="status">Carregando registros…</p>
              ) : reports.error ? (
                <p className="studio-error" role="alert">
                  {reports.error.message}
                </p>
              ) : reports.data?.length ? (
                <ul className="studio-list" aria-label="Minhas denúncias">
                  {reports.data.map(report => (
                    <li className="studio-row" key={report.id}>
                      <div>
                        <strong>
                          {reportStatusLabels[report.status] || report.status}
                        </strong>
                        <small>Enviada em {formatDate(report.createdAt)}</small>
                      </div>
                      <span>{report.priority}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="studio-muted">
                  Nenhuma denúncia enviada nesta conta.
                </p>
              )}
            </section>

            <section className="studio-panel" aria-labelledby="purchases-title">
              <p className="studio-kicker">Compras e assinaturas</p>
              <h2 id="purchases-title">
                Conteúdo pago ainda não está disponível
              </h2>
              <p className="studio-muted">
                Não exibimos preços, checkout ou promessas de conteúdo premium
                enquanto não houver provedor aprovado, webhooks idempotentes,
                reconciliação e testes de acesso e revogação em sandbox.
              </p>
            </section>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
