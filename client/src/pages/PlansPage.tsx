import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Seo from "@/components/Seo";
import PublicShell from "@/components/PublicShell";
import { formatBRL } from "@shared/discovery-options";

export default function PlansPage() {
  const { user } = useAuth();
  const config = trpc.system.config.useQuery();
  const plans = trpc.plans.list.useQuery();
  const mine = trpc.plans.mine.useQuery(undefined, {
    enabled: Boolean(user) && !user?.mustChangePassword,
  });
  const request = trpc.plans.request.useMutation({
    onSuccess: async result => {
      toast.success(
        result.duplicate
          ? "Você já tem um pedido em andamento para este plano."
          : "Pedido enviado. A equipe confirma o pagamento e ativa o plano."
      );
      await mine.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const pendingIds = new Set(
    (mine.data ?? []).filter(s => s.status === "pending").map(s => s.planName)
  );
  return (
    <>
      <Seo
        title="Planos — Ero Models"
        description="Escolha como o seu anúncio aparece na Ero Models."
        path="/planos"
        noindex={Boolean(
          config.data?.robotsNoIndex || !config.data?.publicLaunchEnabled
        )}
      />
      <PublicShell>
        <nav className="ep-breadcrumb" aria-label="Navegação">
          <Link href="/">Anúncios</Link>
          <span aria-hidden="true">/</span>
          <span>Planos</span>
        </nav>
        <header className="ep-plans-head">
          <p className="ep-eyebrow">Para quem anuncia</p>
          <h1>Planos</h1>
          <p>
            Anunciar é simples. Os planos em destaque colocam seu perfil mais
            acima e levam o rótulo &ldquo;Patrocinado&rdquo;. O pagamento é por
            Pix combinado com a equipe, e o plano é ativado depois da
            confirmação. Não há renovação automática.
          </p>
        </header>
        {plans.isLoading ? (
          <p className="ep-note">Carregando planos…</p>
        ) : !plans.data?.length ? (
          <section className="ep-empty">
            <h2>Planos em breve</h2>
            <p>
              Enquanto isso, você já pode criar seu perfil e acompanhar visitas
              e contatos pelo painel.
            </p>
            <Link className="ep-btn ep-btn-primary" href="/cadastro">
              Criar meu perfil
            </Link>
          </section>
        ) : (
          <div className="ep-plan-grid">
            {plans.data.map(plan => (
              <section
                className={`ep-plan${plan.isFeatured ? " is-featured" : ""}`}
                key={plan.id}
                aria-label={`Plano ${plan.name}`}
              >
                {plan.isFeatured && (
                  <span className="ep-tag ep-tag-accent">Destaque</span>
                )}
                <h2>{plan.name}</h2>
                <p className="ep-plan-price">
                  <strong>
                    {plan.priceCents ? formatBRL(plan.priceCents) : "Grátis"}
                  </strong>
                  {plan.priceCents ? <small> por {plan.durationDays} dias</small> : null}
                </p>
                {plan.description && <p>{plan.description}</p>}
                {plan.benefits.length > 0 && (
                  <ul>
                    {plan.benefits.map(benefit => (
                      <li key={benefit}>{benefit}</li>
                    ))}
                  </ul>
                )}
                {user ? (
                  <button
                    className="ep-btn ep-btn-primary"
                    disabled={request.isPending || pendingIds.has(plan.name)}
                    onClick={() => request.mutate({ planId: plan.id })}
                  >
                    {pendingIds.has(plan.name)
                      ? "Pedido em andamento"
                      : "Quero este plano"}
                  </button>
                ) : (
                  <Link
                    className="ep-btn ep-btn-primary"
                    href="/login?returnTo=/titular"
                  >
                    Entrar para contratar
                  </Link>
                )}
              </section>
            ))}
          </div>
        )}
      </PublicShell>
    </>
  );
}
