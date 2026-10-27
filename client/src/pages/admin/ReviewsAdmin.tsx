import { useEffect, useState } from "react";
import { toast } from "sonner";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import {
  reviewKindLabels,
  reviewKinds,
  reviewStatusLabels,
  type ReviewKind,
  type ReviewStatus,
} from "@shared/reviews";
import {
  Empty,
  ErrorNote,
  Head,
  Loading,
  Pager,
  Panel,
  Pill,
  fmtDateTime,
  type PillTone,
} from "./kit";

type Filter = ReviewStatus | "flagged" | "all";

const filters: [Filter, string][] = [
  ["pending", "Aguardando"],
  ["flagged", "Contestadas"],
  ["approved", "Publicadas"],
  ["rejected", "Recusadas"],
  ["hidden", "Ocultas"],
  ["all", "Todas"],
];

const statusTone: Record<string, PillTone> = {
  pending: "warn",
  approved: "ok",
  rejected: "bad",
  hidden: "mute",
};

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

type Row = {
  id: number;
  profileId: number;
  stageName: string;
  slug: string;
  authorName: string;
  rating: number;
  kind: string;
  title: string | null;
  body: string;
  status: string;
  ownerReply: string | null;
  ownerFlaggedAt: string | Date | null;
  moderationNote: string | null;
  createdAt: string | Date;
};

