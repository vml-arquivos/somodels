import { Link, useLocation } from "wouter";
import Seo from "@/components/Seo";
import PublicShell from "@/components/PublicShell";
import ContactForm from "@/components/ContactForm";
import { trpc } from "@/lib/trpc";

const pages = {
  terms: {
    path: "/termos",
    title: "Termos de uso — Ero Models",
    description: "Regras de uso e de publicação de anúncios na Ero Models.",
    eyebrow: "Termos",
    heading: "Termos de uso",
    paragraphs: [
      "A Ero Models publica anúncios de acompanhantes adultos. Quem anuncia é responsável pelas fotos, vídeos, textos e informações que envia.",
      "Só pode anunciar quem tem 18 anos ou mais e usa fotos e vídeos próprios ou com autorização de quem aparece neles.",
      "Não é permitido: menores de idade, exploração, coerção, violência, golpe, uso da identidade de outra pessoa, imagem sem consentimento, atividade ilegal ou conteúdo que viole direitos de terceiros.",
      "O anúncio vai ao ar assim que você publica. A equipe pode ocultar ou remover qualquer anúncio que descumpra estas regras e suspender a conta. A Ero Models não participa do que for combinado entre quem anuncia e quem entra em contato.",
    ],
    bullets: [
      "Use só fotos, vídeos e dados que você pode publicar.",
      "Informe cidade e bairro, nunca o endereço completo.",
      "Viu algo errado? Denuncie direto no anúncio.",
    ],
  },
  privacy: {
    path: "/privacidade",
    title: "Privacidade — Ero Models",
    description: "Como a Ero Models trata e protege os seus dados.",
    eyebrow: "Privacidade",
    heading: "Privacidade e dados pessoais",
    paragraphs: [
      "Nas páginas públicas aparece só o que é preciso para achar um anúncio: fotos, nome do perfil, cidade, bairro e valores. O telefone e o WhatsApp não ficam na listagem; o número só é aberto quando o visitante, já com a idade confirmada, clica no botão de contato.",
      "Documentos, senhas e dados internos nunca aparecem em páginas públicas.",
      "Seguimos a Lei Geral de Proteção de Dados (LGPD). Guardamos só o necessário para criar a conta, proteger o site e atender pedidos. Não vendemos dados. Registros de segurança ficam pelo prazo que a lei exige e o restante é apagado ou anonimizado quando a conta é encerrada.",
    ],
    bullets: [
      "Você pode pedir acesso, correção ou exclusão dos seus dados pela página de contato.",
      "Não coloque documentos, senhas ou dados sensíveis em descrições ou denúncias.",
      "Mostre só cidade e bairro. Nunca publique o endereço da sua casa.",
    ],
  },
  safety: {
    path: "/seguranca",
    title: "Segurança — Ero Models",
    description: "Dicas de segurança para quem anuncia e para quem contata.",
    eyebrow: "Segurança",
    heading: "Dicas de segurança",
    paragraphs: [
      "A Ero Models tem confirmação de idade, denúncia em todos os anúncios e equipe para remover o que descumprir as regras. Mesmo assim, o encontro acontece fora do site e ninguém consegue garantir como ele será.",
      "O selo de verificada só confirma que a identidade foi conferida pela equipe. Não é garantia de conduta nem de segurança.",
      "Antes de marcar, combine tudo direto com a outra pessoa: valores, limites e condições. A conversa no WhatsApp ou por telefone não é controlada pela Ero Models.",
    ],
    bullets: [
      "Não pague adiantado nem faça Pix para \"garantir\" horário.",
      "Pare a conversa se houver pressão, ameaça, chantagem ou pedido estranho.",
      "Não passe documentos, códigos ou o endereço da sua casa.",
      "Em perigo, ligue 190. Para denunciar exploração de crianças e adolescentes, ligue 100.",
    ],
  },
  reports: {
    path: "/denuncia",
    title: "Denunciar — Ero Models",
    description: "Como denunciar um anúncio que descumpre as regras.",
    eyebrow: "Denúncias",
    heading: "Como denunciar",
    paragraphs: [
      "Abra o anúncio e toque em \"Denunciar anúncio\". Não precisa de conta. Escolha o motivo, conte o que aconteceu e envie. A equipe analisa e pode ocultar o anúncio enquanto confere.",
      "Casos com suspeita de menor de idade, exploração, coerção, violência, ameaça ou chantagem têm prioridade. Não coloque documentos, senhas ou provas sensíveis no texto da denúncia.",
      "Exploração sexual de crianças e adolescentes também pode ser denunciada no Disque 100, gratuito e sigiloso, todos os dias.",
      "Quem teve o anúncio removido pode pedir revisão pela página de contato.",
    ],
    bullets: [
      "Denuncie direto no anúncio para a equipe saber exatamente qual é.",
      "Conte os fatos de forma objetiva.",
      "Guardamos registros técnicos para segurança e para evitar abuso.",
    ],
  },
  help: {
    path: "/ajuda",
    title: "Ajuda — Ero Models",
    description: "Como criar e publicar um anúncio e como usar o site.",
    eyebrow: "Ajuda",
    heading: "Como funciona",
    paragraphs: [
      "Quem anuncia cria a conta, preenche o perfil, envia as fotos que quiser e publica. O anúncio entra no ar na hora, sem fila de aprovação. A equipe só age depois, se algo descumprir as regras.",
      "Quem procura escolhe a cidade e vê os anúncios. Dá para filtrar por bairro, categoria, idade, valor, serviços e local de atendimento. As informações são as que cada pessoa publicou.",
      "Para falar com quem anuncia, abra o anúncio e toque em WhatsApp ou ligar. Se algo parecer errado, use o botão de denúncia.",
    ],
    bullets: [
      "Esqueceu a senha? Peça um link novo pela página de contato.",
      "Planos em destaque são ativados pela equipe depois da confirmação do pagamento.",
      "A Ero Models não participa do combinado entre quem anuncia e quem contata.",
    ],
  },
  contact: {
    path: "/contato",
    title: "Contato — Ero Models",
    description: "Fale com a equipe da Ero Models.",
    eyebrow: "Contato",
    heading: "Fale com a gente",
    paragraphs: [
      "Use o formulário abaixo para suporte, dúvidas sobre planos, privacidade, recuperação de senha e pedidos de remoção.",
      "Para denunciar um anúncio, é mais rápido usar o botão de denúncia dentro dele.",
    ],
    bullets: [
      "Nunca mande senha, código ou documento por mensagem.",
      "Em denúncia urgente, escreva só o essencial.",
      "A equipe não pede pagamento por canais fora do site.",
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
  const showChannel =
    content.path === "/privacidade" ||
    content.path === "/ajuda" ||
    content.path === "/denuncia" ||
    (content.path === "/contato" &&
      Boolean(
        contact?.email || contact?.privacyEmail || contact?.operatorName
      ));
  const email =
    content.path === "/privacidade"
      ? contact?.privacyEmail || contact?.email
      : contact?.email || contact?.privacyEmail;
  return (
    <>
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
      <PublicShell narrow>
        <nav className="ep-breadcrumb" aria-label="Navegação">
          <Link href="/">Anúncios</Link>
          <span aria-hidden="true">/</span>
          <span>{content.eyebrow}</span>
        </nav>
        <article className="ep-doc">
          <p className="ep-eyebrow">{content.eyebrow}</p>
          <h1>{content.heading}</h1>
          {content.paragraphs.map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <ul>
            {content.bullets.map(bullet => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>
        {showChannel && (
          <section className="ep-box" aria-label="Canal oficial">
            <h2>Canal oficial</h2>
            {content.path !== "/contato" && (
              <p>
                Para suporte, privacidade, recuperação de senha e pedidos de
                remoção, use a página de <Link href="/contato">contato</Link>.
              </p>
            )}
            {email && (
              <p>
                E-mail: <a href={`mailto:${email}`}>{email}</a>
              </p>
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
        {content.path === "/contato" && <ContactForm />}
      </PublicShell>
    </>
  );
}
