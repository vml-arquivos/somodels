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
      <StudioHeader>
        <button onClick={() => logout()}>Sair</button>
      </StudioHeader>
      <main className="studio-main">
        <p className="studio-kicker">Administração · novo portfólio</p>
        <div className="studio-title">
          <div>
            <h1>Criar portfólio para um titular</h1>
            <p className="studio-muted">
              O administrador pode preparar os mesmos dados, fotos e vídeos da área do titular. O aceite do termo continua exclusivo do titular antes da aprovação/publicação.
            </p>
            <p className="studio-notice">
              Rascunho criado pelo administrador. O titular ainda precisa revisar os dados, confirmar maioridade, direitos, responsabilidade e consentimento antes do envio para aprovação.
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
              <h2>Escolha o titular</h2>
              <input
                aria-label="Buscar titular"
                placeholder="Buscar nome ou e-mail"
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
                  <p>Nenhum titular encontrado nesta busca.</p>
                )}
            </aside>
            <section className="studio-panel">
              {!ownerId ? (
                <p>Selecione um titular para iniciar o portfólio.</p>
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
