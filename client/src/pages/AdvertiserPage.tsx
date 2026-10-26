import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import Seo from "@/components/Seo";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import { trpc } from "@/lib/trpc";
import {
  estimateMonthlyEarnings,
  formatBRL,
  reaisToCents,
} from "@shared/discovery-options";

const steps = [
  {
    title: "Crie sua conta",
    text: "Cadastro com e-mail e senha. Você precisa ter 18 anos ou mais.",
  },
  {
    title: "Verifique sua identidade",
    text: "Solicite a verificação no painel. A equipe confirma seus dados em uma videochamada reservada e libera o selo de identidade verificada.",
  },
  {
    title: "Monte seu anúncio",
    text: "Nome artístico, cidade, valor a partir de, local de atendimento, serviços e descrição. Nunca publique endereço privado.",
  },
  {
    title: "Envie fotos e vídeos",
    text: "Use apenas material que você tem autorização para publicar. Toda mídia passa por moderação antes de aparecer.",
  },
  {
    title: "Aceite o termo e envie para revisão",
    text: "Depois da aprovação, seu anúncio entra na vitrine e você acompanha visitas e cliques de contato no painel.",
  },
];

const rules = [
  "Somente maiores de 18 anos, com atividade legal e consentimento.",
  "Fotos e vídeos próprios ou com autorização expressa de quem aparece.",
  "Sem endereço residencial, documentos ou dados de terceiros no anúncio.",
  "Qualquer sinal de menor, coerção, exploração ou fraude leva à suspensão imediata.",
];

function HowToAdvertise() {
  return (
    <article className="studio-about">
      <p className="studio-kicker">Para anunciantes</p>
      <h1>Como anunciar na Ero Models</h1>
      <p>
        Um passo a passo curto para colocar seu anúncio no ar com segurança e
        controle sobre o que é publicado.
      </p>
      <ol>
        {steps.map(step => (
          <li key={step.title}>
            <strong>{step.title}.</strong> {step.text}
          </li>
        ))}
      </ol>
      <h2>Regras que protegem você e o público</h2>
      <ul>
        {rules.map(rule => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <div className="studio-actions">
        <Link className="studio-cta" href="/cadastro">
          Criar meu anúncio
        </Link>
        <Link href="/calculadora-de-ganhos">Simular meus ganhos</Link>
      </div>
    </article>
  );
}

function EarningsCalculator() {
  const [rate, setRate] = useState("250");
  const [hours, setHours] = useState("1");
  const [perWeek, setPerWeek] = useState("6");
  const [costs, setCosts] = useState("0");

  const result = useMemo(() => {
    const hourlyRateCents = reaisToCents(rate);
    const hoursPerAppointment = Number(hours.replace(",", "."));
    const appointmentsPerWeek = Number(perWeek.replace(",", "."));
    const monthlyCostsCents = reaisToCents(costs) ?? 0;
    if (
      hourlyRateCents === null ||
      !Number.isFinite(hoursPerAppointment) ||
      !Number.isFinite(appointmentsPerWeek) ||
      hoursPerAppointment <= 0 ||
      appointmentsPerWeek < 0 ||
      appointmentsPerWeek > 70 ||
      hoursPerAppointment > 24
    )
      return null;
    return estimateMonthlyEarnings({
      hourlyRateCents,
      hoursPerAppointment,
      appointmentsPerWeek,
      monthlyCostsCents,
    });
  }, [rate, hours, perWeek, costs]);

  return (
    <article className="studio-about">
      <p className="studio-kicker">Para anunciantes</p>
      <h1>Calculadora de ganhos</h1>
      <p>
        Simule uma estimativa mensal a partir do seu valor por hora e da sua
        rotina. É apenas uma conta de referência: a Ero Models não garante
        demanda, atendimentos nem resultados.
      </p>
      <div className="studio-fields">
        <label>
          Valor por hora (R$)
          <input
            inputMode="decimal"
            value={rate}
            onChange={e => setRate(e.target.value)}
          />
        </label>
        <label>
          Horas por atendimento
          <input
            inputMode="decimal"
            value={hours}
            onChange={e => setHours(e.target.value)}
          />
        </label>
        <label>
          Atendimentos por semana
          <input
            inputMode="decimal"
            value={perWeek}
            onChange={e => setPerWeek(e.target.value)}
          />
        </label>
        <label>
          Custos mensais (R$)
          <input
            inputMode="decimal"
            value={costs}
            onChange={e => setCosts(e.target.value)}
          />
        </label>
      </div>
      <section
        className="studio-panel"
        aria-live="polite"
        aria-label="Resultado da simulação"
      >
        {result ? (
          <>
            <p>
              Receita estimada: <strong>{formatBRL(result.grossCents)}</strong>{" "}
              por mês
            </p>
            <p>
              Custos informados: <strong>{formatBRL(result.costsCents)}</strong>
            </p>
            <p>
              Resultado estimado: <strong>{formatBRL(result.netCents)}</strong>{" "}
              por mês
            </p>
          </>
        ) : (
          <p>Preencha valores válidos para ver a estimativa.</p>
        )}
      </section>
      <div className="studio-actions">
        <Link className="studio-cta" href="/cadastro">
          Criar meu anúncio
        </Link>
        <Link href="/como-anunciar">Ver passo a passo</Link>
      </div>
    </article>
  );
}

export default function AdvertiserPage() {
  const [location] = useLocation();
  const calculator = location === "/calculadora-de-ganhos";
  const config = trpc.system.config.useQuery();
  const title = calculator
    ? "Calculadora de ganhos — Ero Models"
    : "Como anunciar — Ero Models";
  const description = calculator
    ? "Simule uma estimativa mensal de ganhos a partir do seu valor por hora e da sua rotina."
    : "Passo a passo para criar, verificar e publicar seu anúncio com segurança.";
  return (
    <div className="studio">
      <Seo
        title={title}
        description={description}
        path={calculator ? "/calculadora-de-ganhos" : "/como-anunciar"}
        noindex={Boolean(
          config.data?.robotsNoIndex || !config.data?.publicLaunchEnabled
        )}
      />
      <StudioHeader />
      <main className="studio-main">
        <nav className="studio-breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Anúncios</Link>
          <span aria-hidden="true">/</span>
          <span>{calculator ? "Calculadora de ganhos" : "Como anunciar"}</span>
        </nav>
        {calculator ? <EarningsCalculator /> : <HowToAdvertise />}
      </main>
      <PublicFooter />
    </div>
  );
}
