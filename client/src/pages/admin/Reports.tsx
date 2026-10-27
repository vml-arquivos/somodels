import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { AdminScope } from "@shared/admin-access";
import {
  DayBars,
  Empty,
  ErrorNote,
  Head,
  Kpi,
  Loading,
  downloadHref,
} from "./kit";

type Kind = "advertisers" | "listings" | "payments" | "verifications";

const kinds: { key: Kind; label: string; hint: string; need: AdminScope[] }[] = [
  {
    key: "advertisers",
    label: "Quem anunciou",
    hint: "Cadastros, primeiro anúncio e situação de cada anunciante",
    need: ["users:read"],
  },
  {
    key: "listings",
    label: "Anúncios criados",
    hint: "Quando cada anúncio foi criado, por quem e como está",
    need: ["profiles:read", "moderation"],
  },
  {
    key: "payments",
    label: "Pagamentos",
    hint: "Pago, aguardando, atrasado e reembolsado",
    need: ["finance:read", "plans"],
  },
  {
    key: "verifications",
    label: "Verificações",
    hint: "Documentos enviados, aprovados e recusados",
    need: ["identity"],
  },
];

const presets = [
  { key: "7", label: "7 dias", days: 7 },
  { key: "30", label: "30 dias", days: 30 },
  { key: "90", label: "90 dias", days: 90 },
  { key: "365", label: "12 meses", days: 365 },
  { key: "custom", label: "Escolher datas", days: 0 },
];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export default function Reports({ scopes }: { scopes: readonly AdminScope[] }) {
  const available = kinds.filter(k => k.need.some(s => scopes.includes(s)));
  const [kind, setKind] = useState<Kind>(available[0]?.key ?? "advertisers");
  const [preset, setPreset] = useState("30");
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(isoDay(new Date()));
  const [showAll, setShowAll] = useState(false);

  const custom = preset === "custom";
  const days = presets.find(p => p.key === preset)?.days || 30;
  const query = trpc.panel.report.useQuery(
    custom ? { kind, from, to } : { kind, days },
    { enabled: available.some(k => k.key === kind) }
  );
  const r = query.data;
  const csv = downloadHref(kind, custom ? { from, to } : { days });
  const rows = r ? (showAll ? r.rows : r.rows.slice(0, 50)) : [];

  if (!available.length)
    return (
      <div className="adm">
        <Head title="Relatórios" />
        <div className="adm-panel">
          <Empty title="Sem relatórios para a sua função" />
        </div>
      </div>
    );

  return (
    <div className="adm">
      <Head
        title="Relatórios"
        subtitle="Escolha o assunto e o período. Baixe em CSV para abrir no Excel."
        actions={
          <a className="adm-btn is-primary" href={csv}>
            Baixar CSV
          </a>
        }
      />

      <div className="adm-seg" role="tablist" aria-label="Relatório">
        {available.map(k => (
          <button
            key={k.key}
            type="button"
            role="tab"
            aria-selected={kind === k.key}
            className={kind === k.key ? "is-active" : ""}
            onClick={() => {
              setKind(k.key);
              setShowAll(false);
            }}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="adm-muted">{kinds.find(k => k.key === kind)?.hint}</p>

      <div className="adm-toolbar">
        <div className="adm-seg" role="group" aria-label="Período">
          {presets.map(p => (
            <button
              key={p.key}
              type="button"
              className={preset === p.key ? "is-active" : ""}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {custom && (
          <>
            <label className="adm-field">
              De
              <input className="adm-input" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} />
            </label>
            <label className="adm-field">
              Até
              <input className="adm-input" type="date" value={to} min={from} max={isoDay(new Date())} onChange={e => setTo(e.target.value)} />
            </label>
          </>
        )}
      </div>

      <ErrorNote error={query.error} />
      {query.isLoading ? (
        <Loading />
      ) : (
        r && (
          <>
            <div className="adm-kpis">
              {r.summary.map(item => (
                <Kpi key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
            <section className="adm-panel">
              <div className="adm-panel-head">
                <h3>{r.title} por dia</h3>
                <span className="adm-muted">
                  {r.from.split("-").reverse().join("/")} a {r.to.split("-").reverse().join("/")}
                </span>
              </div>
              <DayBars
                a={kind === "payments" ? "Recebido" : "Quantidade"}
                money={kind === "payments"}
                data={r.series.map(s => ({ date: s.date, a: s.value }))}
              />
            </section>
            {r.rows.length === 0 ? (
              <div className="adm-panel">
                <Empty title="Nada neste período" text="Tente um período maior." />
              </div>
            ) : (
              <>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        {r.columns.map(c => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{cell === null || cell === "" ? "—" : cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="adm-pager">
                  <span>
                    Mostrando {rows.length} de {r.rows.length}
                    {r.truncated ? " (limite de 5.000 linhas; o CSV segue o mesmo limite)" : ""}
                  </span>
                  {r.rows.length > 50 && (
                    <button type="button" className="adm-btn is-sm" onClick={() => setShowAll(v => !v)}>
                      {showAll ? "Mostrar menos" : "Mostrar todas"}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}