function ReviewCard({
  row,
  onDecide,
  onClearReply,
  busy,
}: {
  row: Row;
  onDecide: (id: number, status: ReviewStatus, note: string) => void;
  onClearReply: (id: number) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState("");
  const kind = (reviewKinds as readonly string[]).includes(row.kind)
    ? (row.kind as ReviewKind)
    : "comentario";
  const status = row.status as ReviewStatus;
  return (
    <article className="adm-panel adm-review">
      <div className="adm-review-head">
        <div>
          <strong>
            <span className="adm-stars" aria-label={`Nota ${row.rating} de 5`}>
              {stars(row.rating)}
            </span>{" "}
            {row.title || reviewKindLabels[kind]}
          </strong>
          <small>
            {row.authorName} sobre{" "}
            <a href={`/perfil/${row.slug}#avaliacoes`} target="_blank" rel="noreferrer">
              {row.stageName}
            </a>{" "}
            · {fmtDateTime(row.createdAt)}
          </small>
        </div>
        <span className="adm-review-pills">
          <Pill tone={kind === "reclamacao" ? "bad" : kind === "elogio" ? "ok" : "mute"}>
            {reviewKindLabels[kind]}
          </Pill>
          <Pill tone={statusTone[row.status] ?? "mute"}>
            {reviewStatusLabels[status] ?? row.status}
          </Pill>
          {row.ownerFlaggedAt && <Pill tone="warn">Anunciante contestou</Pill>}
        </span>
      </div>
      <p className="adm-review-body">{row.body}</p>
      {row.ownerReply && (
        <div className="adm-review-reply">
          <strong>Resposta do anunciante</strong>
          <p>{row.ownerReply}</p>
          <button
            type="button"
            className="adm-btn is-sm is-danger"
            disabled={busy}
            onClick={() => onClearReply(row.id)}
          >
            Remover resposta
          </button>
        </div>
      )}
      {row.moderationNote && (
        <p className="adm-muted">Anotação da equipe: {row.moderationNote}</p>
      )}
      <div className="adm-review-actions">
        <input
          className="adm-input"
          maxLength={300}
          placeholder="Motivo ou anotação (opcional)"
          value={note}
          onChange={event => setNote(event.target.value)}
          aria-label="Anotação"
        />
        {status !== "approved" && (
          <button
            type="button"
            className="adm-btn is-primary is-sm"
            disabled={busy}
            onClick={() => onDecide(row.id, "approved", note)}
          >
            Publicar
          </button>
        )}
        {status !== "rejected" && (
          <button
            type="button"
            className="adm-btn is-danger is-sm"
            disabled={busy}
            onClick={() => onDecide(row.id, "rejected", note)}
          >
            Recusar
          </button>
        )}
        {status === "approved" && (
          <button
            type="button"
            className="adm-btn is-sm"
            disabled={busy}
            onClick={() => onDecide(row.id, "hidden", note)}
          >
            Ocultar
          </button>
        )}
      </div>
    </article>
  );
}

export default function ReviewsAdmin() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Filter>("pending");
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

  const list = trpc.reviews.adminList.useQuery(
    { status: filter, q: search || undefined, page: page + 1 },
    { placeholderData: keepPreviousData, refetchInterval: 60_000 }
  );
  const counts = trpc.reviews.adminCounts.useQuery();
  const settings = trpc.reviews.settings.useQuery();
  const refresh = async () => {
    await Promise.all([
      utils.reviews.adminList.invalidate(),
      utils.reviews.adminCounts.invalidate(),
      utils.management.navigationCounts.invalidate(),
    ]);
  };
  const moderate = trpc.reviews.moderate.useMutation({
    onSuccess: async () => {
      toast.success("Avaliação atualizada");
      await refresh();
    },
    onError: error => toast.error(error.message),
  });
  const clearReply = trpc.reviews.clearReply.useMutation({
    onSuccess: async () => {
      toast.success("Resposta removida");
      await refresh();
    },
    onError: error => toast.error(error.message),
  });
  const save = trpc.reviews.saveSettings.useMutation({
    onSuccess: async data => {
      toast.success(
        data.autoApprove
          ? "Novas avaliações serão publicadas na hora"
          : "Novas avaliações vão esperar a sua aprovação"
      );
      await utils.reviews.settings.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const data = list.data;
  const busy = moderate.isPending || clearReply.isPending;

  return (
    <div className="adm">
      <Head
        title="Avaliações"
        subtitle="Elogios, comentários e reclamações enviados nas páginas dos anúncios."
      />

      <Panel>
        <label className="adm-switch-row">
          <input
            type="checkbox"
            checked={settings.data?.autoApprove ?? false}
            disabled={save.isPending || settings.isLoading}
            onChange={event => save.mutate({ autoApprove: event.target.checked })}
          />
          <span>
            <strong>Publicar sem aprovação</strong>
            <small>
              Desligado (recomendado): cada avaliação só aparece depois que você
              publicar. Mesmo ligado, textos com telefone, link ou e-mail são
              barrados.
            </small>
          </span>
        </label>
      </Panel>

      <div className="adm-chips" role="group" aria-label="Situação">
        {filters.map(([key, label]) => {
          const badge =
            key === "pending"
              ? counts.data?.pending
              : key === "flagged"
                ? counts.data?.flagged
                : 0;
          return (
            <button
              key={key}
              type="button"
              className={`adm-chip ${filter === key ? "is-active" : ""} ${badge ? "is-alert" : ""}`}
              onClick={() => {
                setFilter(key);
                setPage(0);
              }}
            >
              {label}
              {badge ? ` (${badge})` : ""}
            </button>
          );
        })}
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-input"
          type="search"
          placeholder="Buscar por texto, autor ou anúncio"
          value={typed}
          onChange={event => setTyped(event.target.value)}
          aria-label="Buscar avaliação"
        />
      </div>

      <ErrorNote error={list.error} />
      {!data && list.isLoading ? (
        <Loading />
      ) : data && data.items.length === 0 ? (
        <div className="adm-panel">
          <Empty
            title="Nenhuma avaliação neste filtro"
            text="Quando alguém avaliar um anúncio, ela aparece aqui para você conferir."
          />
        </div>
      ) : (
        data && (
          <>
            <div className="adm-review-list">
              {(data.items as Row[]).map(row => (
                <ReviewCard
                  key={row.id}
                  row={row}
                  busy={busy}
                  onDecide={(id, status, note) =>
                    moderate.mutate({ id, status, note: note || undefined })
                  }
                  onClearReply={id => clearReply.mutate({ id })}
                />
              ))}
            </div>
            <Pager
              page={page}
              total={data.total}
              pageSize={data.pageSize}
              onPage={setPage}
            />
          </>
        )
      )}
    </div>
  );
}
