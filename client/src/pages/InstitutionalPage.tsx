import { Link, useLocation } from "wouter";
import Seo from "@/components/Seo";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import { trpc } from "@/lib/trpc";

const pages = {
  terms: {
    path: "/termos",
    title: "Termos da plataforma — Só Models",
    description: "Regras de uso, publicação e moderação da Só Models.",
    eyebrow: "Regras da plataforma",
    heading: "Termos de uso e publicação",
    paragraphs: [
      "A Só Models é uma plataforma de portfólios profissionais. O titular é responsável pela veracidade, legalidade, autorização e atualização do material que envia.",
      "Não são permitidos menores, exploração, coerção, violência, fraude, impersonação, mídia sem consentimento, violação de privacidade, conteúdo ilegal ou material que infrinja direitos de terceiros.",
      "A publicação depende de revisão, aceite vigente e dos controles de identidade e consentimento disponíveis. Uma verificação não é garantia de comportamento, segurança ou resultado de qualquer interação.",
    ],
    bullets: [
      "Use apenas dados e imagens que você está autorizado a publicar.",
      "Mantenha cidade e disponibilidade atualizadas sem publicar endereço preciso.",
      "Denuncie conteúdo ou comportamento de risco pela jornada contextual.",
    ],
  },
  privacy: {
    path: "/privacidade",
    title: "Privacidade — Só Models",
    description: "Como a Só Models minimiza, protege e utiliza dados na plataforma.",
    eyebrow: "Privacidade",
    heading: "Privacidade e proteção de dados",
    paragraphs: [
      "A plataforma busca exibir somente o necessário para descoberta de portfólios. Telefone, WhatsApp e Telegram não fazem parte do payload público de descoberta; quando habilitado, o contato externo passa por uma intenção autenticada e controlada.",
      "Documentos, biometria, tokens, chaves e referências internas de armazenamento não devem aparecer em páginas públicas, logs comuns ou dados estruturados.",
      "O canal formal de privacidade, a entidade operadora, as bases legais e os prazos de retenção precisam ser definidos e revisados antes de um lançamento amplo. Esta página não substitui a política jurídica final.",
    ],
    bullets: [
      "Solicite correção, acesso ou exclusão pelo canal de privacidade que será divulgado antes do lançamento.",
      "Não envie documentos, senhas ou dados sensíveis em descrições públicas ou denúncias.",
      "A localização pública é aproximada; nunca publique endereço residencial.",
    ],
  },
  safety: {
    path: "/seguranca",
    title: "Segurança e confiança — Só Models",
    description: "Orientações de segurança, consentimento, verificação e contato responsável.",
    eyebrow: "Segurança e confiança",
    heading: "Descoberta responsável",
    paragraphs: [
      "A Só Models combina publicação consentida, revisão humana, proteção de mídia, controles de acesso e ferramentas de denúncia. Esses controles reduzem riscos, mas não eliminam riscos de uma interação fora da plataforma.",
      "Verificação de identidade ou idade, quando disponível, tem escopo específico e não representa endosso, garantia de conduta ou garantia de segurança pessoal.",
      "Ao sair para um canal externo, confirme identidade, limites, consentimento e condições diretamente com a outra pessoa. A conversa externa não é controlada pela Só Models.",
    ],
    bullets: [
      "Interrompa a interação diante de pressão, ameaça, extorsão ou pedido de pagamento suspeito.",
      "Não compartilhe documentos, códigos de autenticação ou endereço residencial.",
      "Em risco imediato, procure os serviços públicos de emergência adequados à sua localidade.",
    ],
  },
  reports: {
    path: "/denuncia",
    title: "Denúncias e remoção — Só Models",
    description: "Como denunciar perfil, mídia ou comportamento que viole as regras.",
    eyebrow: "Trust & Safety",
    heading: "Denúncias e resposta a incidentes",
    paragraphs: [
      "A denúncia contextual está condicionada à ativação operacional da fila de moderação. Quando habilitada, exige conta autenticada, registra um protocolo e encaminha o caso para triagem humana.",
      "Possível menor de idade, tráfico, exploração, coerção, violência, ameaça ou extorsão devem receber prioridade urgente. Não inclua documentos, senhas ou evidências sensíveis no campo de texto público.",
      "A plataforma pode ocultar ou suspender material durante a apuração. Prazos, retenção de evidências, recurso e escalonamento precisam seguir a política jurídica e operacional aprovada.",
    ],
    bullets: [
      "Use a denúncia no próprio perfil para preservar o contexto do alvo.",
      "Descreva fatos objetivamente e não exponha a pessoa denunciante.",
      "Não prometa anonimato absoluto: registros técnicos podem ser necessários para segurança e prevenção de abuso.",
    ],
  },
  help: {
    path: "/ajuda",
    title: "Ajuda — Só Models",
    description: "Orientações para titulares, visitantes, publicação, mídia e segurança.",
    eyebrow: "Central de ajuda",
    heading: "Como usar a plataforma",
    paragraphs: [
      "Titulares criam e atualizam um portfólio, aceitam o termo vigente e enviam o conteúdo para revisão. A publicação só ocorre após os gates de moderação e identidade aplicáveis ao ambiente.",
      "Visitantes podem pesquisar por cidade e categoria quando a vitrine estiver aberta. Filtros não devem ser usados para inferir localização precisa, atributos sensíveis ou disponibilidade que não tenha sido informada pelo titular.",
      "Se uma mídia, perfil ou contato parecer irregular, interrompa a interação e use o fluxo de denúncia. Não tente contornar age gate, autenticação, bloqueio ou proteção de armazenamento.",
    ],
    bullets: [
      "Login, titular, admin, reset de senha e validações são áreas privadas e não devem ser indexados.",
      "A vitrine pode permanecer fechada até providers e políticas serem homologados.",
      "Pagamentos e conteúdo de criadores 18+ permanecem desligados até existir módulo e aprovação específicos.",
    ],
  },
  contact: {
    path: "/contato",
    title: "Contato — Só Models",
    description: "Canais e orientações para contato com a Só Models.",
    eyebrow: "Contato",
    heading: "Fale com a plataforma",
    paragraphs: [
      "O contato com titulares, quando habilitado, é uma saída controlada para um canal informado pelo próprio titular. A Só Models não controla a conversa depois que ela sai da plataforma.",
      "O canal formal para privacidade, solicitações jurídicas e incidentes deve ser configurado pelo operador antes do lançamento público. Não inventamos um endereço de suporte ou uma identidade jurídica que ainda não foi homologada.",
      "Para denunciar um perfil, prefira a ação contextual no próprio perfil. Para uma conta administrativa, use o login e os canais internos definidos pelo operador.",
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
          <Link href="/">Vitrine</Link>
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
        <section className="studio-panel">
          <h2>Precisa de ajuda com um perfil?</h2>
          <p>
            Volte à vitrine, abra o perfil correspondente e use a ação de denúncia quando ela estiver habilitada para o ambiente.
          </p>
          <Link className="studio-cta" href="/">Voltar à vitrine</Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
