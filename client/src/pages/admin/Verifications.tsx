import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { verificationDocKinds, verificationDocLabels } from "@shared/admin-crm";
import {
  Empty,
  ErrorNote,
  Head,
  Loading,
  Panel,
  Pill,
  fmtBirth,
  fmtBytes,
  fmtDate,
  fmtDateTime,
  identityLabel,
  relativeTime,
} from "./kit";

type Status = "pending" | "approved" | "rejected";

export default function Verifications({
  onOpenAdvertiser,
}: {
  onOpenAdvertiser: (userId: number) => void;
}) {
  const utils = trpc.useUtils();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const wanted = Number(new URLSearchParams(search).get("v")) || null;
  const [status, setStatus] = useState<Status>("pending");
  const [selected, setSelected] = useState<number | null>(wanted);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [validity, setValidity] = useState(365);
  const [purge, setPurge] = useState(true);
  const [zoom, setZoom] = useState<string | null>(null);

  const queue = trpc.panel.verificationQueue.useQuery(
    { status },
    { refetchInterval: 45_000 }
  );
  const detail = trpc.panel.verificationDetail.useQuery(
    { id: selected ?? 0 },
    { enabled: Boolean(selected) }
  );
  const decide = trpc.panel.decideVerification.useMutation({
    onSuccess: async (result, vars) => {
      toast.success(
        vars.decision === "approved"
          ? "Identidade aprovada"
          : "Verificação recusada; o anunciante foi avisado no painel dele"
      );
      setSelected(null);
      setChecks({});
      setReason("");
      setLocation("/admin/verificacoes");
      await Promise.all([
        utils.panel.verificationQueue.invalidate(),
        utils.panel.overview.invalidate(),
        utils.management.navigationCounts.invalidate(),
      ]);
    },
    onError: e => toast.error(e.message),
  });

  useEffect(() => {
    setChecks({});
    setReason("");
  }, [selected]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  // Seleciona o primeiro da fila quando nada está aberto (só no computador).
  useEffect(() => {
    if (!selected && queue.data?.length && window.innerWidth >= 1100)
      setSelected(queue.data[0].id);
  }, [queue.data, selected]);

  const d = detail.data;
  const allChecked =
    d && d.checks.every(item => checks[item.key] === true);
  const hasFiles = Boolean(d && d.docs.length > 0);
  const minor = d?.personal?.age !== null && d?.personal?.age !== undefined && d.personal.age < 18;

  return (
    <div className="adm">
      <Head
        title="Verificações"
        subtitle="Confira documento, selfie e vídeo com os dados informados antes de aprovar."
        actions={
          <div className="adm-seg" role="tablist" aria-label="Situação">
            {(
              [
                ["pending", "Pendentes"],
                ["approved", "Aprovadas"],
                ["rejected", "Recusadas"],
              ] as [Status, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={status === key}
                className={status === key ? "is-active" : ""}
                onClick={() => {
                  setStatus(key);
                  setSelected(null);
                }}
              >
                {label}
                {key === "pending" && queue.data && status === "pending"
                  ? ` (${queue.data.length})`
                  : ""}
              </button>
            ))}
          </div>
        }
      />
      <ErrorNote error={queue.error} />

      <div className="adm-verify">
        <div className="adm-queue" aria-label="Fila">
          {queue.isLoading ? (
            <Loading />
          ) : !queue.data?.length ? (
            <div className="adm-panel">
              <Empty
                title={
                  status === "pending" ? "Fila vazia" : "Nada por aqui"
                }
                text={
                  status === "pending"
                    ? "Nenhuma verificação aguardando análise."
                    : undefined
                }
              />
            </div>
          ) : (
            queue.data.map(item => (
              <button
                key={item.id}
                type="button"
                className={selected === item.id ? "is-active" : ""}
                onClick={() => setSelected(item.id)}
              >
                <strong>{item.fullName || item.userName || item.userEmail}</strong>
                <small>
                  {item.age !== null ? `${item.age} anos · ` : ""}
                  {item.documents} arquivo(s)
                  {item.hasVideo ? " · com vídeo" : ""}
                </small>
                <small>Enviada {relativeTime(item.createdAt)}</small>
              </button>
            ))
          )}
        </div>

        <div className="adm" style={{ gap: 16 }}>
          {!selected ? (
            <div className="adm-panel">
              <Empty
                title="Escolha uma verificação"
                text="Os dados informados e os arquivos aparecem aqui lado a lado."
              />
            </div>
          ) : detail.isLoading ? (
            <Loading />
          ) : !d ? (
            <ErrorNote error={detail.error ?? { message: "Não encontrada" }} />
          ) : (
            <>
              <Panel
                title={d.personal?.fullName || d.account.name || "Sem nome"}
                action={
                  <button
                    type="button"
                    className="adm-btn is-sm"
                    onClick={() => onOpenAdvertiser(d.userId)}
                  >
                    Abrir ficha
                  </button>
                }
              >
                {d.personal ? (
                  <dl className="adm-kv">
                    <div>
                      <dt>Nome informado</dt>
                      <dd>{d.personal.fullName}</dd>
                    </div>
                    <div>
                      <dt>CPF</dt>
                      <dd>{d.personal.cpfMasked}</dd>
                    </div>
                    <div>
                      <dt>Data de nascimento</dt>
                      <dd>
                        {fmtBirth(d.personal.birthDate)}{" "}
                        {d.personal.age !== null && (
                          <Pill tone={d.personal.age >= 18 ? "ok" : "bad"}>
                            {d.personal.age} anos
                          </Pill>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Telefone</dt>
                      <dd>{d.personal.phone || "—"}</dd>
                    </div>
                    <div>
                      <dt>Cidade</dt>
                      <dd>
                        {[d.personal.city, d.personal.state].filter(Boolean).join(" / ") || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Conta</dt>
                      <dd>{d.account.email}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="adm-error">
                    Este anunciante ainda não preencheu os dados pessoais.
                  </p>
                )}
                {minor && (
                  <p className="adm-error" style={{ marginTop: 12 }}>
                    A data de nascimento informada indica menos de 18 anos. Não aprove.
                  </p>
                )}
              </Panel>

              <Panel
                title="Arquivos enviados"
                action={
                  <Pill tone={(identityLabel[d.status] ?? identityLabel.none)[1]}>
                    {(identityLabel[d.status] ?? identityLabel.none)[0]}
                  </Pill>
                }
              >
                <div className="adm-docs">
                  {verificationDocKinds.map(kind => {
                    const doc = d.docs.find(x => x.kind === kind);
                    if (!doc)
                      return (
                        <div className="adm-doc is-missing" key={kind}>
                          {verificationDocLabels[kind]}
                          <br />
                          não enviado
                        </div>
                      );
                    const url = `/api/verification-doc/${doc.id}`;
                    return (
                      <figure className="adm-doc" key={kind} style={{ margin: 0 }}>
                        {doc.isVideo ? (
                          <video src={url} controls preload="metadata" playsInline />
                        ) : (
                          <img
                            src={url}
                            alt={doc.label}
                            loading="lazy"
                            style={{ cursor: "zoom-in" }}
                            onClick={() => setZoom(url)}
                          />
                        )}
                        <figcaption>
                          <span>{doc.label}</span>
                          <span className="adm-muted">{fmtBytes(doc.sizeBytes)}</span>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
                {!hasFiles && d.status === "pending" && (
                  <p className="adm-muted" style={{ marginTop: 12 }}>
                    Solicitação antiga, sem arquivos. Peça ao anunciante que envie documento e selfie
                    ou vídeo em Dados pessoais antes de aprovar.
                  </p>
                )}
                {hasFiles && (
                  <p className="adm-muted" style={{ marginTop: 12 }}>
                    Cada abertura de arquivo fica registrada na auditoria.
                  </p>
                )}
              </Panel>

              {d.status === "pending" ? (
                <Panel title="Conferência">
                  <div className="adm-checks">
                    {d.checks.map(item => (
                      <label key={item.key}>
                        <input
                          type="checkbox"
                          checked={checks[item.key] === true}
                          onChange={e =>
                            setChecks(c => ({ ...c, [item.key]: e.target.checked }))
                          }
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="adm-grid is-2" style={{ marginTop: 16 }}>
                    <label className="adm-field">
                      Validade da aprovação
                      <select
                        className="adm-select"
                        value={validity}
                        onChange={e => setValidity(Number(e.target.value))}
                      >
                        <option value={90}>90 dias</option>
                        <option value={180}>6 meses</option>
                        <option value={365}>1 ano</option>
                        <option value={730}>2 anos</option>
                      </select>
                    </label>
                    <label className="adm-field" style={{ alignContent: "end" }}>
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={purge}
                          onChange={e => setPurge(e.target.checked)}
                        />
                        Apagar os arquivos depois de aprovar (recomendado)
                      </span>
                    </label>
                  </div>
                  <label className="adm-field" style={{ marginTop: 14 }}>
                    Motivo (obrigatório para recusar)
                    <textarea
                      className="adm-textarea"
                      maxLength={500}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Ex.: A selfie está sem o documento visível."
                    />
                  </label>
                  <div className="adm-chips" style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      className="adm-btn is-primary"
                      disabled={!allChecked || minor || decide.isPending}
                      onClick={() =>
                        decide.mutate({
                          id: d.id,
                          decision: "approved",
                          checks,
                          reason: reason || undefined,
                          validityDays: validity,
                          purgeFiles: purge,
                        })
                      }
                    >
                      Aprovar identidade
                    </button>
                    <button
                      type="button"
                      className="adm-btn is-danger"
                      disabled={reason.trim().length < 3 || decide.isPending}
                      onClick={() =>
                        decide.mutate({
                          id: d.id,
                          decision: "rejected",
                          checks,
                          reason,
                        })
                      }
                    >
                      Recusar
                    </button>
                  </div>
                  {!allChecked && (
                    <p className="adm-muted" style={{ marginTop: 10 }}>
                      Marque todos os itens da conferência para liberar a aprovação.
                    </p>
                  )}
                </Panel>
              ) : (
                <Panel title="Decisão">
                  <dl className="adm-kv">
                    <div>
                      <dt>Enviada em</dt>
                      <dd>{fmtDateTime(d.createdAt)}</dd>
                    </div>
                    {d.approvedAt && (
                      <div>
                        <dt>Aprovada em</dt>
                        <dd>{fmtDate(d.approvedAt)}</dd>
                      </div>
                    )}
                    {d.expiresAt && (
                      <div>
                        <dt>Vale até</dt>
                        <dd>{fmtDate(d.expiresAt)}</dd>
                      </div>
                    )}
                    {d.reviewReason && (
                      <div>
                        <dt>Motivo</dt>
                        <dd>{d.reviewReason}</dd>
                      </div>
                    )}
                  </dl>
                </Panel>
              )}
            </>
          )}
        </div>
      </div>

      {zoom && (
        <div
          className="adm-zoom"
          role="dialog"
          aria-label="Documento ampliado"
          onClick={() => setZoom(null)}
        >
          <img src={zoom} alt="Documento ampliado" />
        </div>
      )}
    </div>
  );
}
