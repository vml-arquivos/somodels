# Reformulação da home Ero Models — landing page de marketplace

## Etapa 2 — refinamento visual e editor completo de conteúdo

**Status:** concluída no checkout local; typecheck, 102 testes, build, diff e inspeções desktop/mobile aprovados. A publicação em produção permanece separada deste checkpoint até uma confirmação explícita de merge/deploy.

O screenshot reenviado é tratado como referência de ritmo, escala e composição, não como fonte para copiar marca, textos, imagens ou elementos proprietários. A etapa 2 deve corrigir hierarquia tipográfica, espaçamento, largura de leitura, contraste e comportamento em desktop, mobile e PWA. Toda copy editorial visível da home — navegação contextual, hero, links rápidos, confiança, CTA de titular, catálogo, estados vazios, busca guiada, categorias, sobre e rodapé — passa a vir de um objeto de settings versionado, editável pela aba “Página inicial” do painel admin. Rotas e valores funcionais continuam protegidos: o admin edita rótulos e mensagens, mas não pode apontar links para hosts externos nem alterar gates de publicação.

### Decisões de implementação da etapa 2

- ampliar `shared/portfolio.ts` com um schema de conteúdo editorial completo e defaults seguros;
- normalizar settings legados no carregamento, fazendo merge profundo com defaults para não exigir migration nem quebrar JSON já salvo;
- atualizar `Home.tsx`, `StudioHeader` e `PublicFooter` para consumir o conteúdo público configurável, mantendo labels de erro, loading e segurança mínimos e estáveis;
- reorganizar o editor admin em blocos por seção, com campos curtos, textareas para descrições e preview da home, sem permitir HTML arbitrário;
- revisar `studio.css` com tokens de tipografia, larguras fluidas, `clamp()`, breakpoints mobile/PWA, foco visível, safe-area e prevenção de overflow horizontal;
- validar a composição em viewport desktop e mobile pelo preview, além de typecheck, testes, build e smoke das rotas existentes antes de qualquer publicação.

## Etapa 3 — correção visual pós-publicação e acesso DEV

**Status:** correção visual validada no preview local; publicação ainda pendente. O acesso DEV será ajustado somente após a identificação da conta configurada e a definição segura de uma nova senha.

O screenshot de produção mostrou que os defaults preservados deixaram a mudança visual pouco perceptível e que settings antigos ainda exibiam o branding “Só Models” no rodapé. Esta etapa aumenta a escala e o contraste tipográficos da landing, reforça a navegação e os cards, reduz a sensação de texto pequeno, normaliza branding legado sem migration e mantém as rotas de cliente, titular, admin e DEV sob as mesmas guards existentes.

## Etapa 4 — navegação lateral administrativa

**Status:** concluída no checkout local; `pnpm check`, 153 testes, build de produção e `git diff --check` aprovados. Nenhuma migration, flag ou segredo foi alterado.

O painel administrativo agora usa um sidebar fixo no desktop e um drawer acessível no mobile/PWA. As áreas são agrupadas em Principal, Pessoas, Conteúdo, Atendimento, Comercial, Site e Sistema; cada função recebe somente seus itens já permitidos pelo contrato de RBAC. Usuários podem abrir cada seção por URL direta (`/admin/usuarios`, `/admin/anuncios`, `/admin/moderacao`, `/admin/denuncias`, `/admin/verificacoes`, `/admin/mensagens`, `/admin/planos`, `/admin/financeiro`, `/admin/pagina-inicial`, `/admin/prontidao`, `/admin/auditoria` e `/admin/seguranca`).

Badges são calculados no servidor pela nova consulta `management.navigationCounts` e filtrados pelo escopo efetivo antes de chegar ao browser. O fallback `/admin/:section` retorna para `/admin` quando o slug não existe ou a função não tem permissão; a exigência de MFA continua travando o menu na área Segurança. O estado de recolhimento é local ao navegador, o drawer tem foco inicial, trap de Tab, Escape e retorno de foco, e os estilos têm prefixo `ad-` para não contaminar a vitrine pública.

## Etapa 5 — validação automática pós-deploy

**Status:** concluída no checkout local; o smoke passou em produção com 38/38 verificações. O CI agora executa o smoke automaticamente em todo push na `main`, aguardando o rollout do Coolify por até 18 tentativas.

O smoke não precisa de senha, login manual ou alteração de dados: verifica healthcheck e banco nos três hosts, rotas públicas e administrativas, redirecionamentos `conta.*`/`admin.*`, assets PWA, robots, sitemaps, flags de produção e o envelope tRPC de uma tentativa fictícia de login. A automação reduz trabalho operacional, mas mantém RBAC, MFA, aprovação de anúncios/mídias e todas as autorizações do backend.

