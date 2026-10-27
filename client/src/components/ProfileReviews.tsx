import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ratingLabel,
  reviewKindLabels,
  reviewKinds,
  reviewLimits,
  reviewRules,
  reviewSortLabels,
  reviewSorts,
  type ReviewKind,
  type ReviewSort,
} from "@shared/reviews";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span
      className="rv-stars"
      role="img"
      aria-label={`Nota ${String(value).replace(".", ",")} de 5`}
      style={{ fontSize: size }}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <i key={n} className={n <= full ? "is-on" : ""} aria-hidden="true">
          ★
        </i>
      ))}
    </span>
  );
}

const fmtDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

type ReviewItem = {
  id: number;
  rating: number;
  kind: string;
  title: string | null;
  body: string;
  authorName: string;
  createdAt: string | Date;
  ownerReply: string | null;
  ownerReplyAt: string | Date | null;
};

function ReviewCard({ item, stageName }: { item: ReviewItem; stageName: string }) {
  const kind = (reviewKinds as readonly string[]).includes(item.kind)
    ? (item.kind as ReviewKind)
    : "comentario";
  return (
    <article className="rv-item">
      <header>
        <span className="rv-avatar" aria-hidden="true">
          {item.authorName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <strong>{item.authorName}</strong>
          <small>{fmtDate(item.createdAt)}</small>
        </div>
        <span className={`rv-kind is-${kind}`}>{reviewKindLabels[kind]}</span>
      </header>
      <div className="rv-line">
        <Stars value={item.rating} />
        {item.title && <strong>{item.title}</strong>}
      </div>
      <p className="rv-body">{item.body}</p>
      {item.ownerReply && (
        <div className="rv-reply">
          <strong>Resposta de {stageName}</strong>
          {item.ownerReplyAt && <small>{fmtDate(item.ownerReplyAt)}</small>}
          <p>{item.ownerReply}</p>
        </div>
      )}
    </article>
  );
}

export default function ProfileReviews({
  profileId,
  stageName,
  slug,
}: {
  profileId: number;
  stageName: string;
  slug: string;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [extra, setExtra] = useState<ReviewItem[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [more, setMore] = useState<boolean | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [kind, setKind] = useState<ReviewKind>("elogio");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const query = trpc.reviews.forProfile.useQuery({
    profileId,
    sort,
    page: 1,
  });
  const create = trpc.reviews.create.useMutation({
    onSuccess: async result => {
      toast.success(
        result.status === "approved"
          ? "Avaliação publicada. Obrigado!"
          : "Recebemos sua avaliação. Ela aparece depois que a equipe conferir."
      );
      setFormOpen(false);
      setRating(0);
      setTitle("");
      setBody("");
      await utils.reviews.forProfile.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.reviews.deleteMine.useMutation({
    onSuccess: async () => {
      toast.success("Avaliação apagada");
      await utils.reviews.forProfile.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    setExtra([]);
    setNextPage(2);
    setMore(null);
  }, [sort, profileId, query.dataUpdatedAt]);

  const data = query.data;
  if (query.isLoading)
    return (
      <section className="rv" id="avaliacoes" aria-busy="true">
        <h2>Avaliações</h2>
        <p className="ep-note">Carregando avaliações…</p>
      </section>
    );
  if (!data) return null;

  const { summary, mine } = data;
  const items = [...(data.items as ReviewItem[]), ...extra];
  const hasMore = more === null ? data.hasMore : more;
  const canWrite = Boolean(user) && !data.isOwner && !mine;
  const total = summary.count;

  async function loadMore() {
    setLoadingMore(true);
    try {
      const result = await utils.reviews.forProfile.fetch({
        profileId,
        sort,
        page: nextPage,
      });
      if (result) {
        setExtra(current => [...current, ...(result.items as ReviewItem[])]);
        setMore(result.hasMore);
        setNextPage(page => page + 1);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  const bodyLeft = reviewLimits.bodyMax - body.length;
  const formReady =
    rating > 0 && body.trim().length >= reviewLimits.bodyMin && !create.isPending;

  return (
    <section className="rv" id="avaliacoes" aria-labelledby="rv-title">
      <h2 id="rv-title">Avaliações de {stageName}</h2>

      <div className="rv-top">
        <div className="rv-score">
          <strong>{total ? String(summary.average).replace(".", ",") : "—"}</strong>
          <Stars value={summary.average} size={20} />
          <span>
            {total
              ? `${ratingLabel(summary.average)} · ${total} avaliaç${total === 1 ? "ão" : "ões"}`
              : "Ainda sem avaliações"}
          </span>
        </div>
        <ul className="rv-bars" aria-label="Quantidade por nota">
          {[5, 4, 3, 2, 1].map(n => {
            const count = summary.distribution[n - 1];
            return (
              <li key={n}>
                <span>{n}</span>
                <i aria-hidden="true">
                  <b style={{ width: total ? `${(count / total) * 100}%` : 0 }} />
                </i>
                <em>{count}</em>
              </li>
            );
          })}
        </ul>
        <div className="rv-cta">
          {data.isOwner ? (
            <p>Esta é a sua página. Responda às avaliações em “Avaliações”, no seu painel.</p>
          ) : mine ? (
            <p>Você já avaliou este anúncio.</p>
          ) : user ? (
            <button
              type="button"
              className="ep-btn ep-btn-primary"
              onClick={() => setFormOpen(open => !open)}
              aria-expanded={formOpen}
            >
              Faça sua avaliação
            </button>
          ) : (
            <>
              <Link
                className="ep-btn ep-btn-primary"
                href={`/login?returnTo=${encodeURIComponent(`/perfil/${slug}#avaliacoes`)}`}
              >
                Entre para avaliar
              </Link>
              <small>
                Não tem conta? <Link href="/cadastro">Cadastre-se grátis</Link>
              </small>
            </>
          )}
        </div>
      </div>

      {mine && (
        <div className={`rv-mine is-${String(mine.status)}`}>
          <div>
            <strong>Sua avaliação</strong>
            <span>
              {mine.status === "approved"
                ? "Publicada"
                : mine.status === "pending"
                  ? "Aguardando a conferência da equipe"
                  : mine.status === "rejected"
                    ? "Não foi publicada (fugiu das regras)"
                    : "Oculta"}
            </span>
          </div>
          <p>{mine.body}</p>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ id: Number(mine.id) })}
          >
            Apagar minha avaliação
          </button>
        </div>
      )}

      {canWrite && formOpen && (
        <form
          className="rv-form"
          onSubmit={event => {
            event.preventDefault();
            if (!formReady) return;
            create.mutate({
              profileId,
              rating,
              kind,
              title: title.trim() || undefined,
              body: body.trim(),
            });
          }}
        >
          <fieldset>
            <legend>Sua nota</legend>
            <div className="rv-pick" role="radiogroup" aria-label="Nota de 1 a 5">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} estrela${n === 1 ? "" : "s"}`}
                  className={n <= rating ? "is-on" : ""}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Tipo</legend>
            <div className="rv-kinds">
              {reviewKinds.map(option => (
                <button
                  key={option}
                  type="button"
                  className={kind === option ? "is-on" : ""}
                  aria-pressed={kind === option}
                  onClick={() => setKind(option)}
                >
                  {reviewKindLabels[option]}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            Título (opcional)
            <input
              maxLength={reviewLimits.titleMax}
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Ex.: Atendimento pontual"
            />
          </label>
          <label>
            Conte como foi
            <textarea
              rows={5}
              maxLength={reviewLimits.bodyMax}
              value={body}
              onChange={event => setBody(event.target.value)}
              placeholder="Escreva com respeito, sem telefone, link ou rede social."
            />
            <small>{bodyLeft} caracteres restantes</small>
          </label>
          <ul className="rv-rules">
            {reviewRules.map(rule => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <div className="rv-form-actions">
            <button type="submit" className="ep-btn ep-btn-primary" disabled={!formReady}>
              {create.isPending ? "Enviando…" : "Enviar avaliação"}
            </button>
            <button
              type="button"
              className="ep-btn ep-btn-ghost"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {total > 1 && (
        <div className="rv-sort">
          <label>
            Ordenar por
            <select
              value={sort}
              onChange={event => setSort(event.target.value as ReviewSort)}
            >
              {reviewSorts.map(option => (
                <option key={option} value={option}>
                  {reviewSortLabels[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {items.length > 0 ? (
        <div className="rv-list">
          {items.map(item => (
            <ReviewCard key={item.id} item={item} stageName={stageName} />
          ))}
        </div>
      ) : (
        <p className="rv-empty">
          Ninguém avaliou {stageName} ainda. Seja a primeira pessoa a contar como foi.
        </p>
      )}

      {hasMore && (
        <button
          type="button"
          className="ep-btn ep-btn-ghost rv-more"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? "Carregando…" : "Ver mais avaliações"}
        </button>
      )}
    </section>
  );
}
