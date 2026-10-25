# Reformulação da home Ero Models — landing page de marketplace

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
