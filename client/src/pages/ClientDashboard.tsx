import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import Seo from "@/components/Seo";
import ListingCard from "@/components/ListingCard";

const reportStatusLabels: Record<string, string> = {
  open: "Aberta",
  in_review: "Em análise",
  approved: "Ação aprovada",
  rejected: "Não aprovada",
  appealed: "Em recurso",
  closed: "Encerrada",
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function ClientDashboard() {
  const { user, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [closePassword, setClosePassword] = useState("");
  const [closeConfirmation, setCloseConfirmation] = useState("");
  const config = trpc.system.config.useQuery();
  const flags = config.data?.featureFlags;
  const ready = Boolean(user && !loading && !user.mustChangePassword);
  const favorites = trpc.safety.favorites.useQuery(undefined, {
    enabled: ready && flags?.favoritesEnabled === true,
  });
  const blocks = trpc.safety.blocks.useQuery(undefined, {
    enabled: ready && flags?.blockingEnabled === true,
  });
  const reports = trpc.safety.myReports.useQuery(undefined, {
    enabled: ready && flags?.reportsEnabled === true,
  });
  const unblock = trpc.safety.unblockProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil desbloqueado");
      void blocks.refetch();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const updateAccount = trpc.auth.updateAccount.useMutation({
    onSuccess: async () => {
      toast.success("Dados da conta atualizados");
      await utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const closeAccount = trpc.auth.closeAccount.useMutation({
    onSuccess: async () => {
      toast.success("Conta encerrada");
      await logout();
      window.location.assign("/");
    },
    onError: error => toast.error(error.message),
  });

  return (
    <div className="studio">
      <Seo
        title="Minha conta — Ero Models"
        description="Área privada para dados da conta e gerenciamento do anúncio."
        noindex
      />
      <StudioHeader minimal>
        <nav
          aria-label="Navegação da conta"
          className="studio-header-account-nav"
        >
          <Link href="/">Explorar anúncios</Link>
          <Link href="/titular">Gerenciar anúncio</Link>
          {user && <button onClick={() => void logout()}>Sair</button>}
        </nav>
      </StudioHeader>
      <main className="studio-main">
        <p className="studio-kicker">Minha conta</p>
        <h1>Seus dados, de forma simples.</h1>
        <p className="studio-muted">
          Atualize seus dados de acesso aqui. Informações públicas, fotos,
          vídeos e detalhes do anúncio ficam na área do titular.
        </p>

        {loading ? (
          <p role="status">Carregando sua conta…</p>
        ) : !user ? (
          <section className="studio-panel">
            <h2>Entre para continuar</h2>
            <p>O espaço privado exige uma sessão autenticada.</p>
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
            <section
              className="studio-panel"
              aria-labelledby="account-data-title"
            >
              <p className="studio-kicker">Dados de acesso</p>
              <h2 id="account-data-title">Editar dados pessoais da conta</h2>
              <p className="studio-muted">
                O nome pode ser alterado. O e-mail é somente leitura e não muda
                nesta área.
              </p>
              <form
                className="studio-account-form"
                onSubmit={event => {
                  event.preventDefault();
                  updateAccount.mutate({ name });
                }}
              >
                <label>
                  Nome de exibição
                  <input
                    autoComplete="name"
                    value={name}
                    onChange={event => setName(event.target.value)}
                  />
                </label>
                <label>
                  E-mail de acesso
                  <input
                    value={user.email || "—"}
                    readOnly
                    aria-readonly="true"
                  />
                </label>
                <div className="studio-actions">
                  <button
                    className="primary"
                    disabled={updateAccount.isPending || name.trim().length < 2}
                  >
                    {updateAccount.isPending ? "Salvando…" : "Salvar dados"}
                  </button>
                  <Link href="/alterar-senha?returnTo=/conta">
                    Alterar senha
                  </Link>
                  <Link href="/privacidade">Privacidade e dados</Link>
                </div>
              </form>
            </section>

            <section
              className="studio-panel"
              aria-labelledby="listing-next-title"
            >
              <p className="studio-kicker">Próximo passo</p>
              <h2 id="listing-next-title">Criar ou editar seu anúncio</h2>
              <p className="studio-muted">
                Salve informações aos poucos, retome depois, adicione fotos e
                vídeos e publique quando o cadastro estiver completo.
              </p>
              <div className="studio-actions">
                <Link className="studio-cta" href="/titular">
                  Abrir área do titular
                </Link>
                <Link href="/">Explorar a vitrine</Link>
              </div>
            </section>

            <details className="studio-panel studio-account-details">
              <summary>Segurança e listas pessoais</summary>
              {!flags?.favoritesEnabled &&
              !flags?.blockingEnabled &&
              !flags?.reportsEnabled ? (
                <p className="studio-muted">
                  Favoritos, bloqueios e acompanhamento de denúncias ainda estão
                  desligados neste ambiente. Nenhum item fictício é exibido.
                </p>
              ) : (
                <div className="studio-account-tools">
                  <section aria-labelledby="favorites-title">
                    <p className="studio-kicker">Lista salva</p>
                    <h3 id="favorites-title">Meus favoritos</h3>
                    {!flags?.favoritesEnabled ? (
                      <p className="studio-muted">Recurso ainda não ativado.</p>
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
                        Você ainda não salvou anúncios. Explore a vitrine para
                        criar sua lista.
                      </p>
                    )}
                  </section>

                  <section aria-labelledby="blocks-title">
                    <p className="studio-kicker">Segurança da conta</p>
                    <h3 id="blocks-title">Perfis bloqueados</h3>
                    {!flags?.blockingEnabled ? (
                      <p className="studio-muted">Recurso ainda não ativado.</p>
                    ) : blocks.isLoading ? (
                      <p role="status">Carregando bloqueios…</p>
                    ) : blocks.error ? (
                      <p className="studio-error" role="alert">
                        {blocks.error.message}
                      </p>
                    ) : blocks.data?.length ? (
                      <ul
                        className="studio-list"
                        aria-label="Perfis bloqueados"
                      >
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
                                  unblock.mutate({
                                    profileId: block.profileId!,
                                  })
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

                  <section aria-labelledby="reports-title">
                    <p className="studio-kicker">Registros enviados por você</p>
                    <h3 id="reports-title">Minhas denúncias</h3>
                    {!flags?.reportsEnabled ? (
                      <p className="studio-muted">Recurso ainda não ativado.</p>
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
                                {reportStatusLabels[report.status] ||
                                  report.status}
                              </strong>
                              <small>
                                Enviada em {formatDate(report.createdAt)}
                              </small>
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
                </div>
              )}
            </details>

            <details className="studio-panel studio-account-details">
              <summary>Privacidade e encerramento da conta</summary>
              <p className="studio-muted">
                O encerramento remove dados de contato, despublica anúncios e
                revoga sessões. Essa ação não pode ser desfeita pelo cliente.
              </p>
              <form
                className="studio-account-form"
                onSubmit={event => {
                  event.preventDefault();
                  if (closeConfirmation !== "EXCLUIR") return;
                  closeAccount.mutate({
                    currentPassword: closePassword,
                    confirmation: "EXCLUIR",
                  });
                }}
              >
                <label>
                  Senha atual
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={closePassword}
                    onChange={event => setClosePassword(event.target.value)}
                  />
                </label>
                <label>
                  Digite EXCLUIR para confirmar
                  <input
                    value={closeConfirmation}
                    onChange={event => setCloseConfirmation(event.target.value)}
                  />
                </label>
                <button
                  className="danger"
                  disabled={
                    closeAccount.isPending ||
                    !closePassword ||
                    closeConfirmation !== "EXCLUIR"
                  }
                >
                  {closeAccount.isPending ? "Encerrando…" : "Encerrar conta"}
                </button>
              </form>
            </details>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
