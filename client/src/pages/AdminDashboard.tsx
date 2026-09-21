import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { defaultSiteSettings, portfolioPolicy } from "@shared/portfolio";
import { reportCategoryLabels, type ReportCategory } from "@shared/safety";
import PortfolioEditor from "@/components/PortfolioEditor";
import StudioHeader from "@/components/StudioHeader";
import Seo from "@/components/Seo";
const tabs = {
  overview: "Visão geral",
  users: "Usuários",
  profiles: "Portfólios",
  moderation: "Moderação",
  reports: "Denúncias",
  finance: "Financeiro",
  settings: "Página inicial",
  audit: "Auditoria",
};
const money = (n: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(n || 0) / 100
  );
const date = (v: any) => (v ? new Date(v).toLocaleString("pt-BR") : "—");
function Failure({ error }: { error: any }) {
  return error ? (
    <p role="alert" className="studio-error">
      {error.message}
    </p>
  ) : null;
}
export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<keyof typeof tabs>("overview"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState<"all" | "active" | "suspended">("all"),
    [page, setPage] = useState(0),
    [auditPage, setAuditPage] = useState(0);
  const [reportDecision, setReportDecision] = useState("");
  const [uid, setUid] = useState<number | null>(null),
    [pid, setPid] = useState<number | null>(null),
    [editingProfile, setEditingProfile] = useState(false),
    [newUser, setNewUser] = useState(false),
    [resetUrl, setResetUrl] = useState(""),
    [reason, setReason] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const allowed =
    !!user &&
    ["admin", "super_admin", "dev"].includes(user.role) &&
    !user.mustChangePassword;
  const overview = trpc.management.overview.useQuery(undefined, {
    enabled: allowed && tab === "overview",
  });
  const accounts = trpc.management.users.useQuery(
    { page, search, status },
    { enabled: allowed && tab === "users" }
  );
  const detail = trpc.management.userDetail.useQuery(
    { id: uid || 0 },
    { enabled: allowed && !!uid && tab === "users" }
  );
  const profiles = trpc.admin.profiles.useQuery(undefined, {
    enabled: allowed && (tab === "profiles" || tab === "moderation"),
  });
  const profile = trpc.admin.profileDetail.useQuery(
    { id: pid || 0 },
    {
      enabled: allowed && !!pid && (tab === "profiles" || tab === "moderation"),
    }
  );
  const pendingMedia = trpc.admin.pendingMedia.useQuery(undefined, {
    enabled: allowed && tab === "moderation",
  });
  const reports = trpc.safety.adminReports.useQuery(undefined, {
    enabled: allowed && tab === "reports",
  });
  const finance = trpc.management.finance.useQuery(undefined, {
    enabled: allowed && tab === "finance",
  });
  const settings = trpc.management.settings.useQuery(undefined, {
    enabled: allowed && tab === "settings",
  });
  const audit = trpc.management.audit.useQuery(
    { page: auditPage },
    { enabled: allowed && tab === "audit" }
  );
  const [site, setSite] = useState(defaultSiteSettings),
    [userForm, setUserForm] = useState({
      name: "",
      email: "",
      password: "",
      role: "user" as "user" | "admin",
      accountStatus: "active" as "active" | "suspended",
    });
  const [entry, setEntry] = useState({
    description: "",
    amount: "",
    kind: "expense" as "income" | "expense",
    occurredOn: new Date().toISOString().slice(0, 10),
  });
  useEffect(() => {
    if (settings.data) setSite(settings.data);
  }, [settings.data]);
  useEffect(() => {
    if (detail.data) {
      const u = detail.data.user;
      setUserForm({
        name: u.name || "",
        email: u.email || "",
        password: "",
        role: u.role === "admin" ? "admin" : "user",
        accountStatus: u.accountStatus,
      });
    }
  }, [detail.data]);
  const refresh = async () => {
    await utils.invalidate();
  };
  const error = (e: any) => toast.error(e.message);
  const update = trpc.management.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Conta atualizada; sessões encerradas");
      refresh();
    },
    onError: error,
  });
  const create = trpc.management.createUser.useMutation({
    onSuccess: r => {
      setNewUser(false);
      setUid(r.id);
      setUserForm(f => ({ ...f, password: "" }));
      toast.success("Conta criada. A troca de senha será obrigatória.");
      refresh();
    },
    onError: error,
  });
  const remove = trpc.management.anonymizeUser.useMutation({
    onSuccess: () => {
      setUid(null);
      toast.success("Conta anonimizada e acesso encerrado");
      refresh();
    },
    onError: error,
  });
  const reset = trpc.management.resetLink.useMutation({
    onSuccess: r => {
      setResetUrl(r.url);
      toast.success(
        "Link válido por 30 minutos. Compartilhe somente com o titular."
      );
    },
    onError: error,
  });
  const saveSite = trpc.management.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Página inicial atualizada");
      refresh();
    },
    onError: error,
  });
  const moderate = trpc.admin.moderateProfile.useMutation({
    onSuccess: () => {
      toast.success(
        "Revisão salva; a publicação respeita as configurações do servidor"
      );
      setConfirmed(false);
      refresh();
    },
    onError: error,
  });
  const media = trpc.admin.moderateMedia.useMutation({
    onSuccess: () => {
      toast.success("Mídia atualizada");
      refresh();
    },
    onError: error,
  });
  const updateReport = trpc.safety.updateReport.useMutation({
    onSuccess: () => {
      setReportDecision("");
      toast.success("Denúncia atualizada e ação registrada na auditoria");
      refresh();
    },
    onError: error,
  });
  const addFinance = trpc.management.addFinance.useMutation({
    onSuccess: () => {
      setEntry(e => ({ ...e, description: "", amount: "" }));
      refresh();
      toast.success("Lançamento registrado");
    },
    onError: error,
  });
  const voidFinance = trpc.management.voidFinance.useMutation({
    onSuccess: () => refresh(),
    onError: error,
  });
  function chooseProfile(id: number) {
    setPid(id);
    setEditingProfile(false);
    setConfirmed(false);
    setReason("");
  }
  return (
    <div className="studio">
      <Seo title="Administração — Só Models" description="Área privada de administração da plataforma." noindex />
      <StudioHeader>
        <button onClick={() => logout()}>Sair</button>
      </StudioHeader>
      <main className="studio-main">
        <div className="studio-title">
          <div>
            <p className="studio-kicker">
              Administração · {user?.role || "acesso restrito"}
            </p>
            <h1>Visão completa. Controle claro.</h1>
            <p className="studio-muted">
              Contas, portfólios profissionais e registros da plataforma.
            </p>
          </div>
          <Link href="/alterar-senha?returnTo=/admin">Alterar minha senha</Link>
        </div>
        {loading ? (
          <p>Verificando acesso…</p>
        ) : !allowed ? (
          <div className="studio-panel">
            <p>
              {user?.mustChangePassword
                ? "Troque a senha temporária para acessar o painel."
                : "Entre com uma conta administrativa autorizada."}
            </p>
            <Link
              href={
                user?.mustChangePassword
                  ? "/alterar-senha?returnTo=/admin"
                  : "/login?returnTo=/admin"
              }
            >
              Continuar
            </Link>
          </div>
        ) : (
          <>
            <nav className="studio-tabs">
              {Object.entries(tabs).map(([key, label]) => (
                <button
                  aria-current={tab === key ? "page" : undefined}
                  className={tab === key ? "primary" : ""}
                  key={key}
                  onClick={() => {
                    setTab(key as any);
                    setResetUrl("");
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === "overview" && (
              <>
                <Failure error={overview.error} />
                {overview.isLoading ? (
                  <p>Carregando indicadores…</p>
                ) : (
                  overview.data && (
                    <>
                      <div className="studio-stats">
                        {[
                          ["Contas", overview.data.accounts.total],
                          ["Ativas", overview.data.accounts.active],
                          ["Suspensas", overview.data.accounts.suspended],
                          ["Portfólios", overview.data.portfolio.total],
                          [
                            "Publicados e revisados",
                            overview.data.portfolio.published,
                          ],
                          [
                            "Aguardando revisão",
                            overview.data.portfolio.pending,
                          ],
                        ].map(([label, value]) => (
                          <article className="studio-panel" key={String(label)}>
                            <span>{label}</span>
                            <strong>{Number(value || 0)}</strong>
                          </article>
                        ))}
                      </div>
                      <div className="studio-split">
                        <section className="studio-panel">
                          <h2>Localizações</h2>
                          {overview.data.cities.length ? (
                            overview.data.cities.map(c => (
                              <div className="studio-row" key={c.label}>
                                <span>{c.label}</span>
                                <strong>{c.total}</strong>
                              </div>
                            ))
                          ) : (
                            <p>Sem portfólios cadastrados.</p>
                          )}
                        </section>
                        <section className="studio-panel">
                          <h2>Situação dos portfólios</h2>
                          {overview.data.states.map(s => (
                            <div className="studio-row" key={s.label}>
                              <span>{s.label}</span>
                              <strong>{s.total}</strong>
                            </div>
                          ))}
                          <h3>Áreas de atuação</h3>
                          {overview.data.types.map(t => (
                            <div className="studio-row" key={t.label}>
                              <span>{t.label}</span>
                              <strong>{t.total}</strong>
                            </div>
                          ))}
                          <p className="studio-muted">
                            Inclui registros legados e de teste. Apenas
                            portfólios revisados podem aparecer na vitrine.
                          </p>
                        </section>
                      </div>
                    </>
                  )
                )}
              </>
            )}
            {tab === "users" && (
              <>
                <div className="studio-toolbar">
                  <input
                    aria-label="Buscar usuários"
                    placeholder="Buscar nome ou e-mail"
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                  <select
                    aria-label="Status"
                    value={status}
                    onChange={e => {
                      setStatus(e.target.value as any);
                      setPage(0);
                    }}
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="suspended">Suspensos</option>
                  </select>
                  <button
                    className="primary"
                    onClick={() => {
                      setNewUser(true);
                      setUid(null);
                      setResetUrl("");
                      setUserForm({
                        name: "",
                        email: "",
                        password: "",
                        role: "user",
                        accountStatus: "active",
                      });
                    }}
                  >
                    Criar conta
                  </button>
                </div>
                <Failure error={accounts.error} />
                <div className="studio-split">
                  <section className="studio-panel">
                    <h2>
                      Usuários <small>{accounts.data?.total ?? "—"}</small>
                    </h2>
                    {accounts.isLoading ? (
                      <p>Carregando…</p>
                    ) : (
                      accounts.data?.items.map(u => (
                        <button
                          className={`studio-list-item ${uid === u.id ? "selected" : ""}`}
                          key={u.id}
                          onClick={() => {
                            setUid(u.id);
                            setNewUser(false);
                            setResetUrl("");
                          }}
                        >
                          <strong>{u.name || "Sem nome"}</strong>
                          <small>{u.email || "Sem e-mail"}</small>
                          <small>
                            {u.role} · {u.accountStatus}
                          </small>
                        </button>
                      ))
                    )}
                    <div className="studio-actions">
                      <button
                        disabled={!page}
                        onClick={() => setPage(p => p - 1)}
                      >
                        Anterior
                      </button>
                      <span>Página {page + 1}</span>
                      <button
                        disabled={
                          (page + 1) * 25 >= (accounts.data?.total || 0)
                        }
                        onClick={() => setPage(p => p + 1)}
                      >
                        Próxima
                      </button>
                    </div>
                  </section>
                  <section className="studio-panel">
                    <h2>{newUser ? "Nova conta" : "Ficha do usuário"}</h2>
                    <Failure error={detail.error} />
                    {newUser || detail.data ? (
                      <>
                        <div className="studio-fields">
                          <label>
                            Nome
                            <input
                              value={userForm.name}
                              onChange={e =>
                                setUserForm(f => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            E-mail
                            <input
                              type="email"
                              value={userForm.email}
                              onChange={e =>
                                setUserForm(f => ({
                                  ...f,
                                  email: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            Papel
                            <select
                              disabled={
                                !["dev", "super_admin"].includes(user!.role)
                              }
                              value={userForm.role}
                              onChange={e =>
                                setUserForm(f => ({
                                  ...f,
                                  role: e.target.value as any,
                                }))
                              }
                            >
                              <option value="user">Titular</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </label>
                          {newUser ? (
                            <label>
                              Senha temporária
                              <input
                                type="password"
                                autoComplete="new-password"
                                minLength={16}
                                value={userForm.password}
                                onChange={e =>
                                  setUserForm(f => ({
                                    ...f,
                                    password: e.target.value,
                                  }))
                                }
                              />
                              <small>
                                16 caracteres, maiúscula, minúscula e número.
                              </small>
                            </label>
                          ) : (
                            <label>
                              Situação
                              <select
                                value={userForm.accountStatus}
                                onChange={e =>
                                  setUserForm(f => ({
                                    ...f,
                                    accountStatus: e.target.value as any,
                                  }))
                                }
                              >
                                <option value="active">Ativa</option>
                                <option value="suspended">Suspensa</option>
                              </select>
                            </label>
                          )}
                        </div>
                        <div className="studio-actions">
                          <button
                            className="primary"
                            disabled={
                              create.isPending ||
                              update.isPending ||
                              (!newUser && !detail.data?.editable)
                            }
                            onClick={() =>
                              newUser
                                ? create.mutate(userForm)
                                : update.mutate({ id: uid!, ...userForm })
                            }
                          >
                            {newUser ? "Criar conta" : "Salvar alterações"}
                          </button>
                          {!newUser && (
                            <button
                              disabled={
                                !detail.data?.editable || reset.isPending
                              }
                              onClick={() => reset.mutate({ id: uid! })}
                            >
                              Gerar link de senha
                            </button>
                          )}
                        </div>
                        {resetUrl && (
                          <div className="studio-notice">
                            <p>
                              Link de uso único, válido por 30 minutos. O
                              sistema não enviou e-mail.
                            </p>
                            <input
                              aria-label="Link temporário"
                              readOnly
                              value={resetUrl}
                            />
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(resetUrl);
                                  toast.success("Link copiado");
                                } catch {
                                  toast.error(
                                    "Selecione e copie o link manualmente"
                                  );
                                }
                              }}
                            >
                              Copiar link
                            </button>
                          </div>
                        )}
                        {!newUser && detail.data && (
                          <>
                            <dl className="studio-details">
                              <dt>Papel atual</dt>
                              <dd>{detail.data.user.role}</dd>
                              <dt>Cadastro</dt>
                              <dd>{date(detail.data.user.createdAt)}</dd>
                              <dt>Último acesso</dt>
                              <dd>{date(detail.data.user.lastSignedIn)}</dd>
                              <dt>E-mail confirmado</dt>
                              <dd>{date(detail.data.user.emailVerifiedAt)}</dd>
                            </dl>
                            <h3>Portfólios vinculados</h3>
                            {detail.data.profiles.map(p => (
                              <button
                                className="studio-list-item"
                                key={p.id}
                                onClick={() => {
                                  chooseProfile(p.id);
                                  setTab("profiles");
                                }}
                              >
                                {p.stageName} · {p.city} · {p.status}
                              </button>
                            ))}
                            {!detail.data.profiles.length && (
                              <p>Nenhum portfólio.</p>
                            )}
                            <button
                              className="danger"
                              disabled={
                                !detail.data.editable ||
                                detail.data.user.role !== "user" ||
                                remove.isPending
                              }
                              onClick={() => {
                                if (
                                  window.prompt(
                                    "Remove nome, e-mail e acesso da conta. Os perfis ficam suspensos; arquivos e histórico são preservados. Digite EXCLUIR:"
                                  ) === "EXCLUIR"
                                )
                                  remove.mutate({
                                    id: uid!,
                                    confirmation: "EXCLUIR",
                                  });
                              }}
                            >
                              Anonimizar conta e encerrar acesso
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <p>Selecione uma conta para conferir seus dados.</p>
                    )}
                  </section>
                </div>
              </>
            )}
            {(tab === "profiles" || tab === "moderation") && (
              <>
                <Failure error={profiles.error} />
                <div className="studio-split">
                  <section className="studio-panel">
                    <h2>
                      {tab === "moderation"
                        ? "Perfis pendentes"
                        : "Portfólios cadastrados"}
                    </h2>
                    <p className="studio-muted">
                      Últimos 200 registros. Nenhum registro novo é publicado
                      automaticamente.
                    </p>
                    {profiles.data
                      ?.filter(
                        (p: any) =>
                          tab !== "moderation" || p.status === "pending"
                      )
                      .map((p: any) => (
                        <button
                          className={`studio-list-item ${pid === p.id ? "selected" : ""}`}
                          key={p.id}
                          onClick={() => chooseProfile(p.id)}
                        >
                          <strong>{p.stageName}</strong>
                          <small>
                            {p.city} · {p.status} ·{" "}
                            {p.isPublished && p.portfolioReviewed
                              ? "Publicado"
                              : "Oculto"}
                          </small>
                        </button>
                      ))}
                  </section>
                  <section className="studio-panel">
                    <h2>Ficha do portfólio</h2>
                    <Failure error={profile.error} />
                    {profile.isLoading && pid ? (
                      <p>Carregando…</p>
                    ) : profile.data ? (
                      <>
                        {editingProfile ? (
                          <PortfolioEditor
                            key={pid}
                            admin
                            ownerId={profile.data.profile.ownerId}
                            initial={profile.data.profile}
                            media={profile.data.media}
                            onSaved={() => {
                              setEditingProfile(false);
                              refresh();
                            }}
                          />
                        ) : (
                          <>
                            <h3>{profile.data.profile.stageName}</h3>
                            <p>
                              {profile.data.profile.description ||
                                "Sem descrição"}
                            </p>
                            <dl className="studio-details">
                              <dt>Titular</dt>
                              <dd>#{profile.data.profile.ownerId}</dd>
                              <dt>Cidade</dt>
                              <dd>
                                {profile.data.profile.city} /{" "}
                                {profile.data.profile.region || "—"}
                              </dd>
                              <dt>Telefone</dt>
                              <dd>
                                {profile.data.profile.phone || "Não informado"}
                              </dd>
                              <dt>WhatsApp</dt>
                              <dd>
                                {profile.data.profile.whatsapp ||
                                  "Não informado"}
                              </dd>
                              <dt>Categorias</dt>
                              <dd>
                                {profile.data.profile.categories.join(", ")}
                              </dd>
                              <dt>Publicação</dt>
                              <dd>
                                {profile.data.profile.isPublished &&
                                profile.data.profile.portfolioReviewed
                                  ? "Publicado"
                                  : "Oculto"}
                              </dd>
                            </dl>
                            <button onClick={() => setEditingProfile(true)}>
                              Editar informações
                            </button>
                            <div className="studio-media">
                              {profile.data.media.map(m => (
                                <article key={m.id}>
                                  {m.kind === "photo" ? (
                                    <img
                                      src={`/api/media-preview/${m.id}`}
                                      alt={m.title || "Foto em revisão"}
                                    />
                                  ) : (
                                    <video
                                      src={`/api/media-preview/${m.id}`}
                                      controls
                                    />
                                  )}
                                  <p>{m.status}</p>
                                  <div className="studio-actions">
                                    <button
                                      disabled={media.isPending}
                                      onClick={() =>
                                        media.mutate({
                                          id: m.id,
                                          status: "approved",
                                        })
                                      }
                                    >
                                      Aprovar mídia
                                    </button>
                                    <button
                                      disabled={media.isPending}
                                      onClick={() =>
                                        media.mutate({
                                          id: m.id,
                                          status: "private",
                                        })
                                      }
                                    >
                                      Ocultar mídia
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                            <label className="studio-check">
                              <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={e => setConfirmed(e.target.checked)}
                              />
                              Revisei o portfólio e as autorizações.{" "}
                              {portfolioPolicy}
                            </label>
                            <label>
                              Motivo da revisão
                              <input
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                maxLength={500}
                              />
                            </label>
                            <div className="studio-actions">
                              <button
                                className="primary"
                                disabled={!confirmed || moderate.isPending}
                                onClick={() =>
                                  moderate.mutate({
                                    id: pid!,
                                    status: "approved",
                                    portfolioConfirmed: true,
                                  })
                                }
                              >
                                Aprovar publicação
                              </button>
                              <button
                                disabled={moderate.isPending}
                                onClick={() =>
                                  moderate.mutate({
                                    id: pid!,
                                    status: "suspended",
                                  })
                                }
                              >
                                Ocultar / suspender
                              </button>
                              <button
                                disabled={moderate.isPending}
                                onClick={() =>
                                  moderate.mutate({
                                    id: pid!,
                                    status: "rejected",
                                    rejectionReason: reason,
                                  })
                                }
                              >
                                Solicitar ajustes
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <p>
                        Selecione um portfólio para conferir dados e mídias.
                      </p>
                    )}
                  </section>
                </div>
                {tab === "moderation" && (
                  <section className="studio-panel">
                    <h2>Mídias aguardando revisão</h2>
                    <Failure error={pendingMedia.error} />
                    {pendingMedia.data?.map(m => (
                      <button
                        className="studio-list-item"
                        key={m.id}
                        onClick={() => chooseProfile(m.profileId)}
                      >
                        Perfil #{m.profileId} · {m.kind} · {date(m.createdAt)}
                      </button>
                    ))}
                  </section>
                )}
              </>
            )}
            {tab === "reports" && (
              <section className="studio-panel">
                <div className="studio-title">
                  <div>
                    <p className="studio-kicker">Trust &amp; Safety</p>
                    <h2>Fila de denúncias</h2>
                    <p className="studio-muted">
                      O denunciante não é exibido nesta fila. Casos urgentes aparecem primeiro; decisões são auditadas.
                    </p>
                  </div>
                </div>
                <Failure error={reports.error} />
                <label>
                  Justificativa administrativa para a próxima decisão
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={reportDecision}
                    onChange={event => setReportDecision(event.target.value)}
                    placeholder="Registre somente o necessário para justificar a ação."
                  />
                </label>
                {reports.isLoading ? (
                  <p>Carregando denúncias…</p>
                ) : !reports.data?.length ? (
                  <p>Nenhuma denúncia na fila.</p>
                ) : (
                  <div className="studio-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Prioridade</th>
                          <th>Categoria</th>
                          <th>Perfil</th>
                          <th>Status</th>
                          <th>Recebida</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.data.map(report => (
                          <tr key={report.id}>
                            <td>{report.priority}</td>
                            <td>
                              <strong>
                                {reportCategoryLabels[report.category as ReportCategory] || "Outro"}
                              </strong>
                              <small>{report.description}</small>
                            </td>
                            <td>
                              #{report.profileId} {report.profileName || "Perfil indisponível"}
                            </td>
                            <td>{report.status}</td>
                            <td>{date(report.createdAt)}</td>
                            <td>
                              <div className="studio-actions">
                                {report.status === "open" && (
                                  <button
                                    disabled={updateReport.isPending}
                                    onClick={() =>
                                      updateReport.mutate({
                                        id: report.id,
                                        status: "in_review",
                                        decision: reportDecision || undefined,
                                      })
                                    }
                                  >
                                    Assumir
                                  </button>
                                )}
                                {!['approved', 'rejected', 'closed'].includes(report.status) && (
                                  <button
                                    disabled={updateReport.isPending}
                                    onClick={() =>
                                      updateReport.mutate({
                                        id: report.id,
                                        status: "closed",
                                        decision: reportDecision || "Caso encerrado após revisão administrativa.",
                                      })
                                    }
                                  >
                                    Encerrar
                                  </button>
                                )}
                                {['approved', 'rejected', 'closed'].includes(report.status) && (
                                  <button
                                    disabled={updateReport.isPending}
                                    onClick={() =>
                                      updateReport.mutate({
                                        id: report.id,
                                        status: "open",
                                        decision: reportDecision || "Caso reaberto para nova análise.",
                                      })
                                    }
                                  >
                                    Reabrir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
            {tab === "settings" && (
              <div className="studio-split">
                <section className="studio-panel">
                  <h2>Conteúdo da página inicial</h2>
                  <Failure error={settings.error} />
                  {(
                    [
                      ["title", "Título"],
                      ["subtitle", "Descrição"],
                      ["buttonText", "Texto do botão"],
                      ["about", "Sobre a plataforma"],
                      ["footer", "Rodapé"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <textarea
                        rows={key === "about" ? 5 : 2}
                        value={site[key]}
                        onChange={e =>
                          setSite(s => ({ ...s, [key]: e.target.value }))
                        }
                      />
                    </label>
                  ))}
                  {(
                    [
                      ["showGallery", "Exibir vitrine"],
                      ["showAbout", "Exibir seção sobre"],
                      ["showContact", "Exibir contatos públicos"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="studio-check" key={key}>
                      <input
                        type="checkbox"
                        checked={site[key]}
                        onChange={e =>
                          setSite(s => ({ ...s, [key]: e.target.checked }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <button
                    className="primary"
                    disabled={saveSite.isPending || !settings.isSuccess}
                    onClick={() => saveSite.mutate(site)}
                  >
                    Salvar e aplicar
                  </button>
                </section>
                <section className="studio-panel">
                  <p className="studio-kicker">
                    Prévia dos textos — ainda não publicada
                  </p>
                  <h1>{site.title}</h1>
                  <p>{site.subtitle}</p>
                  <button>{site.buttonText}</button>
                  {site.showAbout && <p>{site.about}</p>}
                  <hr />
                  <small>{site.footer}</small>
                  <p className="studio-muted">
                    Vitrine:{" "}
                    {site.showGallery
                      ? "visível para visitantes autorizados"
                      : "oculta"}
                    . Contatos:{" "}
                    {site.showContact
                      ? "disponíveis somente pelo fluxo autenticado e autorizado"
                      : "ocultos"}
                    .
                  </p>
                </section>
              </div>
            )}
            {tab === "finance" && (
              <>
                <p className="studio-notice">
                  Controle interno de receitas e despesas da plataforma.
                  Lançamentos manuais; não processa pagamentos, assinaturas ou
                  cobranças.
                </p>
                <Failure error={finance.error} />
                <div className="studio-stats">
                  {[
                    ["Receitas", finance.data?.totals.income],
                    ["Despesas", finance.data?.totals.expense],
                    [
                      "Saldo",
                      Number(finance.data?.totals.income || 0) -
                        Number(finance.data?.totals.expense || 0),
                    ],
                  ].map(([label, value]) => (
                    <article className="studio-panel" key={String(label)}>
                      <span>{label}</span>
                      <strong>{finance.isLoading ? "…" : money(value)}</strong>
                    </article>
                  ))}
                </div>
                <form
                  className="studio-panel"
                  onSubmit={e => {
                    e.preventDefault();
                    const n = Number(entry.amount.replace(",", "."));
                    if (!Number.isFinite(n) || n <= 0)
                      return toast.error("Valor inválido");
                    addFinance.mutate({
                      requestId: crypto.randomUUID(),
                      kind: entry.kind,
                      description: entry.description,
                      amountCents: Math.round(n * 100),
                      occurredOn: entry.occurredOn,
                    });
                  }}
                >
                  <h2>Novo lançamento</h2>
                  <div className="studio-fields">
                    <label>
                      Descrição
                      <input
                        required
                        minLength={3}
                        maxLength={250}
                        value={entry.description}
                        onChange={e =>
                          setEntry(f => ({ ...f, description: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Valor em R$
                      <input
                        required
                        inputMode="decimal"
                        value={entry.amount}
                        onChange={e =>
                          setEntry(f => ({ ...f, amount: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Tipo
                      <select
                        value={entry.kind}
                        onChange={e =>
                          setEntry(f => ({ ...f, kind: e.target.value as any }))
                        }
                      >
                        <option value="income">Receita</option>
                        <option value="expense">Despesa</option>
                      </select>
                    </label>
                    <label>
                      Data
                      <input
                        type="date"
                        required
                        value={entry.occurredOn}
                        onChange={e =>
                          setEntry(f => ({ ...f, occurredOn: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <button className="primary" disabled={addFinance.isPending}>
                    Registrar
                  </button>
                </form>
                <section className="studio-panel">
                  <h2>Últimos 100 lançamentos</h2>
                  {finance.data?.items.map(e => (
                    <div className="studio-row" key={e.id}>
                      <div>
                        <strong>{e.description}</strong>
                        <small>
                          {e.occurredOn} ·{" "}
                          {e.kind === "income" ? "Receita" : "Despesa"} ·{" "}
                          {e.voidedAt ? "Anulado" : "Válido"}
                        </small>
                      </div>
                      <span>{money(e.amountCents)}</span>
                      <button
                        disabled={!!e.voidedAt || voidFinance.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              "Anular este lançamento? O histórico será preservado."
                            )
                          )
                            voidFinance.mutate({ id: e.id });
                        }}
                      >
                        Anular
                      </button>
                    </div>
                  ))}
                </section>
              </>
            )}
            {tab === "audit" && (
              <section className="studio-panel">
                <h2>Histórico administrativo</h2>
                <Failure error={audit.error} />
                <div className="studio-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Responsável</th>
                        <th>Ação</th>
                        <th>Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.data?.map(a => (
                        <tr key={a.id}>
                          <td>{date(a.createdAt)}</td>
                          <td>#{a.actorUserId || "—"}</td>
                          <td>{a.action}</td>
                          <td>
                            {a.entityType} #{a.entityId || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="studio-actions">
                  <button
                    disabled={!auditPage}
                    onClick={() => setAuditPage(p => p - 1)}
                  >
                    Anterior
                  </button>
                  <span>Página {auditPage + 1}</span>
                  <button
                    disabled={(audit.data?.length || 0) < 50}
                    onClick={() => setAuditPage(p => p + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
