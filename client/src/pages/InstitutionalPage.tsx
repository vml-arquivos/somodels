import { Link, useLocation } from "wouter";
import Seo from "@/components/Seo";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import { trpc } from "@/lib/trpc";

const pages = {
  terms: {
    path: "/termos",
    title: "Termos da plataforma — Ero Models",
    description: "Regras de uso, publicação e moderação da Ero Models.",
    eyebrow: "Regras da plataforma",
    heading: "Termos de uso e publicação",
    paragraphs: [
      "A Ero Models é uma plataforma adulta para anúncios de acompanhantes. O titular é responsável pela veracidade, legalidade, autorização e atualização do material que envia.",
      "Anúncios adultos legais dependem de maioridade, consentimento, autorização de mídia e conformidade com a legislação e as regras da plataforma.",
      "Não são permitidos menores, exploração, coerção, violência, fraude, impersonação, mídia sem consentimento, violação de privacidade, atividade ilegal ou material que infrinja direitos de terceiros.",
      "A publicação depende de revisão, aceite vigente e dos controles de identidade e consentimento disponíveis. Uma verificação não é garantia de comportamento, segurança ou resultado de qualquer interação.",
    ],
    bullets: [
      "Use apenas dados, fotos e vídeos que você está autorizado a publicar.",
      "Mantenha cidade e disponibilidade atualizadas sem publicar endereço preciso.",
      "Denuncie conteúdo ou comportamento de risco pela jornada contextual.",
    ],
  },
  privacy: {
    path: "/privacidade",
    title: "Privacidade — Ero Models",
    description: "Como a Ero Models minimiza, protege e utiliza dados na plataforma.",
    eyebrow: "Privacidade",
    heading: "Privacidade e proteção de dados",
    paragraphs: [
      "Exibimos publicamente só o necessário para a descoberta de anúncios. Telefone, WhatsApp e Telegram não aparecem na listagem; o contato com o titular é liberado apenas para quem está logado.",
      "Documentos, senhas e dados internos nunca são exibidos em páginas públicas. Nenhum documento de identidade é publicado.",
      "Tratamos os dados conforme a Lei Geral de Proteção de Dados (LGPD). Coletamos apenas o necessário para criar a conta, moderar anúncios, proteger a plataforma e atender solicitações. Os dados não são vendidos. Mantemos registros de segurança pelo tempo exigido pela lei e apagamos ou anonimizamos o restante quando a conta é encerrada.",
    ],
    bullets: [
      "Você pode pedir acesso, correção ou exclusão dos seus dados pelo canal de privacidade informado abaixo.",
      "Não envie documentos, senhas ou dados sensíveis em descrições públicas ou denúncias.",
      "A localização pública é aproximada; nunca publique endereço residencial.",
    ],
  },
  safety: {
    path: "/seguranca",
    title: "Segurança e confiança — Ero Models",
    description: "Orientações de segurança, consentimento, verificação e contato responsável.",
    eyebrow: "Segurança e confiança",
    heading: "Descoberta responsável",
    paragraphs: [
      "A Ero Models combina publicação consentida, revisão humana, proteção de mídia, controles de acesso e ferramentas de denúncia. Esses controles reduzem riscos, mas não eliminam riscos de uma interação fora da plataforma.",
      "Verificação de identidade ou idade, quando disponível, tem escopo específico e não representa endosso, garantia de conduta ou garantia de segurança pessoal.",
      "Ao sair para um canal externo, confirme identidade, limites, consentimento e condições diretamente com a outra pessoa. A conversa externa não é controlada pela Ero Models.",
    ],
    bullets: [
      "Interrompa a interação diante de pressão, ameaça, extorsão ou pedido de pagamento suspeito.",
      "Não compartilhe documentos, códigos de autenticação ou endereço residencial.",
      "Em risco imediato, procure os serviços públicos de emergência adequados à sua localidade.",
    ],
  },
  reports: {
    path: "/denuncia",
    title: "Denúncias e remoção — Ero Models",
    description: "Como denunciar perfil, mídia ou comportamento que viole as regras.",
    eyebrow: "Trust & Safety",
    heading: "Denúncias e resposta a incidentes",
    paragraphs: [
      "A denúncia é feita no próprio anúncio. Ela exige conta, gera um protocolo e vai para análise da nossa equipe. Casos urgentes têm prioridade.",
      "Possível menor de idade, tráfico, exploração, coerção, violência, ameaça ou extorsão devem receber prioridade urgente. Não inclua documentos, senhas ou evidências sensíveis no campo de texto público.",
      "Casos de exploração sexual de crianças e adolescentes também podem ser denunciados diretamente ao Disque 100, serviço gratuito e sigiloso do governo federal, disponível todos os dias.",
      "Podemos ocultar ou suspender o material enquanto o caso é analisado e, quando necessário, comunicar as autoridades competentes. O titular pode pedir revisão da decisão pelo canal de contato.",
    ],
    bullets: [
      "Use a denúncia no próprio perfil para preservar o contexto do alvo.",
      "Descreva fatos objetivamente e não exponha a pessoa denunciante.",
      "Não prometa anonimato absoluto: registros técnicos podem ser necessários para segurança e prevenção de abuso.",
    ],
  },
  help: {
    path: "/ajuda",
    title: "Ajuda — Ero Models",
    description: "Orientações para titulares, visitantes, publicação, mídia e segurança.",
    eyebrow: "Central de ajuda",
    heading: "Como usar a plataforma",
    paragraphs: [
      "Titulares criam e atualizam um anúncio, aceitam o termo vigente e enviam fotos e vídeos para revisão. O anúncio só é publicado depois de aprovado pela moderação.",
      "Visitantes pesquisam por cidade, categoria, idade, valor, serviços e local de atendimento. As informações são as que o próprio titular publicou; a localização é sempre aproximada.",
      "Se uma mídia, perfil ou contato parecer irregular, interrompa a interação e use o fluxo de denúncia. Não tente contornar a confirmação de idade, o login ou as proteções da plataforma.",
    ],
    bullets: [
      "Login, área do titular, administração e redefinição de senha são áreas privadas e não aparecem nos buscadores.",
      "Esqueceu a senha? Peça um link temporário de recuperação pelo canal de contato.",
      "Planos em destaque são ativados pela equipe após a confirmação do pagamento. A plataforma não intermedeia o combinado entre titular e cliente: contato e condições são tratados diretamente entre as partes.",
    ],
  },
  contact: {
    path: "/contato",
    title: "Contato — Ero Models",
    description: "Canais e orientações para contato com a Ero Models.",
    eyebrow: "Contato",
    heading: "Fale com a plataforma",
    paragraphs: [
      "O contato com titulares é uma saída controlada para o canal informado pelo próprio titular. A Ero Models não controla a conversa depois que ela sai da plataforma.",
      "Use o canal oficial abaixo para suporte, privacidade, solicitações jurídicas, recuperação de senha e pedidos de remoção.",
      "Para denunciar um perfil, prefira a ação de denúncia no próprio anúncio.",
    ],
    bullets: [
      "Nunca envie senha, token, documento ou chave de API por mensagem.",
      "Em denúncia urgente, informe somente o mínimo necessário para a triagem.",
      "A plataforma não solicita pagamento por canais não documentados.",
    ],
  },
} as const;

