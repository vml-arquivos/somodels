import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import PortfolioEditor from "@/components/PortfolioEditor";
import StudioHeader from "@/components/StudioHeader";
import { trpc } from "@/lib/trpc";

export default function AdminNewPortfolioPage() {
  const { user, loading, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const allowed =
    !!user &&
    ["admin", "super_admin", "dev"].includes(user.role) &&
    !user.mustChangePassword;
  const accounts = trpc.management.users.useQuery(
    { page: 0, search, status: "active" },
    { enabled: allowed }
  );
  const detail = trpc.admin.profileDetail.useQuery(
    { id: profileId || 0 },
    { enabled: allowed && Boolean(profileId) }
  );

  return (
    <div className="studio">
      <StudioHeader minimal>
        <button onClick={() => logout()}>Sair</button>
      </StudioHeader>
      <main className="studio-main">
        <p className="studio-kicker">Administração · novo perfil profissional</p>
        <div className="studio-title">
          <div>
            <h1>Preparar um perfil profissional</h1>
            <p className="studio-muted">
              Organize a apresentação pública de um modelo ou criador com dados claros, localização aproximada, especialidades e materiais autorizados. O aceite do termo continua exclusivo do titular antes da aprovação e da publicação.
            </p>
            <p className="studio-notice">
              Este fluxo cria apenas um rascunho interno. O titular precisa revisar cada informação, confirmar maioridade, direitos, responsabilidade e consentimento antes de qualquer envio para moderação.
            </p>
          </div>
          <Link href="/admin">Voltar ao painel</Link>
        </div>
        {loading ? (
          <p>Verificando acesso…</p>
        ) : !allowed ? (
          <div className="studio-panel">
            <p>
              {user?.mustChangePassword
                ? "Troque a senha temporária para continuar."
                : "Entre com uma conta administrativa autorizada."}
            </p>
            <Link
              href={
                user?.mustChangePassword
                  ? "/alterar-senha?returnTo=/admin/portfolio/novo"
                  : "/login?returnTo=/admin/portfolio/novo"
              }
            >
              Continuar
            </Link>
          </div>
        ) : (
          <div className="studio-split">
            <aside className="studio-panel">
              <h2>Titular responsável</h2>
              <input
                aria-label="Buscar titular"
                placeholder="Buscar titular ativo por nome ou e-mail"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {accounts.isLoading ? (
                <p>Carregando…</p>
              ) : accounts.error ? (
                <p role="alert">{accounts.error.message}</p>
              ) : (
                accounts.data?.items
                  .filter(account => account.role === "user")
                  .map(account => (
                    <button
                      className={`studio-list-item ${ownerId === account.id ? "selected" : ""}`}
                      key={account.id}
                      onClick={() => {
                        setOwnerId(account.id);
                        setProfileId(null);
                      }}
                    >
                      <strong>{account.name || "Sem nome"}</strong>
                      <small>{account.email || "Sem e-mail"}</small>
                    </button>
                  ))
              )}
              {!accounts.isLoading &&
                !accounts.data?.items.some(account => account.role === "user") && (
                  <p>Nenhum titular ativo encontrado nesta busca.</p>
                )}
            </aside>
            <section className="studio-panel">
              {!ownerId ? (
                <div className="studio-notice">
                  <strong>Comece pelo titular responsável</strong>
                  <p>
                    Selecione uma conta ativa ao lado. O formulário será aberto
                    vazio para evitar que informações de outro perfil sejam
                    reutilizadas por engano.
                  </p>
                </div>
              ) : profileId && detail.isLoading ? (
                <p>Carregando portfólio criado…</p>
              ) : detail.error ? (
                <p role="alert">{detail.error.message}</p>
              ) : (
                <PortfolioEditor
                  key={`${ownerId}-${profileId || "novo"}-${detail.data?.profile.updatedAt || ""}`}
                  admin
                  ownerId={ownerId}
                  initial={profileId ? detail.data?.profile : undefined}
                  media={profileId ? detail.data?.media : []}
                  onSaved={async nextId => {
                    if (profileId === nextId) await detail.refetch();
                    else setProfileId(nextId);
                  }}
                />
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
