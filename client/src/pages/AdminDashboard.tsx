import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  defaultSiteSettings,
  portfolioPolicy,
  profileOperationalLabel,
} from "@shared/portfolio";
import { reportCategoryLabels, type ReportCategory } from "@shared/safety";
import PortfolioEditor from "@/components/PortfolioEditor";
import HomeCopyEditor from "@/components/HomeCopyEditor";
import StudioHeader from "@/components/StudioHeader";
import Seo from "@/components/Seo";
import MfaPanel from "@/components/MfaPanel";
import UsersManager from "@/components/admin/UsersManager";
const tabs = {
  overview: "Visão geral",
  users: "Usuários",
  profiles: "Anúncios",
  moderation: "Moderação",
  reports: "Denúncias",
  identity: "Verificações",
  plans: "Planos",
  messages: "Mensagens",
  readiness: "Prontidão",
  security: "Segurança",
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
    [profileSearch, setProfileSearch] = useState(""),
    [profileLifecycle, setProfileLifecycle] = useState<
      "all" | "active" | "inactive" | "deleted"
    >("all"),
    [auditPage, setAuditPage] = useState(0);
  const [reportDecision, setReportDecision] = useState("");
  const [identityReason, setIdentityReason] = useState("");
  const emptyPlan = {
    id: undefined as number | undefined,
    code: "",
    name: "",
    description: "",
    price: "",
    billingPeriod: "month" as "none" | "month" | "year",
    durationDays: "30",
    isFeatured: false,
    isActive: true,
    sortOrder: "0",
    benefits: "",
  };
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [paidInput, setPaidInput] = useState("");
  const [subNote, setSubNote] = useState("");
  const [manualSub, setManualSub] = useState({ userId: "", planId: "" });
  const [pid, setPid] = useState<number | null>(null),
    [editingProfile, setEditingProfile] = useState(false),
    [reason, setReason] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const allowed = !!user && user.isAdmin && !user.mustChangePassword;
  const mfaStatus = trpc.auth.mfaStatus.useQuery(undefined, { enabled: allowed });
  const mfaPending = Boolean(mfaStatus.data?.required && !mfaStatus.data.enabled);
  useEffect(() => {
    // Administrador sem MFA só consegue usar a aba de segurança até ativar.
    if (mfaPending) setTab("security");
  }, [mfaPending]);
  const overview = trpc.management.overview.useQuery(undefined, {
    enabled: allowed && tab === "overview",
  });
  const profiles = trpc.admin.profiles.useQuery(
    { search: profileSearch || undefined, lifecycle: profileLifecycle },
    { enabled: allowed && (tab === "profiles" || tab === "moderation") }
  );
  const profile = trpc.admin.profileDetail.useQuery(
    { id: pid || 0 },
    {
      enabled: allowed && !!pid && (tab === "profiles" || tab === "moderation"),
    }
  );
  const profileReadiness = trpc.admin.profileReadiness.useQuery(
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
  const identityQueue = trpc.admin.identityQueue.useQuery(
    { status: "pending" },
    { enabled: allowed && tab === "identity" }
  );
  const reviewIdentity = trpc.admin.reviewIdentity.useMutation({
    onSuccess: async () => {
      setIdentityReason("");
      await identityQueue.refetch();
    },
  });
  const plansQuery = trpc.admin.plans.useQuery(undefined, {
    enabled: allowed && tab === "plans",
  });
  const subsQuery = trpc.admin.subscriptions.useQuery(undefined, {
    enabled: allowed && tab === "plans",
  });
  const [messageFilter, setMessageFilter] = useState<"new" | "handled">("new");
  const messagesQuery = trpc.admin.contactMessages.useQuery(
    { status: messageFilter },
    { enabled: allowed && tab === "messages" }
  );
  const handleMessage = trpc.admin.handleContactMessage.useMutation({
    onSuccess: async () => {
      toast.success("Mensagem marcada como atendida");
      await messagesQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const readinessQuery = trpc.admin.readiness.useQuery(undefined, {
    enabled: allowed && tab === "readiness",
  });
  const savePlanMutation = trpc.admin.savePlan.useMutation({
    onSuccess: async () => {
      toast.success("Plano salvo");
      setPlanForm(emptyPlan);
      await plansQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const activateSub = trpc.admin.activateSubscription.useMutation({
    onSuccess: async () => {
      toast.success("Plano ativado");
      setPaidInput("");
      setSubNote("");
      setManualSub({ userId: "", planId: "" });
      await subsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const cancelSub = trpc.admin.cancelSubscription.useMutation({
    onSuccess: async () => {
      toast.success("Assinatura encerrada");
      await subsQuery.refetch();
    },
    onError: error => toast.error(error.message),
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
  const [site, setSite] = useState(defaultSiteSettings);
  const [entry, setEntry] = useState({
    description: "",
    amount: "",
    kind: "expense" as "income" | "expense",
    occurredOn: new Date().toISOString().slice(0, 10),
  });
  useEffect(() => {
    if (settings.data) setSite(settings.data);
  }, [settings.data]);
  const refresh = async () => {
    await utils.invalidate();
  };
  const error = (e: any) => toast.error(e.message);
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
  const activateProfile = trpc.admin.activateProfile.useMutation({
    onSuccess: () => {
      toast.success("Anúncio ativado; a publicação continua sujeita aos gates");
      setReason("");
      refresh();
    },
    onError: error,
  });
  const deactivateProfile = trpc.admin.deactivateProfile.useMutation({
    onSuccess: () => {
      toast.success("Anúncio inativado e removido da publicação");
      setReason("");
      refresh();
    },
    onError: error,
  });
  const deleteProfile = trpc.admin.deleteProfile.useMutation({
    onSuccess: () => {
      toast.success("Anúncio excluído logicamente; histórico preservado");
      setEditingProfile(false);
      refresh();
    },
    onError: error,
  });
  const restoreProfile = trpc.admin.restoreProfile.useMutation({
    onSuccess: () => {
      toast.success("Anúncio restaurado como rascunho");
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
      <Seo
        title="Administração — Ero Models"
        description="Área privada de administração da plataforma."
        noindex
      />
      <StudioHeader minimal>
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
              Contas, anúncios de acompanhantes e registros da plataforma.
            </p>
          </div>
          <div className="studio-actions">
            <Link className="studio-cta" href="/admin/portfolio/novo">
              Criar anúncio para um titular
            </Link>
            <Link href="/alterar-senha?returnTo=/admin">
              Alterar minha senha
            </Link>
          </div>
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
                          ["Anúncios", overview.data.portfolio.total],
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
                            <p>Sem anúncios cadastrados.</p>
                          )}
                        </section>
                        <section className="studio-panel">
                          <h2>Situação dos anúncios</h2>
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
                            Registros antigos permanecem auditáveis. Apenas
                            anúncios revisados podem aparecer na vitrine.
                          </p>
                        </section>
                      </div>
                    </>
                  )
                )}
              </>
            )}
            {tab === "users" && user && (
              <UsersManager
                actor={{ id: user.id, role: user.role }}
                onOpenProfile={profileId => {
                  chooseProfile(profileId);
                  setTab("profiles");
                }}
              />
            )}
            {(tab === "profiles" || tab === "moderation") && (
              <>
                {tab === "profiles" && (
                  <div className="studio-toolbar">
                    <input
                      aria-label="Buscar anúncios"
                      placeholder="Buscar nome, slug ou cidade"
                      value={profileSearch}
                      onChange={event => setProfileSearch(event.target.value)}
                    />
                    <select
                      aria-label="Estado operacional do perfil"
                      value={profileLifecycle}
                      onChange={event =>
                        setProfileLifecycle(
                          event.target.value as typeof profileLifecycle
                        )
                      }
                    >
                      <option value="all">Todos os estados</option>
                      <option value="active">Ativos</option>
                      <option value="inactive">Inativos</option>
                      <option value="deleted">Excluídos</option>
                    </select>
                  </div>
                )}
                <Failure error={profiles.error} />
                <div className="studio-split">
                  <section className="studio-panel">
                    <h2>
                      {tab === "moderation"
                        ? "Anúncios pendentes"
                        : "Anúncios cadastrados"}
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
                            {p.city} · {profileOperationalLabel(p)} · {p.status}{" "}
                            ·{" "}
                            {p.isPublished && p.portfolioReviewed
                              ? "Publicado"
                              : "Oculto"}
                          </small>
                        </button>
                      ))}
                  </section>
                  <section className="studio-panel">
                    <h2>Ficha do anúncio</h2>
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
                              <dt>Estado operacional</dt>
                              <dd>
                                {profileOperationalLabel(profile.data.profile)}
                              </dd>
                              {profile.data.profile.deletedAt && (
                                <>
                                  <dt>Excluído em</dt>
                                  <dd>
                                    {date(profile.data.profile.deletedAt)}
                                  </dd>
                                </>
                              )}
                            </dl>
                            {profileReadiness.data && (
                              <div className="studio-notice">
                                <h4>Gates verificados</h4>
                                <p>
                                  Identidade:{" "}
                                  {profileReadiness.data.identityApproved
                                    ? "vigente"
                                    : "pendente"}{" "}
                                  · Termo:{" "}
                                  {profileReadiness.data.terms.current
                                    ? "vigente"
                                    : "pendente"}{" "}
                                  · Mídia pública aprovada:{" "}
                                  {profileReadiness.data.approvedMediaCount}
                                </p>
                                {profileReadiness.data.blockers.length > 0 && (
                                  <ul>
                                    {profileReadiness.data.blockers.map(
                                      blocker => (
                                        <li key={blocker}>{blocker}</li>
                                      )
                                    )}
                                  </ul>
                                )}
                              </div>
                            )}
                            <div className="studio-actions">
                              <button
                                disabled={!!profile.data.profile.deletedAt}
                                onClick={() => setEditingProfile(true)}
                              >
                                Editar informações
                              </button>
                              {!profile.data.profile.deletedAt &&
                                (profile.data.profile.isActive ? (
                                  <button
                                    disabled={
                                      deactivateProfile.isPending ||
                                      reason.trim().length < 3
                                    }
                                    onClick={() =>
                                      deactivateProfile.mutate({
                                        id: pid!,
                                        reason: reason.trim(),
                                      })
                                    }
                                  >
                                    Inativar anúncio
                                  </button>
                                ) : (
                                  <button
                                    disabled={activateProfile.isPending}
                                    onClick={() =>
                                      activateProfile.mutate({
                                        id: pid!,
                                        reason: reason.trim() || undefined,
                                      })
                                    }
                                  >
                                    Ativar anúncio
                                  </button>
                                ))}
                              {profile.data.profile.deletedAt ? (
                                <button
                                  disabled={restoreProfile.isPending}
                                  onClick={() => {
                                    const restoreReason = window.prompt(
                                      "Motivo para restaurar este perfil:"
                                    );
                                    if (restoreReason?.trim())
                                      restoreProfile.mutate({
                                        id: pid!,
                                        reason: restoreReason.trim(),
                                      });
                                  }}
                                >
                                  Restaurar anúncio
                                </button>
                              ) : (
                                <button
                                  disabled={deleteProfile.isPending}
                                  onClick={() =>
                                    deleteProfile.mutate({ id: pid! })
                                  }
                                >
                                  Excluir anúncio
                                </button>
                              )}
                            </div>
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
                              Revisei o anúncio, as mídias e as autorizações.{" "}
                              {portfolioPolicy}
                            </label>
                            <label>
                              Justificativa da ação administrativa
                              <input
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                maxLength={500}
                                placeholder="Obrigatório para inativar, suspender ou solicitar ajustes"
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
                                disabled={
                                  moderate.isPending ||
                                  reason.trim().length < 10
                                }
                                onClick={() =>
                                  moderate.mutate({
                                    id: pid!,
                                    status: "suspended",
                                    rejectionReason: reason,
                                  })
                                }
                              >
                                Ocultar / suspender
                              </button>
                              <button
                                disabled={
                                  moderate.isPending ||
                                  reason.trim().length < 10
                                }
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
                      <p>Selecione um anúncio para conferir dados e mídias.</p>
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
                      O denunciante não é exibido nesta fila. Casos urgentes
                      aparecem primeiro; decisões são auditadas.
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
                                {reportCategoryLabels[
                                  report.category as ReportCategory
                                ] || "Outro"}
                              </strong>
                              <small>{report.description}</small>
                            </td>
                            <td>
                              #{report.profileId}{" "}
                              {report.profileName || "Perfil indisponível"}
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
                                {!["approved", "rejected", "closed"].includes(
                                  report.status
                                ) && (
                                  <button
                                    disabled={updateReport.isPending}
                                    onClick={() =>
                                      updateReport.mutate({
                                        id: report.id,
                                        status: "closed",
                                        decision:
                                          reportDecision ||
                                          "Caso encerrado após revisão administrativa.",
                                      })
                                    }
                                  >
                                    Encerrar
                                  </button>
                                )}
                                {["approved", "rejected", "closed"].includes(
                                  report.status
                                ) && (
                                  <button
                                    disabled={updateReport.isPending}
                                    onClick={() =>
                                      updateReport.mutate({
                                        id: report.id,
                                        status: "open",
                                        decision:
                                          reportDecision ||
                                          "Caso reaberto para nova análise.",
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
            {tab === "messages" && (
              <section className="studio-panel">
                <div className="studio-title">
                  <div>
                    <p className="studio-kicker">Atendimento</p>
                    <h2>Mensagens do Fale conosco</h2>
                    <p className="studio-muted">
                      Pedidos de suporte, privacidade, recuperação de senha e
                      remoção. Responda pelo contato deixado e marque como
                      atendida.
                    </p>
                  </div>
                  <div className="studio-actions">
                    {(["new", "handled"] as const).map(value => (
                      <button
                        key={value}
                        className={messageFilter === value ? "primary" : ""}
                        onClick={() => setMessageFilter(value)}
                      >
                        {value === "new" ? "Novas" : "Atendidas"}
                      </button>
                    ))}
                  </div>
                </div>
                <Failure error={messagesQuery.error} />
                {messagesQuery.isLoading ? (
                  <p>Carregando mensagens…</p>
                ) : !messagesQuery.data?.length ? (
                  <p>Nenhuma mensagem {messageFilter === "new" ? "nova" : "atendida"}.</p>
                ) : (
                  messagesQuery.data.map((item: any) => (
                    <article key={item.id} className="studio-panel">
                      <p className="studio-kicker">
                        {{
                          support: "Suporte",
                          privacy: "Privacidade",
                          report: "Denúncia / remoção",
                          password: "Recuperar senha",
                          other: "Outro",
                        }[item.topic as string] ?? item.topic}{" "}
                        · {date(item.createdAt)}
                      </p>
                      <h3>{item.name}</h3>
                      <p>
                        Contato para resposta:{" "}
                        <strong>{item.replyTo || "não informado"}</strong>
                      </p>
                      <p style={{ whiteSpace: "pre-wrap" }}>{item.message}</p>
                      {item.status === "new" && (
                        <button
                          className="primary"
                          disabled={handleMessage.isPending}
                          onClick={() => handleMessage.mutate({ id: item.id })}
                        >
                          Marcar como atendida
                        </button>
                      )}
                    </article>
                  ))
                )}
              </section>
            )}
            {tab === "readiness" && (
              <section className="studio-panel">
                <div className="studio-title">
                  <div>
                    <p className="studio-kicker">Operação</p>
                    <h2>Prontidão para receber cadastros</h2>
                    <p className="studio-muted">
                      Confere configuração, segurança e filas. “Bloqueio” impede
                      o lançamento; “atenção” é recomendação antes de divulgar.
                    </p>
                  </div>
                </div>
                <Failure error={readinessQuery.error} />
                {readinessQuery.isLoading ? (
                  <p>Verificando…</p>
                ) : (
                  <ul className="studio-list">
                    {readinessQuery.data?.map(item => (
                      <li key={item.id}>
                        <strong>
                          {item.level === "ok" ? "✓" : item.level === "warn" ? "!" : "✕"}{" "}
                          {item.title}
                        </strong>
                        <small>{item.detail}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {tab === "plans" && (
              <section className="studio-panel">
                <div className="studio-title">
                  <div>
                    <p className="studio-kicker">Receita</p>
                    <h2>Planos e assinaturas</h2>
                    <p className="studio-muted">
                      O anunciante pede o plano, paga por Pix combinado com a
                      equipe e você ativa aqui. Planos “em destaque” sobem na
                      vitrine com o rótulo “Patrocinado” quando
                      SPONSORED_LISTINGS_ENABLED estiver ligado.
                    </p>
                  </div>
                </div>
                <Failure
                  error={plansQuery.error || subsQuery.error || savePlanMutation.error || activateSub.error}
                />
                <h3>{planForm.id ? "Editar plano" : "Novo plano"}</h3>
                <form
                  className="studio-fields"
                  onSubmit={e => {
                    e.preventDefault();
                    const cents = Math.round(Number(planForm.price.replace(",", ".") || 0) * 100);
                    savePlanMutation.mutate({
                      id: planForm.id,
                      code: planForm.code,
                      name: planForm.name,
                      description: planForm.description || null,
                      priceCents: cents,
                      billingPeriod: planForm.billingPeriod,
                      durationDays: Number(planForm.durationDays),
                      isFeatured: planForm.isFeatured,
                      isActive: planForm.isActive,
                      sortOrder: Number(planForm.sortOrder) || 0,
                      benefits: planForm.benefits.split("\n").map(v => v.trim()).filter(Boolean),
                    });
                  }}
                >
                  <label>Código (a-z, 0-9, hífen)<input required value={planForm.code} onChange={e => setPlanForm({ ...planForm, code: e.target.value })} /></label>
                  <label>Nome<input required value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} /></label>
                  <label>Preço (R$)<input required inputMode="decimal" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} /></label>
                  <label>Duração (dias)<input required inputMode="numeric" value={planForm.durationDays} onChange={e => setPlanForm({ ...planForm, durationDays: e.target.value })} /></label>
                  <label>Ordem na página<input inputMode="numeric" value={planForm.sortOrder} onChange={e => setPlanForm({ ...planForm, sortOrder: e.target.value })} /></label>
                  <label>Descrição curta<input value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} /></label>
                  <label>Benefícios (um por linha)<textarea rows={4} value={planForm.benefits} onChange={e => setPlanForm({ ...planForm, benefits: e.target.value })} /></label>
                  <label className="studio-check"><input type="checkbox" checked={planForm.isFeatured} onChange={e => setPlanForm({ ...planForm, isFeatured: e.target.checked })} />Plano em destaque (patrocinado)</label>
                  <label className="studio-check"><input type="checkbox" checked={planForm.isActive} onChange={e => setPlanForm({ ...planForm, isActive: e.target.checked })} />Visível na página de planos</label>
                  <div className="studio-actions">
                    <button className="primary" disabled={savePlanMutation.isPending}>Salvar plano</button>
                    {planForm.id && <button type="button" onClick={() => setPlanForm(emptyPlan)}>Cancelar edição</button>}
                  </div>
                </form>
                <h3>Planos cadastrados</h3>
                {!plansQuery.data?.length ? (
                  <p>Nenhum plano cadastrado.</p>
                ) : (
                  <div className="studio-table-wrap">
                    <table>
                      <thead><tr><th>Plano</th><th>Preço</th><th>Duração</th><th>Destaque</th><th>Status</th><th></th></tr></thead>
                      <tbody>
                        {plansQuery.data.map((plan: any) => (
                          <tr key={plan.id}>
                            <td><strong>{plan.name}</strong><small>{plan.code}</small></td>
                            <td>{money(plan.priceCents)}</td>
                            <td>{plan.durationDays} dias</td>
                            <td>{plan.isFeatured ? "Sim" : "Não"}</td>
                            <td>{plan.isActive ? "Ativo" : "Oculto"}</td>
                            <td>
                              <button
                                onClick={() =>
                                  setPlanForm({
                                    id: plan.id,
                                    code: plan.code,
                                    name: plan.name,
                                    description: plan.description || "",
                                    price: String(plan.priceCents / 100),
                                    billingPeriod: plan.billingPeriod,
                                    durationDays: String(plan.durationDays),
                                    isFeatured: plan.isFeatured,
                                    isActive: plan.isActive,
                                    sortOrder: String(plan.sortOrder),
                                    benefits: (plan.benefits || []).join("\n"),
                                  })
                                }
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <h3>Pedidos e assinaturas</h3>
                <div className="studio-fields">
                  <label>Valor recebido por Pix (R$) — lança no financeiro<input inputMode="decimal" value={paidInput} onChange={e => setPaidInput(e.target.value)} /></label>
                  <label>Observação (comprovante, data)<input maxLength={300} value={subNote} onChange={e => setSubNote(e.target.value)} /></label>
                </div>
                {!subsQuery.data?.length ? (
                  <p>Nenhum pedido ainda.</p>
                ) : (
                  <div className="studio-table-wrap">
                    <table>
                      <thead><tr><th>Titular</th><th>Plano</th><th>Status</th><th>Vigência</th><th>Ações</th></tr></thead>
                      <tbody>
                        {subsQuery.data.map((sub: any) => (
                          <tr key={sub.id}>
                            <td>#{sub.userId} {sub.userName || sub.userEmail}</td>
                            <td>{sub.planName} · {money(sub.planPriceCents)}</td>
                            <td>{sub.status}</td>
                            <td>{sub.status === "active" ? date(sub.currentPeriodEndsAt) : "—"}</td>
                            <td>
                              <div className="studio-actions">
                                {sub.status === "pending" && (
                                  <button
                                    className="primary"
                                    disabled={activateSub.isPending}
                                    onClick={() =>
                                      activateSub.mutate({
                                        subscriptionId: sub.id,
                                        paidCents: Math.round(Number(paidInput.replace(",", ".") || 0) * 100),
                                        note: subNote || undefined,
                                      })
                                    }
                                  >
                                    Ativar
                                  </button>
                                )}
                                {["pending", "active"].includes(sub.status) && (
                                  <button className="danger" disabled={cancelSub.isPending} onClick={() => cancelSub.mutate({ id: sub.id })}>
                                    Encerrar
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
                <h3>Ativar plano direto para um titular</h3>
                <div className="studio-fields">
                  <label>ID do titular (aba Usuários)<input inputMode="numeric" value={manualSub.userId} onChange={e => setManualSub({ ...manualSub, userId: e.target.value })} /></label>
                  <label>
                    Plano
                    <select value={manualSub.planId} onChange={e => setManualSub({ ...manualSub, planId: e.target.value })}>
                      <option value="">Selecione</option>
                      {plansQuery.data?.map((plan: any) => (<option key={plan.id} value={plan.id}>{plan.name}</option>))}
                    </select>
                  </label>
                </div>
                <button
                  className="primary"
                  disabled={activateSub.isPending || !manualSub.userId || !manualSub.planId}
                  onClick={() =>
                    activateSub.mutate({
                      userId: Number(manualSub.userId),
                      planId: Number(manualSub.planId),
                      paidCents: Math.round(Number(paidInput.replace(",", ".") || 0) * 100),
                      note: subNote || undefined,
                    })
                  }
                >
                  Ativar plano
                </button>
              </section>
            )}
            {tab === "security" && <MfaPanel />}
            {tab === "identity" && (
              <section className="studio-panel">
                <div className="studio-title">
                  <div>
                    <p className="studio-kicker">Trust &amp; Safety</p>
                    <h2>Verificações de identidade</h2>
                    <p className="studio-muted">
                      Confirme o titular em videochamada reservada, comparando
                      documento e rosto ao vivo. Não armazene nem anexe documentos
                      aqui. Aprovações valem por 12 meses e ficam auditadas; você
                      não pode analisar a sua própria verificação.
                    </p>
                  </div>
                </div>
                <Failure error={identityQueue.error || reviewIdentity.error} />
                <label>
                  Motivo (obrigatório para recusar)
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={identityReason}
                    onChange={event => setIdentityReason(event.target.value)}
                    placeholder="Ex.: documento ilegível; rosto não confere; faltou comparecer à chamada."
                  />
                </label>
                {identityQueue.isLoading ? (
                  <p>Carregando solicitações…</p>
                ) : !identityQueue.data?.length ? (
                  <p>Nenhuma verificação pendente.</p>
                ) : (
                  <div className="studio-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Titular</th>
                          <th>E-mail</th>
                          <th>Solicitada</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {identityQueue.data.map(item => (
                          <tr key={item.id}>
                            <td>
                              #{item.userId} {item.userName || "Sem nome"}
                            </td>
                            <td>{item.userEmail || "—"}</td>
                            <td>{date(item.createdAt)}</td>
                            <td>
                              <div className="studio-actions">
                                <button
                                  className="primary"
                                  disabled={reviewIdentity.isPending}
                                  onClick={() =>
                                    reviewIdentity.mutate({
                                      id: item.id,
                                      decision: "approved",
                                      reason: identityReason || undefined,
                                    })
                                  }
                                >
                                  Aprovar
                                </button>
                                <button
                                  className="danger"
                                  disabled={
                                    reviewIdentity.isPending ||
                                    identityReason.trim().length < 5
                                  }
                                  onClick={() =>
                                    reviewIdentity.mutate({
                                      id: item.id,
                                      decision: "rejected",
                                      reason: identityReason,
                                    })
                                  }
                                >
                                  Recusar
                                </button>
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
                  <p className="studio-muted">
                    Configure toda a copy editorial da home. Links, filtros,
                    publicação, age gate e regras de segurança continuam
                    protegidos pelo sistema.
                  </p>
                  <Failure error={settings.error} />
                  <HomeCopyEditor
                    value={site.home}
                    onChange={home =>
                      setSite(current => ({ ...current, home }))
                    }
                  />
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
                  <p className="studio-kicker">{site.home.hero.eyebrow}</p>
                  <h1>{site.home.hero.title}</h1>
                  <p>{site.home.hero.subtitle}</p>
                  <h3>{site.home.hero.visualTitle}</h3>
                  <small>{site.home.hero.visualSubtitle}</small>
                  <button>{site.home.hero.buttonText}</button>
                  <input
                    readOnly
                    value={site.home.hero.searchPlaceholder}
                    aria-label="Prévia do placeholder de busca"
                  />
                  {site.showAbout && <p>{site.home.about.text}</p>}
                  <h3>{site.home.catalog.resultsEmptyTitle}</h3>
                  <p>{site.home.catalog.resultsEmptyText}</p>
                  <hr />
                  <small>{site.home.footer.tagline}</small>
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
