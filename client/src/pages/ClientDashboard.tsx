import { useEffect, useState } from "react";
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
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [closePassword, setClosePassword] = useState("");
  const [closeConfirmation, setCloseConfirmation] = useState("");
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

            <section
              className="studio-panel"
              aria-labelledby="account-data-title"
            >
              <p className="studio-kicker">Dados pessoais da conta</p>
              <h2 id="account-data-title">Nome e acesso</h2>
              <p className="studio-muted">
                O nome pode ser atualizado aqui. O e-mail de acesso é imutável
                nesta área; telefone, localização, fotos e descrição pertencem
                ao anúncio do titular.
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
                <button
                  className="primary"
                  disabled={updateAccount.isPending || name.trim().length < 2}
                >
                  {updateAccount.isPending ? "Salvando…" : "Salvar dados"}
                </button>
                <Link href="/titular">Gerenciar meus anúncios</Link>
              </form>
            </section>

            <section
              className="studio-panel studio-danger-zone"
              aria-labelledby="close-account-title"
            >
              <p className="studio-kicker">Zona de segurança</p>
              <h2 id="close-account-title">Encerrar minha conta</h2>
              <p>
                A ação remove seus dados de contato, despublica seus anúncios e
                revoga suas sessões. Ela não pode ser desfeita pelo cliente.
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
            </section>

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
