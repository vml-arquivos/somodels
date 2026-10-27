import type { ReactNode } from "react";
import { Link } from "wouter";

const iconPaths = {
  home: "M4 11 12 4l8 7v9h-5v-6H9v6H4z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5h.01",
  card: "M3 6h18v12H3zM3 10h18M7 15h3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.5-6 8-6s8 2 8 6",
  file: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5 10 17.5 19 7.5",
  alert: "M12 4 3 20h18zM12 10v4M12 17h.01",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  chat: "M4 5h16v11H9l-5 4z",
  video: "M3 7h11v10H3zM14 11l7-4v10l-7-4",
  upload: "M12 16V5M7.5 9.5 12 5l4.5 4.5M5 19h14",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  shield: "M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3z",
  print: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  logout: "M10 4H4v16h6M15 8l4 4-4 4M19 12H9",
  site: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
} as const;

export type OIconName = keyof typeof iconPaths;

export function OIcon({ name, size = 20 }: { name: OIconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

export const brl = (cents: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (cents ?? 0) / 100
  );

export const fmtDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

export const fmtDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export const fmtBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
};

export const fmtBirth = (iso: string | null | undefined) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
};

export function relativeTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "agora há pouco";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  return fmtDate(value);
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="od-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="od-head-actions">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  kicker,
  action,
  children,
  className = "",
}: {
  title?: string;
  kicker?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`od-card ${className}`}>
      {(title || action) && (
        <div className="od-card-head">
          <div>
            {kicker && <p className="od-kicker">{kicker}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: OIconName;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="od-empty">
      <span className="od-empty-icon">
        <OIcon name={icon} size={26} />
      </span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export type Tone = "ok" | "warn" | "bad" | "info" | "mute";

export function Badge({
  tone = "mute",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return <span className={`od-badge is-${tone}`}>{children}</span>;
}

export function listingTone(row: {
  status?: string;
  isPublished?: boolean;
}): Tone {
  if (row.isPublished) return "ok";
  if (row.status === "suspended" || row.status === "rejected") return "bad";
  if (row.status === "pending") return "warn";
  return "mute";
}

export function Delta({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current === 0)
    return <span className="od-delta">sem dados no período</span>;
  if (previous === 0)
    return <span className="od-delta is-up">novo período</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  return (
    <span className={`od-delta ${pct >= 0 ? "is-up" : "is-down"}`}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% vs. 30 dias antes
    </span>
  );
}

export function Kpi({
  icon,
  label,
  value,
  foot,
}: {
  icon: OIconName;
  label: string;
  value: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <div className="od-kpi">
      <span className="od-kpi-icon">
        <OIcon name={icon} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {foot && <small>{foot}</small>}
      </div>
    </div>
  );
}

export function Bars({
  data,
}: {
  data: { date: string; views: number; contacts: number }[];
}) {
  const max = Math.max(1, ...data.map(d => d.views));
  const total = data.reduce((sum, d) => sum + d.views + d.contacts, 0);
  const first = data[0]?.date.split("-").reverse().slice(0, 2).join("/");
  const last = data[data.length - 1]?.date
    .split("-")
    .reverse()
    .slice(0, 2)
    .join("/");
  return (
    <div>
      <div
        className="od-bars"
        role="img"
        aria-label="Visitas e contatos por dia nos últimos 30 dias"
      >
        {data.map(d => (
          <span
            key={d.date}
            className="od-bar"
            title={`${d.date.split("-").reverse().join("/")}: ${d.views} visitas, ${d.contacts} contatos`}
          >
            <i
              className="od-bar-views"
              style={{ height: `${Math.max(3, (d.views / max) * 100)}%` }}
            >
              {d.contacts > 0 && (
                <b
                  className="od-bar-contacts"
                  style={{
                    height: `${Math.min(100, (d.contacts / Math.max(1, d.views)) * 100)}%`,
                  }}
                />
              )}
            </i>
          </span>
        ))}
      </div>
      <div className="od-bars-axis">
        <span>{first}</span>
        <span>{last}</span>
      </div>
      <div className="od-legend">
        <span>
          <i className="is-views" /> Visitas
        </span>
        <span>
          <i className="is-contacts" /> Contatos
        </span>
        {total === 0 && <em>Ainda sem visitas neste período.</em>}
      </div>
    </div>
  );
}

export function InlineLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="od-link" href={href}>
      {children}
    </Link>
  );
}

export function LoadingBlock({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="od-loading" role="status">
      <span className="od-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <p className="od-error" role="alert">
      {message}
    </p>
  );
}
