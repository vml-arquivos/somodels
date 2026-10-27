import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { AdminScope } from "@shared/admin-access";
import {
  crmNoteKindLabels,
  crmNoteKinds,
  crmStageHints,
  crmStageLabels,
  crmStages,
  ageFromBirthDate,
  type CrmNoteKind,
  type CrmStage,
} from "@shared/admin-crm";
import {
  Avatar,
  Empty,
  ErrorNote,
  Loading,
  Panel,
  Pill,
  brl,
  fmtBirth,
  fmtDate,
  fmtDateTime,
  identityLabel,
  listingStatusLabel,
  paymentTone,
  relativeTime,
  stageTone,
} from "./kit";

type TabKey =
  | "resumo"
  | "dados"
  | "anuncios"
  | "financeiro"
  | "documentos"
  | "notas"
  | "atividade"
  | "conta";

const dayAt = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(9, 0, 0, 0);
  return d;
};

export default function AdvertiserSheet({
  userId,
  scopes,
  onClose,
  onOpenProfile,
  onOpenTab,
}: {
  userId: number;
  scopes: readonly AdminScope[];
  onClose: () => void;
  onOpenProfile: (profileId: number) => void;
  onOpenTab: (path: string) => void;
}) {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<TabKey>("resumo");
  const [noteKind, setNoteKind] = useState<CrmNoteKind>("nota");
  const [noteBody, setNoteBody] = useState("");
  const [noteFollow, setNoteFollow] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [cpf, setCpf] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [payForm, setPayForm] = useState({
    description: "",
    amount: "",
    status: "paid" as "paid" | "pending",
    method: "pix" as "pix" | "card" | "boleto" | "manual" | "courtesy",
    due: "",
  });

  const canWrite = scopes.includes("users:write");
  const canIdentity = scopes.includes("identity");
  const canMoney = scopes.includes("finance:read") || scopes.includes("plans");
  const canPay = scopes.includes("finance:write") || scopes.includes("plans");

  const q = trpc.panel.advertiser.useQuery({ userId });
  const refresh = async () => {
    await Promise.all([
      utils.panel.advertiser.invalidate({ userId }),
      utils.panel.advertisers.invalidate(),
      utils.panel.overview.invalidate(),
    ]);
  };
  const fail = (e: { message: string }) => toast.error(e.message);
  const setStage = trpc.panel.setStage.useMutation({
    onSuccess: refresh,
    onError: fail,
  });
  const setTags = trpc.panel.setTags.useMutation({
    onSuccess: refresh,
    onError: fail,
  });
  const setFollowUp = trpc.panel.setFollowUp.useMutation({
    onSuccess: async () => {
      toast.success("Retorno agendado");
      await refresh();
    },
    onError: fail,
  });
  const addNote = trpc.panel.addNote.useMutation({
    onSuccess: async () => {
      setNoteBody("");
      setNoteFollow("");
      toast.success("Anotação salva");
      await refresh();
    },
    onError: fail,
  });
  const deleteNote = trpc.panel.deleteNote.useMutation({
    onSuccess: refresh,
    onError: fail,
  });
  const reveal = trpc.panel.revealCpf.useMutation({
    onSuccess: r => setCpf(r.cpf),
    onError: fail,
  });
  const markPayment = trpc.panel.markPayment.useMutation({
    onSuccess: async () => {
      toast.success("Pagamento atualizado");
      await refresh();
    },
    onError: fail,
  });
  const record = trpc.admin.recordPayment.useMutation({
    onSuccess: async () => {
      toast.success("Pagamento registrado");
      setPayForm(f => ({ ...f, description: "", amount: "", due: "" }));
      await refresh();
    },
    onError: fail,
  });
  const updateUser = trpc.management.updateUser.useMutation({
    onSuccess: async () => {
      toast.success("Conta atualizada");
      await refresh();
    },
    onError: fail,
  });
  const resetLink = trpc.management.resetLink.useMutation({
    onSuccess: r => setResetUrl(r.url),
    onError: fail,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const d = q.data;
  const a = d?.advertiser;
  const name = a?.fullName || a?.name || a?.email || `Conta ${userId}`;
  const [idLabel, idTone] =
    identityLabel[a?.identityStatus ?? "none"] ?? identityLabel.none;
  const followDue =
    a?.nextFollowUpAt && new Date(a.nextFollowUpAt).getTime() <= Date.now();

  const attention: string[] = [];
  if (a) {
    if (!a.hasPersonal) attention.push("Ainda não preencheu os dados pessoais.");
    if (a.listings === 0) attention.push("Ainda não criou nenhum anúncio.");
    if (a.listings > 0 && a.published === 0)
      attention.push("Tem anúncio, mas nenhum está no ar.");
    if (a.overdue > 0) attention.push("Pagamento atrasado.");
    if (a.identityStatus === "pending")
      attention.push("Verificação de identidade aguardando análise.");
    if (a.identityStatus === "rejected" || a.identityStatus === "expired")
      attention.push("Identidade precisa ser verificada novamente.");
    if (followDue) attention.push("Retorno agendado para hoje ou antes.");
    if (a.accountStatus === "suspended") attention.push("Conta suspensa.");
  }

  const tabs: { key: TabKey; label: string; count?: number; show: boolean }[] = [
    { key: "resumo", label: "Resumo", show: true },
    { key: "dados", label: "Dados", show: true },
    { key: "anuncios", label: "Anúncios", count: d?.listings.length, show: true },
    { key: "financeiro", label: "Financeiro", show: canMoney },
    { key: "documentos", label: "Documentos", show: canIdentity },
    { key: "notas", label: "Anotações", count: d?.notes.length, show: true },
    { key: "atividade", label: "Atividade", show: true },
    { key: "conta", label: "Conta", show: true },
  ];

  const addTag = () => {
    if (!a || !tagDraft.trim()) return;
    setTags.mutate({ userId, tags: [...a.tags, tagDraft.trim()] });
    setTagDraft("");
  };

  return (
    <div
      className="adm-overlay"
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-label={`Ficha de ${name}`}>
        <div className="adm-drawer-head">
          <div className="adm-drawer-top">
            <Avatar name={name} seed={userId} />
            <div>
              <h3>{name}</h3>
              <p className="adm-muted">
                {a?.email} · #{userId}
              </p>
              {a && (
                <div className="adm-chips" style={{ marginTop: 8 }}>
                  <Pill tone={stageTone[a.stage] ?? "mute"}>
                    {crmStageLabels[a.stage]}
                  </Pill>
                  <Pill tone={idTone}>{idLabel}</Pill>
                  {canMoney && a.overdue > 0 && <Pill tone="bad">Pagamento atrasado</Pill>}
                  {a.accountStatus === "suspended" && <Pill tone="bad">Suspensa</Pill>}
                </div>
              )}
            </div>
            <button type="button" className="adm-btn is-sm" onClick={onClose} aria-label="Fechar ficha">
              Fechar
            </button>
          </div>
          <nav className="adm-tabs" aria-label="Seções da ficha" role="tablist">
            {tabs
              .filter(t => t.show)
              .map(t => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  className={tab === t.key ? "is-active" : ""}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {t.count ? <b>{t.count}</b> : null}
                </button>
              ))}
          </nav>
        </div>

        <div className="adm-drawer-body">
          <ErrorNote error={q.error} />
          {q.isLoading && <Loading />}
          {d && a && tab === "resumo" && (
            <>
              {attention.length > 0 && (
                <Panel title="Pontos de atenção">
                  <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                    {attention.map(t => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel title="Acompanhamento">
                <div className="adm-grid is-2">
                  <label className="adm-field">
                    Etapa
                    <select
                      className="adm-select"
                      value={a.stage}
                      disabled={!canWrite || setStage.isPending}
                      onChange={e =>
                        setStage.mutate({ userId, stage: e.target.value as CrmStage })
                      }
                    >
                      {crmStages.map(s => (
                        <option key={s} value={s}>
                          {crmStageLabels[s]}
                        </option>
                      ))}
                    </select>
                    <em>
                      {crmStageHints[a.stage]}
                      {!a.stageIsManual && " (definida automaticamente)"}
                    </em>
                  </label>
                  <div className="adm-field">
                    Próximo retorno
                    <strong style={{ color: followDue ? "var(--a-bad)" : undefined }}>
                      {a.nextFollowUpAt ? fmtDate(a.nextFollowUpAt) : "Nenhum agendado"}
                    </strong>
                    {canWrite && (
                      <span className="adm-chips">
                        <button type="button" className="adm-btn is-sm" onClick={() => setFollowUp.mutate({ userId, at: dayAt(0) })}>
                          Hoje
                        </button>
                        <button type="button" className="adm-btn is-sm" onClick={() => setFollowUp.mutate({ userId, at: dayAt(1) })}>
                          Amanhã
                        </button>
                        <button type="button" className="adm-btn is-sm" onClick={() => setFollowUp.mutate({ userId, at: dayAt(7) })}>
                          Em 7 dias
                        </button>
                        {a.nextFollowUpAt && (
                          <button type="button" className="adm-btn is-sm is-ghost" onClick={() => setFollowUp.mutate({ userId, at: null })}>
                            Limpar
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="adm-field" style={{ marginTop: 14 }}>
                  Etiquetas
                  <div className="adm-tags">
                    {a.tags.map(tag => (
                      <span className="adm-tag" key={tag}>
                        {tag}
                        {canWrite && (
                          <button
                            type="button"
                            aria-label={`Remover ${tag}`}
                            onClick={() =>
                              setTags.mutate({ userId, tags: a.tags.filter(t => t !== tag) })
                            }
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {canWrite && (
                      <input
                        className="adm-tag-input"
                        value={tagDraft}
                        placeholder="+ etiqueta"
                        maxLength={24}
                        onChange={e => setTagDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        onBlur={addTag}
                      />
                    )}
                  </div>
                </div>
              </Panel>
              <Panel title="Em números">
                <dl className="adm-kv">
                  <div>
                    <dt>Cadastro</dt>
                    <dd>{fmtDate(a.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Último acesso</dt>
                    <dd>{a.lastSignedIn ? relativeTime(a.lastSignedIn) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Primeiro anúncio</dt>
                    <dd>{a.firstListingAt ? fmtDate(a.firstListingAt) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Anúncios (no ar / total)</dt>
                    <dd>
                      {a.published} / {a.listings}
                    </dd>
                  </div>
                  <div>
                    <dt>Fotos e vídeos</dt>
                    <dd>
                      {a.mediaCount} nos anúncios · {a.libraryCount} na biblioteca
                    </dd>
                  </div>
                  {canMoney && (
                    <>
                      <div>
                        <dt>Pacote ativo</dt>
                        <dd>
                          {a.planName ? `${a.planName} · até ${fmtDate(a.planEndsAt)}` : "Nenhum"}
                        </dd>
                      </div>
                      <div>
                        <dt>Total já pago</dt>
                        <dd>{brl(a.paidTotalCents)}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </Panel>
            </>
          )}

          {d && a && tab === "dados" && (
            <Panel title="Dados pessoais">
              {d.personal ? (
                <dl className="adm-kv">
                  <div>
                    <dt>Nome completo</dt>
                    <dd>{d.personal.fullName}</dd>
                  </div>
                  <div>
                    <dt>CPF</dt>
                    <dd>
                      {cpf || d.personal.cpfMasked}{" "}
                      {canIdentity && !cpf && (
                        <button
                          type="button"
                          className="adm-btn is-sm"
                          disabled={reveal.isPending}
                          onClick={() => reveal.mutate({ userId })}
                        >
                          Mostrar
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Nascimento</dt>
                    <dd>
                      {fmtBirth(d.personal.birthDate)} ·{" "}
                      {ageFromBirthDate(d.personal.birthDate) ?? "?"} anos
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
                    <dt>CEP</dt>
                    <dd>{d.personal.zipCode || "—"}</dd>
                  </div>
                  <div>
                    <dt>Dados completos em</dt>
                    <dd>{fmtDateTime(d.personal.completedAt)}</dd>
                  </div>
                  <div>
                    <dt>Contrato (termos)</dt>
                    <dd>
                      {d.terms.current
                        ? `Aceito em ${fmtDate(d.terms.acceptedAt)}`
                        : "Pendente"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <Empty
                  title="Dados ainda não preenchidos"
                  text="O anunciante precisa completar nome, CPF e data de nascimento em Dados pessoais."
                />
              )}
              {cpf && <p className="adm-muted" style={{ marginTop: 12 }}>A abertura do CPF foi registrada na auditoria.</p>}
            </Panel>
          )}

          {d && a && tab === "anuncios" && (
            <Panel title="Anúncios">
              {d.listings.length === 0 ? (
                <Empty title="Nenhum anúncio criado" />
              ) : (
                d.listings.map(item => {
                  const [label, tone] = item.isPublished
                    ? (["No ar", "ok"] as const)
                    : (listingStatusLabel[item.status] ?? [item.status, "mute"]);
                  return (
                    <div className="adm-row" key={item.id}>
                      <div>
                        <strong>{item.stageName}</strong>{" "}
                        <Pill tone={tone}>{label}</Pill>
                        <small>
                          {item.city} · {item.photos} fotos · {item.videos} vídeos · criado em{" "}
                          {fmtDate(item.createdAt)}
                        </small>
                        {item.rejectionReason && (
                          <small>Motivo: {item.rejectionReason}</small>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <small>
                          {item.views} visitas · {item.contacts} contatos
                        </small>
                        <button
                          type="button"
                          className="adm-btn is-sm"
                          onClick={() => {
                            onOpenProfile(item.id);
                            onClose();
                          }}
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </Panel>
          )}

          {d && a && tab === "financeiro" && canMoney && (
            <>
              <Panel title="Pacotes">
                {d.subscriptions.length === 0 ? (
                  <p className="adm-muted">Nenhum pacote contratado.</p>
                ) : (
                  d.subscriptions.map(s => (
                    <div className="adm-row" key={s.id}>
                      <div>
                        <strong>{s.planName}</strong>{" "}
                        <Pill
                          tone={
                            s.status === "active"
                              ? "ok"
                              : s.status === "pending"
                                ? "warn"
                                : "mute"
                          }
                        >
                          {s.status === "active"
                            ? "Ativo"
                            : s.status === "pending"
                              ? "Aguardando pagamento"
                              : s.status === "cancelled"
                                ? "Encerrado"
                                : s.status}
                        </Pill>
                        <small>
                          {brl(s.priceCents)}
                          {s.currentPeriodEndsAt && ` · até ${fmtDate(s.currentPeriodEndsAt)}`}
                        </small>
                      </div>
                      <small>{fmtDate(s.createdAt)}</small>
                    </div>
                  ))
                )}
                {scopes.includes("plans") && (
                  <button
                    type="button"
                    className="adm-btn is-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => onOpenTab("/admin/pacotes")}
                  >
                    Ativar ou alterar pacote
                  </button>
                )}
              </Panel>
              <Panel title="Pagamentos">
                {d.payments.length === 0 ? (
                  <p className="adm-muted">Nenhum pagamento registrado.</p>
                ) : (
                  d.payments.map(p => {
                    const [label, tone] = paymentTone[p.bucket] ?? [p.bucket, "mute"];
                    return (
                      <div className="adm-row" key={p.id}>
                        <div>
                          <strong>{brl(p.amountCents)}</strong>{" "}
                          <Pill tone={tone}>{label}</Pill>
                          <small>
                            {p.description}
                            {p.invoiceNumber && ` · ${p.invoiceNumber}`}
                            {p.status === "paid" && p.paidAt
                              ? ` · pago em ${fmtDate(p.paidAt)}`
                              : p.dueAt
                                ? ` · vence em ${fmtDate(p.dueAt)}`
                                : ""}
                          </small>
                        </div>
                        {canPay && p.status === "pending" && (
                          <button
                            type="button"
                            className="adm-btn is-sm is-primary"
                            disabled={markPayment.isPending}
                            onClick={() => markPayment.mutate({ id: p.id, status: "paid" })}
                          >
                            Marcar como pago
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </Panel>
              {canPay && (
                <Panel title="Registrar pagamento">
                  <form
                    className="adm-grid is-2"
                    onSubmit={e => {
                      e.preventDefault();
                      const cents = Math.round(Number(payForm.amount.replace(",", ".")) * 100);
                      if (!Number.isFinite(cents) || cents < 0)
                        return toast.error("Informe um valor válido");
                      record.mutate({
                        userId,
                        description: payForm.description,
                        amountCents: cents,
                        status: payForm.status,
                        method: payForm.method,
                        dueAt: payForm.due ? new Date(`${payForm.due}T12:00:00-03:00`) : undefined,
                      });
                    }}
                  >
                    <label className="adm-field">
                      Descrição
                      <input className="adm-input" required minLength={3} maxLength={200} value={payForm.description} onChange={e => setPayForm({ ...payForm, description: e.target.value })} placeholder="Ex.: Pacote Destaque, outubro" />
                    </label>
                    <label className="adm-field">
                      Valor (R$)
                      <input className="adm-input" required inputMode="decimal" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder="0,00" />
                    </label>
                    <label className="adm-field">
                      Situação
                      <select className="adm-select" value={payForm.status} onChange={e => setPayForm({ ...payForm, status: e.target.value as "paid" | "pending" })}>
                        <option value="paid">Já foi pago</option>
                        <option value="pending">A receber</option>
                      </select>
                    </label>
                    <label className="adm-field">
                      Forma
                      <select className="adm-select" value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value as typeof payForm.method })}>
                        <option value="pix">Pix</option>
                        <option value="card">Cartão</option>
                        <option value="boleto">Boleto</option>
                        <option value="manual">Outro</option>
                        <option value="courtesy">Cortesia</option>
                      </select>
                    </label>
                    {payForm.status === "pending" && (
                      <label className="adm-field">
                        Vencimento
                        <input className="adm-input" type="date" value={payForm.due} onChange={e => setPayForm({ ...payForm, due: e.target.value })} />
                      </label>
                    )}
                    <div style={{ alignSelf: "end" }}>
                      <button type="submit" className="adm-btn is-primary" disabled={record.isPending}>
                        Registrar
                      </button>
                    </div>
                  </form>
                </Panel>
              )}
            </>
          )}

          {d && a && tab === "documentos" && canIdentity && (
            <Panel title="Verificação de identidade">
              {d.verifications.length === 0 ? (
                <Empty
                  title="Nenhum envio"
                  text="O anunciante ainda não mandou documento, selfie ou vídeo."
                />
              ) : (
                d.verifications.map(v => {
                  const [label, tone] = identityLabel[v.status] ?? [v.status, "mute"];
                  return (
                    <div className="adm-row" key={v.id}>
                      <div>
                        <Pill tone={tone}>{label}</Pill>{" "}
                        <small>
                          Enviada em {fmtDateTime(v.createdAt)} · {v.documents} arquivo(s)
                          {v.expiresAt && ` · vale até ${fmtDate(v.expiresAt)}`}
                        </small>
                        {v.reviewReason && <small>Motivo: {v.reviewReason}</small>}
                      </div>
                      {v.status === "pending" && (
                        <button
                          type="button"
                          className="adm-btn is-sm is-primary"
                          onClick={() => onOpenTab(`/admin/verificacoes?v=${v.id}`)}
                        >
                          Analisar
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </Panel>
          )}

          {d && a && tab === "notas" && (
            <>
              {canWrite && (
                <Panel title="Nova anotação">
                  <form
                    className="adm-grid"
                    onSubmit={e => {
                      e.preventDefault();
                      addNote.mutate({
                        userId,
                        kind: noteKind,
                        body: noteBody,
                        followUpAt: noteFollow ? new Date(`${noteFollow}T09:00:00-03:00`) : undefined,
                      });
                    }}
                  >
                    <div className="adm-grid is-2">
                      <label className="adm-field">
                        Tipo
                        <select className="adm-select" value={noteKind} onChange={e => setNoteKind(e.target.value as CrmNoteKind)}>
                          {crmNoteKinds
                            .filter(k => k !== "sistema")
                            .map(k => (
                              <option key={k} value={k}>
                                {crmNoteKindLabels[k]}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="adm-field">
                        Agendar retorno (opcional)
                        <input className="adm-input" type="date" value={noteFollow} onChange={e => setNoteFollow(e.target.value)} />
                      </label>
                    </div>
                    <textarea className="adm-textarea" required minLength={2} maxLength={2000} value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="O que foi conversado ou combinado?" aria-label="Anotação" />
                    <div>
                      <button type="submit" className="adm-btn is-primary" disabled={addNote.isPending || noteBody.trim().length < 2}>
                        Salvar anotação
                      </button>
                    </div>
                  </form>
                </Panel>
              )}
              {d.notes.length === 0 ? (
                <Empty title="Sem anotações" text="Registre ligações, mensagens e combinados com este anunciante." />
              ) : (
                d.notes.map(n => (
                  <article className={`adm-note ${n.kind === "sistema" ? "is-system" : ""}`} key={n.id}>
                    <header>
                      <span>
                        <Pill tone={n.kind === "pedido" ? "warn" : "mute"}>
                          {crmNoteKindLabels[n.kind as CrmNoteKind] ?? n.kind}
                        </Pill>{" "}
                        {n.authorName ?? "Sistema"}
                      </span>
                      <span>
                        {fmtDateTime(n.createdAt)}
                        {canWrite && n.kind !== "sistema" && (
                          <>
                            {" · "}
                            <button
                              type="button"
                              className="adm-btn is-ghost is-sm"
                              onClick={() => {
                                if (window.confirm("Apagar esta anotação?")) deleteNote.mutate({ id: n.id });
                              }}
                            >
                              Apagar
                            </button>
                          </>
                        )}
                      </span>
                    </header>
                    <p>{n.body}</p>
                  </article>
                ))
              )}
            </>
          )}

          {d && a && tab === "atividade" && (
            <Panel title="Atividade da conta">
              {d.activity.length === 0 ? (
                <p className="adm-muted">Nada registrado ainda.</p>
              ) : (
                <ul className="adm-feed">
                  {d.activity.map((item: any) => (
                    <li key={item.id}>
                      <span>{item.label ?? item.action}</span>
                      <small>{relativeTime(item.createdAt)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {d && a && tab === "conta" && (
            <Panel title="Conta de acesso">
              <dl className="adm-kv">
                <div>
                  <dt>Situação</dt>
                  <dd>{a.accountStatus === "active" ? "Ativa" : "Suspensa"}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{a.email}</dd>
                </div>
              </dl>
              {canWrite ? (
                <div className="adm-chips" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className={`adm-btn ${a.accountStatus === "active" ? "is-danger" : ""}`}
                    disabled={updateUser.isPending}
                    onClick={() => {
                      const suspend = a.accountStatus === "active";
                      if (suspend && !window.confirm("Suspender esta conta? Os anúncios saem do ar."))
                        return;
                      updateUser.mutate({
                        id: userId,
                        name: a.name || name,
                        email: a.email || "",
                        role: "user",
                        adminFunction: undefined,
                        accountStatus: suspend ? "suspended" : "active",
                      });
                    }}
                  >
                    {a.accountStatus === "active" ? "Suspender conta" : "Reativar conta"}
                  </button>
                  <button
                    type="button"
                    className="adm-btn"
                    disabled={resetLink.isPending || a.accountStatus !== "active"}
                    onClick={() => resetLink.mutate({ id: userId })}
                  >
                    Gerar link de nova senha
                  </button>
                </div>
              ) : (
                <p className="adm-muted" style={{ marginTop: 12 }}>
                  Sua função não altera contas.
                </p>
              )}
              {resetUrl && (
                <label className="adm-field" style={{ marginTop: 14 }}>
                  Link (vale 30 minutos, envie só para o anunciante)
                  <input className="adm-input" readOnly value={resetUrl} onFocus={e => e.currentTarget.select()} />
                </label>
              )}
            </Panel>
          )}
        </div>
      </aside>
    </div>
  );
}
