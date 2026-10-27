import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Stars } from "@/components/ProfileReviews";
import {
  ratingLabel,
  reviewKindLabels,
  reviewKinds,
  reviewLimits,
  type ReviewKind,
} from "@shared/reviews";
import {
  Badge,
  Card,
  Empty,
  ErrorBlock,
  Kpi,
  LoadingBlock,
  PageHead,
  fmtDate,
} from "./ui";

type Item = {
  id: number;
  profileId: number;
  stageName: string;
  slug: string;
  rating: number;
  kind: string;
  title: string | null;
  body: string;
  authorName: string;
  createdAt: string | Date;
  ownerReply: string | null;
  ownerFlaggedAt: string | Date | null;
};

function ReviewRow({ item, onChanged }: { item: Item; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.ownerReply ?? "");
  const reply = trpc.reviews.reply.useMutation({
    onSuccess: () => {
      toast.success(text.trim() ? "Resposta publicada" : "Resposta removida");
      setEditing(false);
      onChanged();
    },
    onError: error => toast.error(error.message),
  });
  const flag = trpc.reviews.flag.useMutation({
    onSuccess: () => {
      toast.success("Pedido enviado. A equipe vai conferir.");
      onChanged();
    },
    onError: error => toast.error(error.message),
  });
  const kind = (reviewKinds as readonly string[]).includes(item.kind)
    ? (item.kind as ReviewKind)
    : "comentario";
  return (
    <li className="od-review">
      <header>
        <div>
          <strong>{item.authorName}</strong>
          <small>
            {fmtDate(item.createdAt)} ·{" "}
            <Link href={`/perfil/${item.slug}#avaliacoes`}>{item.stageName}</Link>
          </small>
        </div>
        <Badge tone={kind === "reclamacao" ? "bad" : kind === "elogio" ? "ok" : "mute"}>
          {reviewKindLabels[kind]}
        </Badge>
      </header>
      <div className="od-review-line">
        <Stars value={item.rating} />
        {item.title && <strong>{item.title}</strong>}
      </div>
      <p>{item.body}</p>
      {editing ? (
        <div className="od-review-edit">
          <textarea
            rows={3}
            maxLength={reviewLimits.replyMax}
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder="Responda com educação. Sem telefone, link ou rede social."
            aria-label="Sua resposta"
          />
          <div className="od-form-actions">
            <button
              type="button"
              className="od-btn is-primary"
              disabled={reply.isPending}
              onClick={() => reply.mutate({ id: item.id, text })}
            >
              Publicar resposta
            </button>
            <button type="button" className="od-btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {item.ownerReply && (
            <div className="od-review-reply">
              <strong>Sua resposta</strong>
              <p>{item.ownerReply}</p>
            </div>
          )}
          <div className="od-form-actions">
            <button type="button" className="od-btn" onClick={() => setEditing(true)}>
              {item.ownerReply ? "Editar resposta" : "Responder"}
            </button>
            {item.ownerFlaggedAt ? (
              <Badge tone="warn">Revisão pedida</Badge>
            ) : (
              <button
                type="button"
                className="od-btn"
                disabled={flag.isPending}
                onClick={() => flag.mutate({ id: item.id })}
              >
                Pedir revisão
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

export default function Reviews() {
  const query = trpc.reviews.mine.useQuery();
  const utils = trpc.useUtils();
  if (query.isLoading) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={query.error.message} />;
  const { summary, items } = query.data ?? {
    summary: { count: 0, average: 0 },
    items: [],
  };
  const refresh = () => void utils.reviews.mine.invalidate();
  return (
    <>
      <PageHead
        title="Avaliações"
        subtitle="O que as pessoas escreveram sobre os seus anúncios. Você pode responder; se algo fugir das regras, peça uma revisão."
      />
      <div className="od-kpis">
        <Kpi
          icon="star"
          label="Nota média"
          value={summary.count ? String(summary.average).replace(".", ",") : "—"}
          foot={summary.count ? ratingLabel(summary.average) : "Ainda sem avaliações"}
        />
        <Kpi icon="chat" label="Avaliações publicadas" value={summary.count} />
      </div>
      <Card>
        {items.length === 0 ? (
          <Empty
            icon="star"
            title="Nenhuma avaliação publicada ainda"
            text="Quando alguém avaliar um anúncio seu e a equipe aprovar, aparece aqui e na página do anúncio."
          />
        ) : (
          <ul className="od-reviews">
            {(items as Item[]).map(item => (
              <ReviewRow key={item.id} item={item} onChanged={refresh} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
