import { useEffect, useState } from "react";
import { toast } from "sonner";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import type { AdminScope } from "@shared/admin-access";
import {
  Empty,
  ErrorNote,
  Head,
  Kpi,
  Loading,
  Pager,
  Pill,
  brl,
  downloadHref,
  fmtDate,
  paymentTone,
} from "./kit";

type Bucket = "all" | "paid" | "pending" | "overdue" | "failed" | "refunded" | "cancelled";

const bucketLabels: [Bucket, string][] = [
  ["all", "Todos"],
  ["paid", "Pagos"],
  ["pending", "Aguardando"],
  ["overdue", "Atrasados"],
  ["refunded", "Reembolsados"],
  ["cancelled", "Cancelados"],
];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export default function Payments({
  scopes,
  onOpenAdvertiser,
}: {
  scopes: readonly AdminScope[];
  onOpenAdvertiser: (userId: number) => void;
}) {
  const utils = trpc.useUtils();
  const canWrite = scopes.includes("finance:write") || scopes.includes("plans");
  const [bucket, setBucket] = useState<Bucket>("all");
  const [method, setMethod] = useState("all");
  const [period, setPeriod] = useState<"all" | "30" | "90" | "month">("30");
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(typed);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [typed]);

  const range = (() => {
    const today = new Date();
    if (period === "all") return {};
    if (period === "month")
      return {
        from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: isoDay(today),
      };
    const from = new Date(today.getTime() - (Number(period) - 1) * 86_400_000);
    return { from: isoDay(from), to: isoDay(today) };
  })();

  const list = trpc.panel.payments.useQuery(
    { bucket, method, search: search || undefined, page, ...range },
    { placeholderData: keepPreviousData, refetchInterval: 60_000 }
  );
  const mark = trpc.panel.markPayment.useMutation({
    onSuccess: async () => {
      toast.success("Pagamento atualizado");
      await Promise.all([
        utils.panel.payments.invalidate(),
        utils.panel.overview.invalidate(),
        utils.management.navigationCounts.invalidate(),
      ]);
    },
    onError: e => toast.error(e.message),
  });
  const data = list.data;

  return (
    <div className="adm">
      <Head
        title="Pagamentos"
        subtitle="O que foi pago, o que está aguardando e o que atrasou."
        actions={
          <a
            className="adm-btn"
            href={downloadHref("payments", {
              from: range.from,
              to: range.to,
              days: period === "all" ? 365 : undefined,
            })}
          >
            Exportar CSV
          </a>
        }
      />

      <div className="adm-kpis">
        <Kpi
          label="Recebido"
          value={brl(data?.totals.paid ?? 0)}
          foot={`${data?.totals.paidCount ?? 0} pagamento(s)`}
        />
        <Kpi
          label="Aguardando"
          value={brl(data?.totals.pending ?? 0)}
          foot={`${data?.totals.pendingCount ?? 0} dentro do prazo`}
        />
        <Kpi
          label="Atrasado"
          value={brl(data?.totals.overdue ?? 0)}
          foot={`${data?.totals.overdueCount ?? 0} vencido(s)`}
          alert={(data?.totals.overdue ?? 0) > 0}
        />
        <Kpi label="Reembolsado" value={brl(data?.totals.refunded ?? 0)} />
      </div>

      <div className="adm-chips" role="group" aria-label="Situação">
        {bucketLabels.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`adm-chip ${bucket === key ? "is-active" : ""} ${key === "overdue" && data?.totals.overdueCount ? "is-alert" : ""}`}
            onClick={() => {
              setBucket(key);
              setPage(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-input"
          type="search"
          placeholder="Buscar anunciante, e-mail ou fatura"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          aria-label="Buscar pagamento"
        />
        <select
          className="adm-select"
          value={period}
          onChange={e => {
            setPeriod(e.target.value as typeof period);
            setPage(0);
          }}
          aria-label="Período"
        >
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="month">Este mês</option>
          <option value="all">Todo o período</option>
        </select>
        <select
          className="adm-select"
          value={method}
          onChange={e => {
            setMethod(e.target.value);
            setPage(0);
          }}
          aria-label="Forma de pagamento"
        >
          <option value="all">Todas as formas</option>
          <option value="pix">Pix</option>
          <option value="card">Cartão</option>
          <option value="boleto">Boleto</option>
          <option value="manual">Outro</option>
          <option value="courtesy">Cortesia</option>
        </select>
      </div>

      <ErrorNote error={list.error} />
      {!data && list.isLoading ? (
        <Loading />
      ) : data && data.items.length === 0 ? (
        <div className="adm-panel">
          <Empty
            title="Nenhum pagamento neste filtro"
            text="Os pedidos de pacote e os pagamentos registrados aparecem aqui."
          />
        </div>
      ) : (
        data && (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Fatura</th>
                    <th>Anunciante</th>
                    <th>Descrição</th>
                    <th className="num">Valor</th>
                    <th>Situação</th>
                    <th>Vencimento</th>
                    <th>Pago em</th>
                    <th>Forma</th>
                    {canWrite && <th />}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(p => {
                    const [label, tone] = paymentTone[p.bucket] ?? [p.bucket, "mute"];
                    return (
                      <tr key={p.id}>
                        <td className="nw">{p.invoiceNumber ?? `#${p.id}`}</td>
                        <td>
                          <button
                            type="button"
                            className="adm-btn is-ghost is-sm"
                            onClick={() => onOpenAdvertiser(p.userId)}
                          >
                            {p.userName || p.userEmail || `#${p.userId}`}
                          </button>
                        </td>
                        <td>{p.description}</td>
                        <td className="num">{brl(p.amountCents)}</td>
                        <td>
                          <Pill tone={tone}>{label}</Pill>
                        </td>
                        <td>{p.dueAt ? fmtDate(p.dueAt) : "—"}</td>
                        <td>{p.paidAt ? fmtDate(p.paidAt) : "—"}</td>
                        <td>{methodLabel[p.method] ?? p.method}</td>
                        {canWrite && (
                          <td>
                            <span className="adm-chips">
                              {p.status === "pending" && (
                                <button
                                  type="button"
                                  className="adm-btn is-sm is-primary"
                                  disabled={mark.isPending}
                                  onClick={() => mark.mutate({ id: p.id, status: "paid" })}
                                >
                                  Marcar pago
                                </button>
                              )}
                              {p.status === "pending" && (
                                <button
                                  type="button"
                                  className="adm-btn is-sm"
                                  disabled={mark.isPending}
                                  onClick={() => {
                                    if (window.confirm("Cancelar esta cobrança?"))
                                      mark.mutate({ id: p.id, status: "cancelled" });
                                  }}
                                >
                                  Cancelar
                                </button>
                              )}
                              {p.status === "paid" && (
                                <button
                                  type="button"
                                  className="adm-btn is-sm"
                                  disabled={mark.isPending}
                                  onClick={() => {
                                    if (window.confirm("Marcar como reembolsado?"))
                                      mark.mutate({ id: p.id, status: "refunded" });
                                  }}
                                >
                                  Reembolsar
                                </button>
                              )}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
          </>
        )
      )}
    </div>
  );
}

const methodLabel: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  boleto: "Boleto",
  manual: "Outro",
  courtesy: "Cortesia",
};
