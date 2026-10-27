import { trpc } from "@/lib/trpc";
import { Head, Kpi, Panel, Pill, brl } from "./kit";

const periodLabel: Record<string, string> = {
  month: "/mês",
  year: "/ano",
  none: "",
};

/** Vitrine de pacotes: mostra exatamente o que o anunciante vê e o desempenho de cada um. */
export default function PlanShowcase() {
  const plans = trpc.plans.list.useQuery();
  const stats = trpc.panel.planStats.useQuery();
  const byId = new Map((stats.data ?? []).map(s => [s.planId, s]));
  const active = (stats.data ?? []).reduce((sum, s) => sum + s.active, 0);
  const pending = (stats.data ?? []).reduce((sum, s) => sum + s.pending, 0);
  const revenue = (stats.data ?? []).reduce((sum, s) => sum + s.revenueCents, 0);

  return (
    <div className="adm">
      <Head
        title="Pacotes"
        subtitle="Os pacotes aparecem só para quem já é anunciante, em Meu painel › Plano e pagamentos. Não ficam na página inicial."
      />
      <div className="adm-kpis">
        <Kpi label="Assinaturas ativas" value={active} />
        <Kpi label="Pedidos aguardando" value={pending} alert={pending > 0} />
        <Kpi label="Receita de pacotes (total)" value={brl(revenue)} />
      </div>
      <Panel title="Como o anunciante vê">
        {plans.isLoading ? (
          <p className="adm-muted">Carregando…</p>
        ) : !plans.data?.length ? (
          <p className="adm-muted">
            Nenhum pacote ativo. Cadastre abaixo para o anunciante poder contratar.
          </p>
        ) : (
          <div className="adm-plans">
            {plans.data.map(plan => {
              const s = byId.get(plan.id);
              return (
                <article
                  key={plan.id}
                  className={`adm-plan ${plan.isFeatured ? "is-featured" : ""}`}
                >
                  <div className="adm-chips">
                    <h4>{plan.name}</h4>
                    {plan.isFeatured && <Pill tone="info">Destaque</Pill>}
                  </div>
                  <p className="price">
                    {plan.priceCents ? brl(plan.priceCents) : "Grátis"}
                    <small>
                      {periodLabel[plan.billingPeriod] ?? ""}
                      {plan.durationDays ? ` · ${plan.durationDays} dias` : ""}
                    </small>
                  </p>
                  {plan.description && <p className="adm-muted">{plan.description}</p>}
                  <ul>
                    {plan.benefits.map(b => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {s && (
                    <p className="adm-muted">
                      {s.active} ativo(s) · {s.pending} aguardando · {brl(s.revenueCents)} recebidos
                    </p>
                  )}
                </article>
              );
            })}
            <article className="adm-plan">
              <h4>Pacote personalizado</h4>
              <p className="adm-muted">
                O anunciante descreve o que precisa e o pedido chega na ficha dele, em Anotações, com
                retorno agendado para hoje.
              </p>
            </article>
          </div>
        )}
      </Panel>
    </div>
  );
}
