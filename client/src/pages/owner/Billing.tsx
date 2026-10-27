import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Badge,
  Card,
  Empty,
  ErrorBlock,
  LoadingBlock,
  OIcon,
  PageHead,
  brl,
  fmtDate,
  type Tone,
} from "./ui";

const period: Record<string, string> = {
  monthly: "mês",
  quarterly: "trimestre",
  yearly: "ano",
};
const payStatus: Record<string, { label: string; tone: Tone }> = {
  paid: { label: "Pago", tone: "ok" },
  pending: { label: "Aguardando", tone: "warn" },
  failed: { label: "Falhou", tone: "bad" },
  refunded: { label: "Reembolsado", tone: "info" },
  cancelled: { label: "Cancelado", tone: "mute" },
};
const methods: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  boleto: "Boleto",
  manual: "Manual",
  courtesy: "Cortesia",
};
const subStatus: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
  cancelled: "Cancelado",
  expired: "Expirado",
  past_due: "Em atraso",
};

export default function Billing() {
  const plan = trpc.owner.plan.useQuery();
  const payments = trpc.owner.payments.useQuery();
  if (plan.isLoading || payments.isLoading) return <LoadingBlock />;
  if (plan.error || !plan.data)
    return <ErrorBlock message={plan.error?.message || "Erro ao carregar"} />;
  const current = plan.data.current;
  const rows = payments.data ?? [];
  const paid = rows
    .filter(row => row.status === "paid")
    .reduce((sum, row) => sum + row.amountCents, 0);

  return (
    <>
      <PageHead
        title="Plano e pagamentos"
        subtitle="Seu plano atual, o histórico de assinaturas e todos os pagamentos da conta."
        actions={
          <Link className="od-btn" href="/planos">
            Ver planos disponíveis
          </Link>
        }
      />
      {!plan.data.paymentsEnabled && (
        <div className="od-alert is-info">
          <OIcon name="star" />
          <p>
            Por enquanto não há cobrança. Você anuncia sem custo e seu histórico
            já fica registrado aqui. Quando a cobrança começar, avisaremos com
            antecedência.
          </p>
        </div>
      )}
      <div className="od-grid-2">
        <Card
          kicker="Plano atual"
          title={current ? current.planName : "Plano gratuito"}
        >
          {current ? (
            <>
              <p className="od-big">
                {brl(current.priceCents)}
                <small> / {period[current.billingPeriod] || "período"}</small>
              </p>
              <p className="od-muted">
                {current.currentPeriodEndsAt
                  ? `Renova ou vence em ${fmtDate(current.currentPeriodEndsAt)}`
                  : "Sem data de término"}
              </p>
              {current.benefits.length > 0 && (
                <ul className="od-benefits">
                  {current.benefits.map(benefit => (
                    <li key={benefit}>
                      <OIcon name="check" size={16} /> {benefit}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="od-muted">
              Você está no acesso gratuito. Compare os planos quando quiser mais
              destaque e recursos.
            </p>
          )}
        </Card>
        <Card kicker="Resumo" title="Total pago">
          <p className="od-big">{brl(paid)}</p>
          <p className="od-muted">
            {rows.length} lançamento{rows.length === 1 ? "" : "s"} na conta.
          </p>
        </Card>
      </div>

      <Card kicker="Financeiro" title="Histórico de pagamentos">
        {rows.length === 0 ? (
          <Empty
            icon="card"
            title="Sem cobranças por enquanto"
            text="Quando houver pagamentos, faturas e recibos aparecem aqui, com número e situação."
          />
        ) : (
          <div className="od-table-wrap">
            <table className="od-table">
              <thead>
                <tr>
                  <th>Fatura</th>
                  <th>Descrição</th>
                  <th>Data</th>
                  <th>Forma</th>
                  <th className="num">Valor</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const status = payStatus[row.status] ?? payStatus.pending;
                  return (
                    <tr key={row.id}>
                      <td>{row.invoiceNumber || `#${row.id}`}</td>
                      <td>{row.description}</td>
                      <td>
                        {fmtDate(row.paidAt || row.dueAt || row.createdAt)}
                      </td>
                      <td>{methods[row.method] || row.method}</td>
                      <td className="num">{brl(row.amountCents)}</td>
                      <td>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card kicker="Assinaturas" title="Histórico de planos">
        {plan.data.history.length === 0 ? (
          <p className="od-muted">Nenhuma assinatura registrada.</p>
        ) : (
          <ul className="od-timeline is-plain">
            {plan.data.history.map((row: any) => (
              <li key={row.id}>
                <strong>{row.planName}</strong>
                <span>
                  {subStatus[row.status] || row.status} · desde{" "}
                  {fmtDate(row.createdAt)}
                  {row.currentPeriodEndsAt
                    ? ` · até ${fmtDate(row.currentPeriodEndsAt)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
