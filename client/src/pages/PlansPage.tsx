import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Seo from "@/components/Seo";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
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
          : "Pedido registrado. A equipe confirma o pagamento e ativa o plano."
      );
      await mine.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const pendingIds = new Set(
    (mine.data ?? []).filter(s => s.status === "pending").map(s => s.planName)
  );
  return (
    <div className="studio">
      <Seo
        title="Planos para anunciantes — Ero Models"
        description="Compare os planos de destaque e escolha como aparecer na vitrine."
        path="/planos"
        noindex={Boolean(
          config.data?.robotsNoIndex || !config.data?.publicLaunchEnabled
        )}
      />
      <StudioHeader />
      <main className="studio-main">
        <nav className="studio-breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Anúncios</Link>
          <span aria-hidden="true">/</span>
          <span>Planos</span>
        </nav>
        <article className="studio-about">
          <p className="studio-kicker">Para anunciantes</p>
          <h1>Planos para anunciantes</h1>
          <p>
            Escolha como o seu anúncio aparece. Planos em destaque sobem na
            vitrine e são sempre identificados com o rótulo “Patrocinado”. O
            pagamento é feito por Pix combinado com a equipe e o plano é
            ativado manualmente após a confirmação; não há renovação automática.
          </p>
        </article>
        {plans.isLoading ? (
          <p>Carregando planos…</p>
        ) : !plans.data?.length ? (
          <section className="studio-panel">
            <h2>Planos em breve</h2>
            <p>
              Os planos ainda não foram publicados. Você já pode criar seu
              anúncio e acompanhar visitas e contatos no painel.
            </p>
            <Link className="studio-cta" href="/cadastro">
              Criar meu anúncio
            </Link>
          </section>
        ) : (
          <div className="studio-plan-grid">
            {plans.data.map(plan => (
              <section className="studio-panel" key={plan.id} aria-label={`Plano ${plan.name}`}>
                {plan.isFeatured && <p className="studio-kicker">Destaque</p>}
                <h2>{plan.name}</h2>
                <p>
                  <strong>{plan.priceCents ? formatBRL(plan.priceCents) : "Gratuito"}</strong>
                  {plan.priceCents ? ` por ${plan.durationDays} dias` : ""}
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
                    className="studio-cta"
                    disabled={request.isPending || pendingIds.has(plan.name)}
                    onClick={() => request.mutate({ planId: plan.id })}
                  >
                    {pendingIds.has(plan.name) ? "Pedido em análise" : "Quero este plano"}
                  </button>
                ) : (
                  <Link className="studio-cta" href="/login?returnTo=/titular">
                    Entrar para contratar
                  </Link>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
