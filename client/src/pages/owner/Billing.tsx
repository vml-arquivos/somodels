import { useState } from "react";
import { toast } from "sonner";
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

function Packages({ currentName }: { currentName: string | null }) {
  const utils = trpc.useUtils();
  const plans = trpc.plans.list.useQuery();
  const mine = trpc.plans.mine.useQuery();
  const [custom, setCustom] = useState("");
  const pending = new Set(
    (mine.data ?? []).filter(s => s.status === "pending").map(s => s.planName)
  );
  const refresh = () =>
    Promise.all([
      utils.plans.mine.invalidate(),
      utils.owner.plan.invalidate(),
      utils.owner.payments.invalidate(),
      utils.owner.overview.invalidate(),
    ]);
  const request = trpc.plans.request.useMutation({
    onSuccess: async result => {
      toast.success(
        result.duplicate
          ? "Você já tem um pedido em andamento para este pacote."
          : "Pedido enviado. A equipe combina o Pix com você e ativa o pacote depois da confirmação."
      );
      await refresh();
    },
    onError: error => toast.error(error.message),
  });
  const ask = trpc.owner.requestCustomPlan.useMutation({
    onSuccess: async () => {
      toast.success("Pedido enviado. A equipe retorna com uma proposta.");
      setCustom("");
    },
    onError: error => toast.error(error.message),
  });
  return (
    <Card kicker="Contratar" title="Pacotes para anunciar">
      <div id="pacotes" className="od-plans">
        {(plans.data ?? []).map(item => {
          const isCurrent = currentName === item.name;
          const isPending = pending.has(item.name);
          return (
            <article
              key={item.id}
              className={`od-plan ${item.isFeatured ? "is-featured" : ""}`}
            >
              <div className="od-plan-top">
                <h3>{item.name}</h3>
                {item.isFeatured && <Badge tone="info">Destaque</Badge>}
              </div>
              <p className="od-big">
                {item.priceCents ? brl(item.priceCents) : "Grátis"}
                <small>
                  {item.durationDays ? ` · ${item.durationDays} dias` : ""}
                </small>
              </p>
              {item.description && <p className="od-muted">{item.description}</p>}
              <ul className="od-benefits">
                {item.benefits.map(benefit => (
                  <li key={benefit}>
                    <OIcon name="check" size={16} /> {benefit}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`od-btn ${isCurrent || isPending ? "" : "is-primary"}`}
                disabled={isCurrent || isPending || request.isPending}
                onClick={() => request.mutate({ planId: item.id })}
              >
                {isCurrent
                  ? "Pacote atual"
                  : isPending
                    ? "Pedido em andamento"
                    : "Contratar"}
              </button>
            </article>
          );
        })}
        {plans.data && plans.data.length === 0 && (
          <p className="od-muted">
            Os pacotes serão liberados em breve. Se quiser, descreva abaixo o que precisa.
          </p>
        )}
      </div>
      <form
        className="od-form od-custom-plan"
        onSubmit={event => {
          event.preventDefault();
          ask.mutate({ message: custom });
        }}
      >
        <label className="is-wide">
          <strong>Precisa de algo diferente?</strong>
          <small className="od-muted">
            Conte quantos anúncios, quais cidades e o que você quer de destaque. A equipe monta um
            pacote personalizado e envia a proposta.
          </small>
          <textarea
            rows={3}
            minLength={10}
            maxLength={1500}
            value={custom}
            onChange={event => setCustom(event.target.value)}
            placeholder="Ex.: quero 2 anúncios em destaque em Brasília por 3 meses."
          />
        </label>
        <div className="od-form-actions is-wide">
          <button
            type="submit"
            className="od-btn"
            disabled={ask.isPending || custom.trim().length < 10}
          >
            {ask.isPending ? "Enviando…" : "Pedir pacote personalizado"}
          </button>
        </div>
      </form>
    </Card>
  );
}

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
          <a className="od-btn" href="#pacotes">
            Ver pacotes
          </a>
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

      <Packages currentName={current?.planName ?? null} />

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
