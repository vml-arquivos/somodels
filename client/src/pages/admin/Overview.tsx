import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import type { AdminTabKey } from "@shared/admin-navigation";
import { adminPathForTab } from "@shared/admin-navigation";
import {
  DayBars,
  ErrorNote,
  Head,
  Kpi,
  Loading,
  Panel,
  Rank,
  Trend,
  brl,
  relativeTime,
} from "./kit";

const actionNames: Record<string, string> = {
  "identity.approved": "Identidade aprovada",
  "identity.rejected": "Identidade recusada",
  "identity.requested": "Verificação solicitada",
  "verification.submitted": "Documentos enviados para análise",
  "verification.decided": "Verificação analisada",
  "verification.document_viewed": "Documento de verificação aberto",
  "payment.recorded": "Pagamento registrado",
  "payment.status_changed": "Situação de pagamento alterada",
  "crm.stage_changed": "Etapa do anunciante alterada",
  "crm.note_added": "Anotação adicionada",
  "plan.custom_requested": "Pacote personalizado solicitado",
  "report.exported": "Relatório exportado",
  "seo.updated": "SEO atualizado",
  "owner.cpf.revealed": "CPF aberto",
  "account.terms.accepted": "Termos aceitos",
};
const actionLabel = (action: string) =>
  actionNames[action] ??
  action.replace(/[._]/g, " ").replace(/^\w/, c => c.toUpperCase());

export default function Overview({
  go,
}: {
  go: (tab: AdminTabKey) => void;
}) {
  const data = trpc.panel.overview.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const legacy = trpc.management.overview.useQuery(undefined, {
    retry: false,
  });
  if (data.isLoading) return <Loading label="Carregando indicadores…" />;
  if (!data.data)
    return <ErrorNote error={data.error ?? { message: "Sem dados" }} />;
  const d = data.data;

  const todo: { tab: AdminTabKey; label: string; hint: string; total: number }[] =
    [
      {
        tab: "identity",
        label: "Verificações para analisar",
        hint: "Documentos e vídeo aguardando",
        total: d.queues.pendingIdentity,
      },
      {
        tab: "moderation",
        label: "Anúncios e mídias em análise",
        hint: `${d.queues.pendingProfiles} anúncios · ${d.queues.pendingMedia} mídias`,
        total: d.queues.pendingProfiles + d.queues.pendingMedia,
      },
      {
        tab: "reviews",
        label: "Avaliações para conferir",
        hint: "Novas ou contestadas pelo anunciante",
        total: d.queues.pendingReviews,
      },
      {
        tab: "reports",
        label: "Denúncias abertas",
        hint: "Precisam de decisão",
        total: d.queues.openReports,
      },
      {
        tab: "plans",
        label: "Pedidos de pacote",
        hint: "Aguardando confirmação do pagamento",
        total: d.queues.pendingSubscriptions,
      },
      {
        tab: "payments",
        label: "Pagamentos atrasados",
        hint: "Passaram do vencimento",
        total: d.queues.overduePayments,
      },
      {
        tab: "advertisers",
        label: "Retornos agendados",
        hint: "Anunciantes para contatar hoje",
        total: d.queues.followUps,
      },
      {
        tab: "messages",
        label: "Mensagens novas",
        hint: "Fale conosco",
        total: d.queues.newMessages,
      },
    ];

  return (
    <div className="adm">
      <Head
        title="Visão geral"
        subtitle="O que precisa de atenção e como a plataforma está nos últimos 30 dias."
      />
      <ErrorNote error={data.error} />

      <div className="adm-kpis">
        {d.people && (
          <Kpi
            label="Novos anunciantes"
            value={d.people.newAdvertisers}
            foot={
              <Trend
                current={d.people.newAdvertisers}
                previous={d.people.prevNewAdvertisers}
              />
            }
          />
        )}
        <Kpi
          label="Anúncios no ar"
          value={d.listings.published}
          foot={`${d.listings.total} no total · ${d.listings.pending} em análise`}
        />
        {d.people && (
          <Kpi
            label="Contas criadas"
            value={d.people.newAccounts}
            foot={
              <Trend
                current={d.people.newAccounts}
                previous={d.people.prevNewAccounts}
              />
            }
          />
        )}
        {d.money && (
          <>
            <Kpi
              label="Recebido (30 dias)"
              value={brl(d.money.paid30)}
              foot={
                <Trend current={d.money.paid30} previous={d.money.paidPrev} />
              }
            />
            <Kpi
              label="A receber"
              value={brl(d.money.pending + d.money.overdue)}
              foot={
                d.money.overdue > 0
                  ? `${brl(d.money.overdue)} em atraso`
                  : "Nada em atraso"
              }
              alert={d.money.overdue > 0}
            />
            <Kpi
              label="Receita mensal recorrente"
              value={brl(d.money.mrr)}
              foot={`${d.money.activeSubscriptions} pacote(s) ativo(s)`}
            />
          </>
        )}
      </div>

      <div className="adm-grid is-main">
        <Panel title="Precisa de você">
          <ul className="adm-todo">
            {todo.map(item => (
              <li key={item.tab} className={item.total === 0 ? "is-calm" : ""}>
                <Link
                  href={adminPathForTab(item.tab)}
                  onClick={event => {
                    event.preventDefault();
                    go(item.tab);
                  }}
                >
                  <span>
                    {item.label}
                    <small className="adm-muted">{item.hint}</small>
                  </span>
                  <b>{item.total === 0 ? "✓" : item.total}</b>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Onde estão os anúncios">
          <Rank items={d.cities} />
        </Panel>
      </div>

      <div className="adm-grid is-2">
        <Panel title="Cadastros e anúncios por dia">
          <DayBars
            a="Contas novas"
            b="Anúncios criados"
            data={d.series.map(s => ({
              date: s.date,
              a: s.signups,
              b: s.listings,
            }))}
          />
        </Panel>
        {d.money ? (
          <Panel title="Recebimentos por dia">
            <DayBars
              a="Recebido"
              money
              data={d.money.daily.map(s => ({
                date: s.date,
                a: s.cents / 100,
              }))}
            />
          </Panel>
        ) : (
          <Panel title="Situação dos anúncios">
            {legacy.data?.states.map(s => (
              <div className="adm-row" key={s.label}>
                <span>{s.label}</span>
                <strong>{s.total}</strong>
              </div>
            ))}
          </Panel>
        )}
      </div>

      <div className="adm-grid is-2">
        <Panel title="Atividade recente da equipe">
          {d.recent.length ? (
            <ul className="adm-feed">
              {d.recent.map(item => (
                <li key={item.id}>
                  <span>{actionLabel(item.action)}</span>
                  <small>{relativeTime(item.createdAt)}</small>
                  <small>{item.actorName ?? "Sistema"}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-muted">Nenhuma atividade registrada ainda.</p>
          )}
        </Panel>
        <Panel title="Áreas de atuação">
          {legacy.data?.types.length ? (
            <Rank items={legacy.data.types} />
          ) : (
            <p className="adm-muted">Sem anúncios cadastrados.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
