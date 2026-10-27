import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Card,
  Empty,
  ErrorBlock,
  LoadingBlock,
  PageHead,
  fmtDateTime,
  relativeTime,
} from "./ui";

export default function Activity() {
  const activity = trpc.owner.activity.useQuery();
  if (activity.isLoading) return <LoadingBlock />;
  if (activity.error) return <ErrorBlock message={activity.error.message} />;
  const rows = activity.data ?? [];
  return (
    <>
      <PageHead
        title="Atividade"
        subtitle="O histórico do que aconteceu na sua conta, do mais recente ao mais antigo."
      />
      <Card>
        {rows.length === 0 ? (
          <Empty
            icon="clock"
            title="Nada por aqui ainda"
            text="Suas ações importantes, como criar um anúncio ou enviar arquivos, ficam registradas neste histórico."
            action={
              <Link className="od-btn" href="/titular/anuncios?novo=1">
                Criar anúncio
              </Link>
            }
          />
        ) : (
          <ul className="od-timeline">
            {rows.map(row => (
              <li key={row.id}>
                <strong>{row.label}</strong>
                <span title={fmtDateTime(row.createdAt)}>
                  {relativeTime(row.createdAt)} · {fmtDateTime(row.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
