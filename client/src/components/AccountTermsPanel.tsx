import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AccountTermsPanel() {
  const [confirmed, setConfirmed] = useState(false);
  const status = trpc.auth.accountTermsStatus.useQuery();
  const accept = trpc.auth.acceptAccountTerms.useMutation({
    onSuccess: async () => {
      await status.refetch();
      setConfirmed(false);
      toast.success("Aceite da conta registrado");
    },
    onError: error => toast.error(error.message),
  });
  if (status.isLoading || status.data?.current) return null;
  if (status.error)
    return (
      <section className="studio-panel studio-account-terms" role="alert">
        <h2>Não foi possível carregar os termos da conta</h2>
        <p className="studio-muted">Tente novamente antes de publicar.</p>
        <button onClick={() => void status.refetch()}>Tentar novamente</button>
      </section>
    );
  if (!status.data) return null;
  return (
    <section
      className="studio-panel studio-account-terms"
      aria-labelledby="account-terms-title"
    >
      <p className="studio-kicker">Antes de publicar</p>
      <h2 id="account-terms-title">Confirme uma vez os termos da conta</h2>
      <p className="studio-muted">
        Esse aceite vale para seus anúncios e arquivos autorizados. Ele não será
        repetido a cada anúncio.
      </p>
      <ol className="studio-terms">
        {status.data.clauses.map(clause => (
          <li key={clause}>{clause}</li>
        ))}
      </ol>
      <label className="studio-check-row">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={event => setConfirmed(event.target.checked)}
        />
        <span>Li e confirmo as declarações acima.</span>
      </label>
      <button
        className="primary"
        disabled={!confirmed || accept.isPending}
        onClick={() => accept.mutate()}
      >
        {accept.isPending ? "Salvando…" : "Confirmar uma vez"}
      </button>
    </section>
  );
}
