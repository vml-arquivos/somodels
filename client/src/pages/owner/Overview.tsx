import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { portfolioPublicationLabel } from "@shared/portfolio";
import {
  Badge,
  Bars,
  Card,
  Delta,
  Empty,
  ErrorBlock,
  Kpi,
  LoadingBlock,
  OIcon,
  PageHead,
  brl,
  fmtDate,
  listingTone,
} from "./ui";

const planPeriod: Record<string, string> = {
  monthly: "mês",
  quarterly: "trimestre",
  yearly: "ano",
};

export default function Overview({ firstName }: { firstName: string }) {
  const overview = trpc.owner.overview.useQuery();
  const data = overview.data;

  if (overview.isLoading) return <LoadingBlock />;
  if (overview.error || !data)
    return (
      <ErrorBlock message={overview.error?.message || "Erro ao carregar"} />
    );

  const doneSteps = data.steps.filter(step => step.done).length;
  const allDone = doneSteps === data.steps.length;
  const alerts: {
    tone: "warn" | "bad";
    text: string;
    href: string;
    cta: string;
  }[] = [];
  if (!data.personal.complete)
    alerts.push({
      tone: "warn",
      text: "Seus dados pessoais ainda não foram preenchidos. Eles são necessários para publicar anúncios.",
      href: "/titular/dados",
      cta: "Preencher dados",
    });
  if (!data.terms.current)
    alerts.push({
      tone: "warn",
      text: "Você ainda não aceitou os termos da conta atual.",
      href: "/titular/contrato",
      cta: "Ver contrato",
    });
  const suspended = data.listings.filter(l => l.status === "suspended");
  if (suspended.length)
    alerts.push({
      tone: "bad",
      text: `${suspended.length === 1 ? "Um anúncio está suspenso" : `${suspended.length} anúncios estão suspensos`}. Veja o motivo e corrija.`,
      href: `/titular/anuncios?profileId=${suspended[0].id}`,
      cta: "Ver anúncio",
    });
  if (data.media.pending > 0)
    alerts.push({
      tone: "warn",
      text: `${data.media.pending} arquivo${data.media.pending === 1 ? "" : "s"} em análise nos seus anúncios.`,
      href: "/titular/anuncios",
      cta: "Ver anúncios",
    });
  if (data.identityStatus === "rejected" || data.identityStatus === "expired")
    alerts.push({
      tone: "bad",
      text: "Sua verificação de identidade precisa ser refeita.",
      href: "/titular/dados",
      cta: "Verificar agora",
    });

  return (
    <>
      <PageHead
        title={`Olá, ${firstName}`}
        subtitle="Resumo da sua conta, dos seus anúncios e do desempenho nos últimos 30 dias."
        actions={
          <Link className="od-btn is-primary" href="/titular/anuncios?novo=1">
            <OIcon name="plus" size={18} /> Novo anúncio
          </Link>
        }
      />

      {alerts.length > 0 && (
        <div className="od-alerts">
          {alerts.map(alert => (
            <div key={alert.text} className={`od-alert is-${alert.tone}`}>
              <OIcon name="alert" />
              <p>{alert.text}</p>
              <Link href={alert.href}>{alert.cta}</Link>
            </div>
          ))}
        </div>
      )}

      {!allDone && (
        <Card
          kicker="Primeiros passos"
          title={`${doneSteps} de ${data.steps.length} etapas concluídas`}
          className="od-onboarding"
        >
          <div
            className="od-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={data.steps.length}
            aria-valuenow={doneSteps}
          >
            <span
              style={{ width: `${(doneSteps / data.steps.length) * 100}%` }}
            />
          </div>
          <ol className="od-steps">
            {data.steps.map(step => (
              <li key={step.key} className={step.done ? "is-done" : ""}>
                <span className="od-step-mark">
                  {step.done ? <OIcon name="check" size={16} /> : null}
                </span>
                {step.done ? (
                  <span>{step.label}</span>
                ) : (
                  <Link href={step.href}>{step.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="od-kpis">
        <Kpi
          icon="list"
          label="Anúncios no ar"
          value={`${data.summary.published}/${data.summary.total}`}
          foot={
            data.summary.drafts
              ? `${data.summary.drafts} rascunho${data.summary.drafts === 1 ? "" : "s"}`
              : "publicados / total"
          }
        />
        <Kpi
          icon="image"
          label="Fotos e vídeos"
          value={data.media.approvedPhotos + data.media.videos}
          foot={`${data.media.library} na biblioteca`}
        />
        <Kpi
          icon="eye"
          label="Visitas (30 dias)"
          value={data.stats.views}
          foot={
            <Delta current={data.stats.views} previous={data.stats.prevViews} />
          }
        />
        <Kpi
          icon="chat"
          label="Contatos (30 dias)"
          value={data.stats.contacts}
          foot={
            <Delta
              current={data.stats.contacts}
              previous={data.stats.prevContacts}
            />
          }
        />
      </div>

      <div className="od-grid-2">
        <Card kicker="Desempenho" title="Visitas e contatos por dia">
          <Bars data={data.stats.daily} />
        </Card>
        <div className="od-stack">
          <Card
            kicker="Plano"
            title={data.plan ? data.plan.planName : "Plano gratuito"}
          >
            {data.plan ? (
              <>
                <p className="od-big">
                  {brl(data.plan.priceCents)}
                  <small>
                    {" "}
                    / {planPeriod[data.plan.billingPeriod] || "período"}
                  </small>
                </p>
                <p className="od-muted">
                  {data.plan.currentPeriodEndsAt
                    ? `Válido até ${fmtDate(data.plan.currentPeriodEndsAt)}`
                    : "Sem data de término"}
                </p>
              </>
            ) : (
              <p className="od-muted">
                Você pode anunciar sem custo por enquanto. Quando houver
                cobrança, avisaremos com antecedência.
              </p>
            )}
            <Link className="od-link" href="/titular/plano">
              Plano e pagamentos →
            </Link>
          </Card>
          <Card
            kicker="Último pagamento"
            title={
              data.lastPayment
                ? brl(data.lastPayment.amountCents)
                : "Sem cobranças"
            }
          >
            {data.lastPayment ? (
              <p className="od-muted">
                {data.lastPayment.description} ·{" "}
                {fmtDate(data.lastPayment.paidAt || data.lastPayment.createdAt)}
              </p>
            ) : (
              <p className="od-muted">
                Nenhuma cobrança até agora. Seu histórico aparecerá aqui.
              </p>
            )}
          </Card>
        </div>
      </div>

      <Card
        kicker="Anúncios"
        title="Seus anúncios"
        action={
          <Link className="od-link" href="/titular/anuncios">
            Gerenciar todos →
          </Link>
        }
      >
        {data.listings.length === 0 ? (
          <Empty
            icon="list"
            title="Você ainda não tem anúncios"
            text="Crie seu primeiro anúncio em poucos minutos. Você pode escolher fotos já guardadas na sua biblioteca."
            action={
              <Link
                className="od-btn is-primary"
                href="/titular/anuncios?novo=1"
              >
                Criar primeiro anúncio
              </Link>
            }
          />
        ) : (
          <>
            <ul className="od-mini-list">
              {data.listings.map(row => (
                <li key={row.id}>
                  <Link href={`/titular/anuncios?profileId=${row.id}`}>
                    <span className="od-thumb">
                      {row.avatarUrl ? (
                        <img src={row.avatarUrl} alt="" loading="lazy" />
                      ) : (
                        <OIcon name="user" />
                      )}
                    </span>
                    <span className="od-mini-text">
                      <strong>{row.stageName}</strong>
                      <small>
                        {row.photos} fotos · {row.views} visitas ·{" "}
                        {row.contacts} contatos
                      </small>
                    </span>
                    <Badge tone={listingTone(row)}>
                      {row.isPublished ? "No ar" : "Rascunho"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="od-table-wrap od-desktop-only">
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Anúncio</th>
                    <th>Situação</th>
                    <th className="num">Fotos</th>
                    <th className="num">Vídeos</th>
                    <th className="num">Visitas</th>
                    <th className="num">Contatos</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.listings.map(row => (
                    <tr key={row.id}>
                      <td>
                        <div className="od-who">
                          <span className="od-thumb">
                            {row.avatarUrl ? (
                              <img src={row.avatarUrl} alt="" loading="lazy" />
                            ) : (
                              <OIcon name="user" />
                            )}
                          </span>
                          <div>
                            <strong>{row.stageName}</strong>
                            <small>{row.city}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={listingTone(row)}>
                          {portfolioPublicationLabel({
                            status: row.status as any,
                            isPublished: row.isPublished,
                            portfolioReviewed: row.isPublished,
                          })}
                        </Badge>
                      </td>
                      <td className="num">{row.photos}</td>
                      <td className="num">{row.videos}</td>
                      <td className="num">{row.views}</td>
                      <td className="num">{row.contacts}</td>
                      <td className="act">
                        <Link
                          className="od-link"
                          href={`/titular/anuncios?profileId=${row.id}`}
                        >
                          Gerenciar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
