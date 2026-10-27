import type { ReactNode } from "react";
import {
  brl,
  fmtBirth,
  fmtBytes,
  fmtDate,
  fmtDateTime,
  relativeTime,
} from "../owner/ui";

export { brl, fmtBirth, fmtBytes, fmtDate, fmtDateTime, relativeTime };

export type PillTone = "ok" | "warn" | "bad" | "info" | "mute";

export function Pill({
  tone = "mute",
  children,
}: {
  tone?: PillTone;
  children: ReactNode;
}) {
  return <span className={`adm-pill is-${tone}`}>{children}</span>;
}

export function Head({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="adm-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="adm-head-actions">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`adm-panel ${className}`}>
      {(title || action) && (
        <div className="adm-panel-head">
          {title && <h3>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  foot,
  alert = false,
}: {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={`adm-kpi ${alert ? "is-alert" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {foot && <small>{foot}</small>}
    </div>
  );
}

export function Trend({
  current,
  previous,
  suffix = "vs. 30 dias antes",
}: {
  current: number;
  previous: number;
  suffix?: string;
}) {
  if (!current && !previous) return <>sem dados no período</>;
  if (!previous) return <span className="adm-up">novo período</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  return (
    <span className={pct >= 0 ? "adm-up" : "adm-down"}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% {suffix}
    </span>
  );
}

export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="adm-empty">
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="adm-loading" role="status">
      {label}
    </div>
  );
}

export function ErrorNote({ error }: { error?: { message: string } | null }) {
  return error ? (
    <p className="adm-error" role="alert">
      {error.message}
    </p>
  ) : null;
}

export function Pager({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="adm-pager">
      <span>
        {from}–{to} de {total}
      </span>
      <span className="adm-head-actions">
        <button
          type="button"
          className="adm-btn is-sm"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <span>
          {page + 1} / {pages}
        </span>
        <button
          type="button"
          className="adm-btn is-sm"
          disabled={page + 1 >= pages}
          onClick={() => onPage(page + 1)}
        >
          Próxima
        </button>
      </span>
    </div>
  );
}

const hues = [340, 20, 160, 200, 260, 290, 45, 120];
export function Avatar({ name, seed }: { name: string; seed: number }) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  const text = ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
  return (
    <span
      className="adm-avatar"
      aria-hidden="true"
      style={{ background: `hsl(${hues[seed % hues.length]} 42% 38%)` }}
    >
      {text}
    </span>
  );
}

/** Barras agrupadas (até duas séries) por dia, em SVG. */
export function DayBars({
  data,
  a,
  b,
  labels,
  money = false,
}: {
  data: { date: string; a: number; b?: number }[];
  a: string;
  b?: string;
  labels?: boolean;
  money?: boolean;
}) {
  const max = Math.max(1, ...data.map(d => Math.max(d.a, d.b ?? 0)));
  const w = 600;
  const h = 150;
  const base = h - 20;
  const slot = w / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(14, slot * (b ? 0.36 : 0.62)));
  const short = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
  const fmt = (n: number) => (money ? brl(Math.round(n * 100)) : String(n));
  return (
    <div>
      <svg
        className="adm-chart"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${a}${b ? ` e ${b}` : ""} por dia`}
      >
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line
            key={f}
            className="grid"
            x1="0"
            x2={w}
            y1={base - (base - 6) * f}
            y2={base - (base - 6) * f}
          />
        ))}
        {data.map((d, i) => {
          const x = i * slot + slot / 2;
          const ha = (d.a / max) * (base - 6);
          const hb = ((d.b ?? 0) / max) * (base - 6);
          return (
            <g key={d.date}>
              <title>{`${short(d.date)} · ${a}: ${fmt(d.a)}${b ? ` · ${b}: ${fmt(d.b ?? 0)}` : ""}`}</title>
              <rect
                className="bar-a"
                x={b ? x - barW - 1 : x - barW / 2}
                y={base - Math.max(d.a > 0 ? 2 : 0, ha)}
                width={barW}
                height={Math.max(d.a > 0 ? 2 : 0, ha)}
                rx="2"
              />
              {b && (
                <rect
                  className="bar-b"
                  x={x + 1}
                  y={base - Math.max((d.b ?? 0) > 0 ? 2 : 0, hb)}
                  width={barW}
                  height={Math.max((d.b ?? 0) > 0 ? 2 : 0, hb)}
                  rx="2"
                />
              )}
            </g>
          );
        })}
      </svg>
      {labels !== false && data.length > 1 && (
        <div className="adm-axis">
          <span>{short(data[0].date)}</span>
          <span>{short(data[data.length - 1].date)}</span>
        </div>
      )}
      <div className="adm-legend">
        <span>
          <i style={{ background: "var(--s-accent)" }} />
          {a}
        </span>
        {b && (
          <span>
            <i
              style={{
                background: "color-mix(in srgb, var(--s-accent) 35%, var(--s-panel))",
              }}
            />
            {b}
          </span>
        )}
      </div>
    </div>
  );
}

export function Rank({
  items,
}: {
  items: { label: string; total: number }[];
}) {
  const max = Math.max(1, ...items.map(i => i.total));
  if (!items.length) return <p className="adm-muted">Sem dados ainda.</p>;
  return (
    <ul className="adm-rank">
      {items.map(item => (
        <li key={item.label}>
          <div>
            <span>{item.label}</span>
            <strong>{item.total}</strong>
          </div>
          <i style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }} />
        </li>
      ))}
    </ul>
  );
}

export const stageTone: Record<string, PillTone> = {
  novo: "info",
  contato: "info",
  negociacao: "warn",
  ativo: "ok",
  atencao: "bad",
  inativo: "mute",
  perdido: "mute",
};

export const identityLabel: Record<string, [string, PillTone]> = {
  approved: ["Verificado", "ok"],
  pending: ["Em análise", "warn"],
  rejected: ["Recusado", "bad"],
  expired: ["Vencida", "bad"],
  error: ["Com erro", "bad"],
  none: ["Não enviada", "mute"],
};

export const paymentTone: Record<string, [string, PillTone]> = {
  paid: ["Pago", "ok"],
  pending: ["Aguardando", "warn"],
  overdue: ["Atrasado", "bad"],
  failed: ["Falhou", "bad"],
  refunded: ["Reembolsado", "info"],
  cancelled: ["Cancelado", "mute"],
};

export const listingStatusLabel: Record<string, [string, PillTone]> = {
  approved: ["Aprovado", "ok"],
  pending: ["Em análise", "warn"],
  draft: ["Rascunho", "mute"],
  rejected: ["Recusado", "bad"],
  suspended: ["Suspenso", "bad"],
};

export function downloadHref(
  kind: string,
  range: { from?: string; to?: string; days?: number }
) {
  const q = new URLSearchParams();
  if (range.from) q.set("from", range.from);
  if (range.to) q.set("to", range.to);
  if (!range.from && !range.to && range.days) q.set("days", String(range.days));
  const s = q.toString();
  return `/api/admin/export/${kind}.csv${s ? `?${s}` : ""}`;
}
