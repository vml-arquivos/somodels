import { useEffect } from "react";
import { Link, useLocation, useRoute, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import StudioHeader from "@/components/StudioHeader";
import { usePublicLight } from "@/contexts/ThemeContext";
import Seo from "@/components/Seo";
import Overview from "./owner/Overview";
import Listings from "./owner/Listings";
import Library from "./owner/Library";
import Billing from "./owner/Billing";
import Personal from "./owner/Personal";
import Contract from "./owner/Contract";
import Activity from "./owner/Activity";
import Reviews from "./owner/Reviews";
import { Badge, OIcon, type OIconName } from "./owner/ui";

type SectionKey =
  | "visao-geral"
  | "anuncios"
  | "midia"
  | "plano"
  | "avaliacoes"
  | "dados"
  | "contrato"
  | "atividade";

const sections: { key: SectionKey; label: string; icon: OIconName }[] = [
  { key: "visao-geral", label: "Visão geral", icon: "home" },
  { key: "anuncios", label: "Meus anúncios", icon: "list" },
  { key: "midia", label: "Biblioteca", icon: "image" },
  { key: "avaliacoes", label: "Avaliações", icon: "star" },
  { key: "plano", label: "Plano e pagamentos", icon: "card" },
  { key: "dados", label: "Dados pessoais", icon: "user" },
  { key: "contrato", label: "Contrato", icon: "file" },
  { key: "atividade", label: "Atividade", icon: "clock" },
];

const pathFor = (key: SectionKey) =>
  key === "visao-geral" ? "/titular" : `/titular/${key}`;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function OwnerDashboard() {
  usePublicLight();
  const { user, loading, logout } = useAuth();
  const [, params] = useRoute("/titular/:section?");
  const search = useSearch();
  const [, navigate] = useLocation();
  const query = new URLSearchParams(search);
  const rawProfile = Number(query.get("profileId"));
  const profileId =
    Number.isInteger(rawProfile) && rawProfile > 0 ? rawProfile : null;
  const isNew = query.get("novo") === "1";
  const requested = params?.section as SectionKey | undefined;
  const current: SectionKey =
    requested && sections.some(s => s.key === requested)
      ? requested
      : profileId || isNew
        ? "anuncios"
        : "visao-geral";
  const ready = Boolean(user && !user.mustChangePassword);
  const overview = trpc.owner.overview.useQuery(undefined, { enabled: ready });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [current, profileId, isNew]);

  // Compatibilidade com o endereço antigo /titular?profileId=N
  useEffect(() => {
    if (!requested && (profileId || isNew)) {
      navigate(
        `/titular/anuncios?${profileId ? `profileId=${profileId}` : "novo=1"}`,
        { replace: true }
      );
    }
  }, [requested, profileId, isNew, navigate]);

  const title = sections.find(s => s.key === current)?.label || "Meu painel";
  const data = overview.data;
  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "por aqui";
  const todo = data ? data.steps.filter(step => !step.done).length : 0;
  const badges: Partial<Record<SectionKey, string | number>> = {};
  if (data) {
    if (data.summary.total) badges.anuncios = data.summary.total;
    if (data.media.library) badges.midia = data.media.library;
    if (!data.personal.complete) badges.dados = "!";
    if (!data.terms.current) badges.contrato = "!";
  }

  return (
    <div className="studio studio-public ep-page od-page">
      <Seo
        title={`${title} — Ero Models`}
        description="Área privada do anunciante."
        noindex
      />
      <StudioHeader minimal />
      {loading ? (
        <main className="od-center">Carregando…</main>
      ) : !user ? (
        <main className="od-center">
          <Link className="od-btn is-primary" href="/login?returnTo=/titular">
            Entre para continuar
          </Link>
        </main>
      ) : user.mustChangePassword ? (
        <main className="od-center">
          <Link
            className="od-btn is-primary"
            href="/alterar-senha?returnTo=/titular"
          >
            Altere sua senha antes de continuar
          </Link>
        </main>
      ) : (
        <div className="od-shell">
          <aside className="od-side" aria-label="Menu do anunciante">
            <div className="od-me">
              <span className="od-avatar" aria-hidden="true">
                {initials(user.name || user.email || "?")}
              </span>
              <div>
                <strong>{user.name || "Minha conta"}</strong>
                <small>{user.email}</small>
              </div>
            </div>
            <nav className="od-nav">
              {sections.map(section => (
                <Link
                  key={section.key}
                  href={pathFor(section.key)}
                  className={current === section.key ? "is-active" : ""}
                  aria-current={current === section.key ? "page" : undefined}
                >
                  <OIcon name={section.icon} />
                  <span>{section.label}</span>
                  {badges[section.key] !== undefined && (
                    <em
                      className={
                        typeof badges[section.key] === "string"
                          ? "is-alert"
                          : ""
                      }
                    >
                      {badges[section.key]}
                    </em>
                  )}
                </Link>
              ))}
            </nav>
            <div className="od-side-foot">
              {data && (
                <div className="od-plan-chip">
                  <small>Plano</small>
                  <strong>{data.plan ? data.plan.planName : "Gratuito"}</strong>
                  {todo > 0 && (
                    <Badge tone="warn">
                      {todo} etapa{todo === 1 ? "" : "s"} pendente
                      {todo === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              )}
              <Link href="/" className="od-side-link">
                <OIcon name="site" size={18} /> Ver o site
              </Link>
              <button
                type="button"
                className="od-side-link"
                onClick={() => void logout()}
              >
                <OIcon name="logout" size={18} /> Sair
              </button>
            </div>
          </aside>
          <main className="od-main" id="conteudo">
            {current === "visao-geral" && <Overview firstName={firstName} />}
            {current === "anuncios" && (
              <Listings profileId={profileId} isNew={isNew} />
            )}
            {current === "midia" && <Library />}
            {current === "avaliacoes" && <Reviews />}
            {current === "plano" && <Billing />}
            {current === "dados" && <Personal user={user} />}
            {current === "contrato" && <Contract />}
            {current === "atividade" && <Activity />}
          </main>
        </div>
      )}
    </div>
  );
}
