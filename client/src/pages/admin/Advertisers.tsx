import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import type { AdminScope } from "@shared/admin-access";
import { crmStageLabels, crmStages } from "@shared/admin-crm";
import AdvertiserSheet from "./AdvertiserSheet";
import {
  Avatar,
  Empty,
  ErrorNote,
  Head,
  Loading,
  Pager,
  Pill,
  downloadHref,
  fmtDate,
  identityLabel,
  relativeTime,
  stageTone,
} from "./kit";

type Filters = {
  search: string;
  stage: string;
  plan: "all" | "with" | "without";
  payment: "all" | "overdue" | "pending" | "paid" | "none";
  personal: "all" | "complete" | "missing";
  identity: "all" | "none" | "pending" | "approved" | "rejected";
  listings: "all" | "none" | "published" | "unpublished";
  followUp: "all" | "due";
  sort: "recent" | "name" | "listings" | "login" | "paid";
};

const initial: Filters = {
  search: "",
  stage: "",
  plan: "all",
  payment: "all",
  personal: "all",
  identity: "all",
  listings: "all",
  followUp: "all",
  sort: "recent",
};

export default function Advertisers({
  scopes,
  onOpenProfile,
  onOpenTab,
}: {
  scopes: readonly AdminScope[];
  onOpenProfile: (profileId: number) => void;
  onOpenTab: (path: string) => void;
}) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const openId = Number(new URLSearchParams(search).get("u")) || null;
  const [filters, setFilters] = useState<Filters>(initial);
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const finance = scopes.includes("finance:read") || scopes.includes("plans");
  const canExport = scopes.includes("users:read");

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => (f.search === typed ? f : { ...f, search: typed }));
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [typed]);

  const list = trpc.panel.advertisers.useQuery(
    { ...filters, stage: filters.stage || undefined, page },
    { placeholderData: keepPreviousData, refetchInterval: 60_000 }
  );
  const data = list.data;
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(0);
  };
  const reset = () => {
    setFilters(initial);
    setTyped("");
    setPage(0);
  };
  const dirty = JSON.stringify(filters) !== JSON.stringify(initial);
  const open = (id: number | null) =>
    setLocation(id ? `/admin/anunciantes?u=${id}` : "/admin/anunciantes");

  return (
    <div className="adm">
      <Head
        title="Anunciantes"
        subtitle="Quem anuncia, em que etapa está e o que precisa de contato."
        actions={
          canExport && (
            <a
              className="adm-btn"
              href={downloadHref("advertisers", { days: 365 })}
            >
              Exportar CSV
            </a>
          )
        }
      />

      <div className="adm-chips" role="group" aria-label="Etapas do acompanhamento">
        <button
          type="button"
          className={`adm-chip ${filters.stage === "" ? "is-active" : ""}`}
          onClick={() => set("stage", "")}
        >
          Todos <b>{data?.quick.all ?? "…"}</b>
        </button>
        {crmStages.map(stage => (
          <button
            key={stage}
            type="button"
            className={`adm-chip ${filters.stage === stage ? "is-active" : ""}`}
            onClick={() => set("stage", filters.stage === stage ? "" : stage)}
          >
            {crmStageLabels[stage]} <b>{data?.stageCounts[stage] ?? 0}</b>
          </button>
        ))}
      </div>

      <div className="adm-chips" role="group" aria-label="Atalhos">
        <button
          type="button"
          className={`adm-chip ${filters.followUp === "due" ? "is-active" : ""} ${data?.quick.followUps ? "is-alert" : ""}`}
          onClick={() => set("followUp", filters.followUp === "due" ? "all" : "due")}
        >
          Retornar hoje <b>{data?.quick.followUps ?? 0}</b>
        </button>
        {finance && (
          <button
            type="button"
            className={`adm-chip ${filters.payment === "overdue" ? "is-active" : ""} ${data?.quick.overdue ? "is-alert" : ""}`}
            onClick={() =>
              set("payment", filters.payment === "overdue" ? "all" : "overdue")
            }
          >
            Pagamento atrasado <b>{data?.quick.overdue ?? 0}</b>
          </button>
        )}
        <button
          type="button"
          className={`adm-chip ${filters.identity === "pending" ? "is-active" : ""}`}
          onClick={() =>
            set("identity", filters.identity === "pending" ? "all" : "pending")
          }
        >
          Em verificação <b>{data?.quick.verifying ?? 0}</b>
        </button>
        <button
          type="button"
          className={`adm-chip ${filters.personal === "missing" ? "is-active" : ""}`}
          onClick={() =>
            set("personal", filters.personal === "missing" ? "all" : "missing")
          }
        >
          Sem dados pessoais <b>{data?.quick.noPersonal ?? 0}</b>
        </button>
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-input"
          type="search"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder="Buscar por nome, e-mail ou número"
          aria-label="Buscar anunciante"
        />
        <select
          className="adm-select"
          value={filters.sort}
          onChange={e => set("sort", e.target.value as Filters["sort"])}
          aria-label="Ordenar"
        >
          <option value="recent">Mais recentes</option>
          <option value="name">Nome (A–Z)</option>
          <option value="listings">Mais anúncios</option>
          <option value="login">Último acesso</option>
          {finance && <option value="paid">Maior valor pago</option>}
        </select>
        <button
          type="button"
          className="adm-btn"
          aria-expanded={showFilters}
          onClick={() => setShowFilters(v => !v)}
        >
          Filtros{dirty ? " •" : ""}
        </button>
        {dirty && (
          <button type="button" className="adm-btn is-ghost" onClick={reset}>
            Limpar
          </button>
        )}
      </div>

      {showFilters && (
        <div className="adm-panel adm-grid is-3">
          {finance && (
            <label className="adm-field">
              Pacote
              <select
                className="adm-select"
                value={filters.plan}
                onChange={e => set("plan", e.target.value as Filters["plan"])}
              >
                <option value="all">Todos</option>
                <option value="with">Com pacote ativo</option>
                <option value="without">Sem pacote</option>
              </select>
            </label>
          )}
          {finance && (
            <label className="adm-field">
              Pagamento
              <select
                className="adm-select"
                value={filters.payment}
                onChange={e =>
                  set("payment", e.target.value as Filters["payment"])
                }
              >
                <option value="all">Todos</option>
                <option value="overdue">Atrasado</option>
                <option value="pending">Aguardando</option>
                <option value="paid">Em dia (já pagou)</option>
                <option value="none">Nunca pagou</option>
              </select>
            </label>
          )}
          <label className="adm-field">
            Dados pessoais
            <select
              className="adm-select"
              value={filters.personal}
              onChange={e => set("personal", e.target.value as Filters["personal"])}
            >
              <option value="all">Todos</option>
              <option value="complete">Completos</option>
              <option value="missing">Pendentes</option>
            </select>
          </label>
          <label className="adm-field">
            Verificação de identidade
            <select
              className="adm-select"
              value={filters.identity}
              onChange={e => set("identity", e.target.value as Filters["identity"])}
            >
              <option value="all">Todas</option>
              <option value="none">Não enviada</option>
              <option value="pending">Em análise</option>
              <option value="approved">Aprovada</option>
              <option value="rejected">Recusada</option>
            </select>
          </label>
          <label className="adm-field">
            Anúncios
            <select
              className="adm-select"
              value={filters.listings}
              onChange={e => set("listings", e.target.value as Filters["listings"])}
            >
              <option value="all">Todos</option>
              <option value="none">Ainda sem anúncio</option>
              <option value="published">Com anúncio no ar</option>
              <option value="unpublished">Anúncio fora do ar</option>
            </select>
          </label>
        </div>
      )}

      <ErrorNote error={list.error} />
      {!data && list.isLoading ? (
        <Loading />
      ) : data && data.items.length === 0 ? (
        <div className="adm-panel">
          <Empty
            title="Nenhum anunciante encontrado"
            text={
              dirty
                ? "Tente remover algum filtro."
                : "Quando alguém criar um anúncio ou preencher os dados, aparece aqui."
            }
            action={
              dirty ? (
                <button type="button" className="adm-btn" onClick={reset}>
                  Limpar filtros
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        data && (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Anunciante</th>
                    <th>Etapa</th>
                    <th>Anúncios</th>
                    {finance && <th>Pacote</th>}
                    {finance && <th>Pagamento</th>}
                    <th>Identidade</th>
                    <th>Último acesso</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(row => {
                    const [idLabel, idTone] =
                      identityLabel[row.identityStatus ?? "none"] ??
                      identityLabel.none;
                    const due =
                      row.nextFollowUpAt &&
                      new Date(row.nextFollowUpAt).getTime() <= Date.now();
                    return (
                      <tr
                        key={row.id}
                        className="is-click"
                        tabIndex={0}
                        onClick={() => open(row.id)}
                        onKeyDown={e => {
                          if (e.key === "Enter") open(row.id);
                        }}
                      >
                        <td>
                          <div className="adm-who">
                            <Avatar
                              name={row.fullName || row.name || row.email || "?"}
                              seed={row.id}
                            />
                            <div>
                              <strong>{row.fullName || row.name || "Sem nome"}</strong>
                              <small>{row.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Pill tone={stageTone[row.stage] ?? "mute"}>
                            {crmStageLabels[row.stage]}
                          </Pill>
                          {due && (
                            <>
                              {" "}
                              <Pill tone="bad">Retornar</Pill>
                            </>
                          )}
                        </td>
                        <td>
                          {row.listings === 0 ? (
                            <span className="adm-muted">nenhum</span>
                          ) : (
                            <>
                              <strong>{row.published}</strong> no ar
                              <small>{row.listings} no total</small>
                            </>
                          )}
                        </td>
                        {finance && (
                          <td>
                            {row.planName ? (
                              <>
                                {row.planName}
                                <small>até {fmtDate(row.planEndsAt)}</small>
                              </>
                            ) : (
                              <span className="adm-muted">sem pacote</span>
                            )}
                          </td>
                        )}
                        {finance && (
                          <td>
                            {row.overdue > 0 ? (
                              <Pill tone="bad">Atrasado</Pill>
                            ) : row.pendingPayments > 0 ? (
                              <Pill tone="warn">Aguardando</Pill>
                            ) : row.paidTotalCents > 0 ? (
                              <Pill tone="ok">Em dia</Pill>
                            ) : (
                              <span className="adm-muted">—</span>
                            )}
                          </td>
                        )}
                        <td>
                          <Pill tone={idTone}>{idLabel}</Pill>
                        </td>
                        <td>{row.lastSignedIn ? relativeTime(row.lastSignedIn) : "—"}</td>
                        <td>{fmtDate(row.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager
              page={data.page}
              total={data.total}
              pageSize={data.pageSize}
              onPage={setPage}
            />
          </>
        )
      )}

      {openId && (
        <AdvertiserSheet
          userId={openId}
          scopes={scopes}
          onClose={() => open(null)}
          onOpenProfile={onOpenProfile}
          onOpenTab={onOpenTab}
        />
      )}
    </div>
  );
}
