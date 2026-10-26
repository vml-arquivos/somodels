import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import Seo from "@/components/Seo";
import PublicShell from "@/components/PublicShell";
import { trpc } from "@/lib/trpc";
import {
  estimateMonthlyEarnings,
  formatBRL,
  reaisToCents,
} from "@shared/discovery-options";

const steps = [
  {
    title: "Crie sua conta",
    text: "Nome, e-mail e senha. Você precisa ter 18 anos ou mais.",
  },
  {
    title: "Monte seu perfil",
    text: "Escolha o nome que quiser, o estado, a cidade e o bairro, o valor a partir de e o que você oferece. Nunca coloque o endereço da sua casa.",
  },
  {
    title: "Envie suas fotos",
    text: "Selecione várias de uma vez. Use só fotos e vídeos que você pode publicar.",
  },
  {
    title: "Publique",
    text: "O anúncio entra no ar na hora, sem fila de aprovação. Você acompanha visitas e cliques de contato no painel.",
  },
  {
    title: "Ganhe selo e destaque (opcional)",
    text: "Peça a verificação de identidade para receber o selo de verificada e escolha um plano para aparecer mais.",
  },
];

const rules = [
  "Só maiores de 18 anos, com atividade legal e consentimento.",
  "Fotos e vídeos seus ou com autorização de quem aparece.",
  "Nada de endereço residencial, documentos ou dados de outras pessoas.",
  "Sinal de menor de idade, coerção, exploração ou golpe leva à suspensão na hora.",
];

function HowToAdvertise() {
  return (
    <article className="ep-doc">
      <p className="ep-eyebrow">Para quem anuncia</p>
      <h1>Como anunciar na Ero Models</h1>
      <p>
        Em poucos passos o seu anúncio está no ar, e você controla tudo pelo
        painel.
      </p>
      <ol className="ep-steps">
        {steps.map(step => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>
      <h2>Regras</h2>
      <ul>
        {rules.map(rule => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <div className="ep-doc-actions">
        <Link className="ep-btn ep-btn-primary" href="/cadastro">
          Criar meu perfil
        </Link>
        <Link className="ep-btn ep-btn-ghost" href="/calculadora-de-ganhos">
          Simular meus ganhos
        </Link>
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
    <article className="ep-doc">
      <p className="ep-eyebrow">Para quem anuncia</p>
      <h1>Calculadora de ganhos</h1>
      <p>
        Veja uma estimativa por mês a partir do seu valor por hora e da sua
        rotina. É só uma conta de referência: a Ero Models não garante
        atendimentos nem resultado.
      </p>
      <div className="ep-form ep-fields">
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
        className="ep-box"
        aria-live="polite"
        aria-label="Resultado da simulação"
      >
        {result ? (
          <>
            <p>
              Você recebe, em média: <strong>{formatBRL(result.grossCents)}</strong>{" "}
              por mês
            </p>
            <p>
              Seus custos: <strong>{formatBRL(result.costsCents)}</strong>
            </p>
            <p>
              Sobra por mês: <strong>{formatBRL(result.netCents)}</strong>{" "}
              por mês
            </p>
          </>
        ) : (
          <p>Preencha os valores para ver a conta.</p>
        )}
      </section>
      <div className="ep-doc-actions">
        <Link className="ep-btn ep-btn-primary" href="/cadastro">
          Criar meu perfil
        </Link>
        <Link className="ep-btn ep-btn-ghost" href="/como-anunciar">
          Ver o passo a passo
        </Link>
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
    ? "Calcule uma estimativa mensal de ganhos a partir do seu valor por hora."
    : "Passo a passo para criar e publicar seu anúncio.";
  return (
    <>
      <Seo
        title={title}
        description={description}
        path={calculator ? "/calculadora-de-ganhos" : "/como-anunciar"}
        noindex={Boolean(
          config.data?.robotsNoIndex || !config.data?.publicLaunchEnabled
        )}
      />
      <PublicShell narrow>
        <nav className="ep-breadcrumb" aria-label="Navegação">
          <Link href="/">Anúncios</Link>
          <span aria-hidden="true">/</span>
          <span>{calculator ? "Calculadora de ganhos" : "Como anunciar"}</span>
        </nav>
        {calculator ? <EarningsCalculator /> : <HowToAdvertise />}
      </PublicShell>
    </>
  );
}