## Objetivo

Transformar a home em uma landing page editorial de marketplace adulto: hero visual forte, busca acionável, prova de segurança, descoberta por categorias/localidades, cadastro contextual de titulares e rodapé institucional. A referência enviada orienta ritmo, composição e hierarquia, mas não serão copiados marca, textos, imagens, métricas ou componentes de terceiros.

## Critérios de produto

- A primeira tela deve responder imediatamente: o que é a Ero Models, para quem é e como encontrar um perfil.
- A busca por cidade e perfil deve estar visível sem texto explicativo longo.
- O catálogo exibido deve usar somente dados públicos elegíveis; não criar números, avaliações, perfis ou veículos de imprensa fictícios.
- Cadastro de titular deve existir como CTA contextual, sem competir com a busca principal.
- Segurança, maioridade, privacidade, moderação e denúncia devem aparecer como sinais curtos e verificáveis.
- A página deve ser responsiva, acessível, rápida e compatível com o PWA já publicado.
- Rotas privadas, age gate, RBAC, tRPC, flags e APIs existentes permanecem preservados.

## Direção visual escolhida

**Marketplace editorial plum + coral — probabilidade 0,72.** Uma composição arejada, com blocos de alto contraste, hero com recorte visual, CTA coral, superfícies claras e uma faixa escura dedicada à busca avançada.

**Principais características:** editorial, seguro, direto e adulto sem excesso de ornamentação.

### Princípios

1. Clareza antes de explicação: títulos curtos, CTAs diretos e uma ação primária por seção.
2. Prova antes de promessa: apresentar apenas indicadores derivados de dados ou capacidades reais do produto.
3. Ritmo de landing page: hero, descoberta, segurança, cadastro, categorias/localidades e institucional.
4. Privacidade visível: não expor contatos, perfis fictícios ou conteúdo premium desativado.

### Paleta e tipografia

- Base: plum profundo e off-white do sistema Ero Models.
- Acento: coral/vinho da marca, reservado para ações e destaques.
- Faixa de busca: azul-plum escuro com chips claros.
- Tipografia: Manrope existente; contraste forte em títulos e corpo curto.

### Layout e assinatura

- Hero dividido em texto/busca e imagem existente `ero-models-hero.webp`.
- Cards horizontais e faixas de largura total, evitando uma sequência de painéis administrativos.
- Linha decorativa sutil inspirada no símbolo da marca, criada em CSS; não reproduzir elementos proprietários do screenshot.
- Cards de categorias e cidades com links reais para `/categoria/*` e `/cidade/*`.

### Voz

- Títulos: objetivos e comerciais, sem linguagem de IA ou parágrafos defensivos.
- CTAs: “Buscar perfis”, “Ver anúncios”, “Criar meu perfil”.
- Segurança: frases curtas como “Publicações revisadas” somente quando correspondentes às regras atuais.

## Implementação

- Reestruturar `client/src/pages/Home.tsx` em seções pequenas e semânticas, preservando DiscoveryPage, age gate, SEO e query string.
- Adicionar endpoints/queries somente quando a seção precisar de dados reais; reutilizar `profiles.list`, `profiles.locations`, categorias e settings existentes.
- Criar dados derivados de cidades/categorias a partir do catálogo público; quando vazio, renderizar estado neutro em vez de números inventados.
- Reaproveitar `ListingCard`, `StudioHeader`, `PublicFooter`, logo e hero existentes.
- Adicionar classes de landing page em `client/src/studio.css`, com breakpoints mobile e foco visível.
- Manter PWA, manifest, service worker e rotas privadas sem alteração comportamental.
- Atualizar o TODO e changelog com a reformulação e evidências.

## Estrutura do projeto envolvida

- `client/src/pages/Home.tsx`: composição da landing e descoberta.
- `client/src/components/ListingCard.tsx`: cards públicos de anúncios.
- `client/src/components/StudioHeader.tsx`: navegação e CTA de instalação.
- `client/src/components/PublicFooter.tsx`: links institucionais.
- `client/src/studio.css`: tokens, blocos de landing, cards e responsividade.
- `server/routers.ts` e `server/db.ts`: somente consultas públicas já autorizadas, se necessário.
- `shared/portfolio.ts`: categorias e copy configurável.
- `client/public/images/hero`: asset visual existente.

## Limites

Não implementar checkout, premium, avaliações reais inexistentes, login social, age assurance de provider, mídia de terceiros, dados de imprensa, métricas de audiência ou cadastro automático de perfis sem revisão. Essas capacidades continuam dependentes das flags e dos providers já documentados.