type InstitutionalKey = keyof typeof pages;

const routeToPage: Record<string, InstitutionalKey> = {
  "/termos": "terms",
  "/privacidade": "privacy",
  "/seguranca": "safety",
  "/denuncia": "reports",
  "/ajuda": "help",
  "/contato": "contact",
};

export default function InstitutionalPage() {
  const [location] = useLocation();
  const content = pages[routeToPage[location] ?? "help"];
  const config = trpc.system.config.useQuery();
  const contact = config.data?.contact;
  return (
    <div className="studio">
      <Seo
        title={content.title}
        description={content.description}
        path={content.path}
        noindex={Boolean(
          config.data?.robotsNoIndex ||
            config.data?.ageVerificationRequired ||
            !config.data?.publicLaunchEnabled
        )}
      />
      <StudioHeader />
      <main className="studio-main">
            <nav className="studio-breadcrumb" aria-label="Navegação estrutural">
            <Link href="/">Anúncios</Link>
          <span aria-hidden="true">/</span>
          <span>{content.eyebrow}</span>
        </nav>
        <article className="studio-about">
          <p className="studio-kicker">{content.eyebrow}</p>
          <h1>{content.heading}</h1>
          {content.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          <ul>
            {content.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}
          </ul>
        </article>
        {(content.path === "/contato" ||
          content.path === "/privacidade" ||
          content.path === "/ajuda") && (
          <section className="studio-panel" aria-label="Canal oficial">
            <h2>Canal oficial</h2>
            {contact?.email || contact?.privacyEmail ? (
              <p>
                {content.path === "/privacidade" && contact.privacyEmail
                  ? "Privacidade e dados pessoais: "
                  : "Suporte e solicitações: "}
                <a
                  href={`mailto:${
                    content.path === "/privacidade"
                      ? contact.privacyEmail || contact.email
                      : contact.email || contact.privacyEmail
                  }`}
                >
                  {content.path === "/privacidade"
                    ? contact.privacyEmail || contact.email
                    : contact.email || contact.privacyEmail}
                </a>
              </p>
            ) : (
              <p>Canal de atendimento em configuração.</p>
            )}
            {contact?.operatorName && (
              <p>
                Responsável: {contact.operatorName}
                {contact.operatorDocument
                  ? ` — ${contact.operatorDocument}`
                  : ""}
              </p>
            )}
          </section>
        )}
        <section className="studio-panel">
          <h2>Precisa de ajuda com um perfil?</h2>
          <p>
            Volte aos anúncios, abra o perfil correspondente e use a ação de denúncia.
          </p>
          <Link className="studio-cta" href="/">Voltar aos anúncios</Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
