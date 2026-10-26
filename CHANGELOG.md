# Changelog

## 2026-10-26 — aceite único, localização estruturada e vitrine com perfis reais

- cadastro público exige um único aceite de conta para maioridade, responsabilidade/autorização dos dados e vedação de conteúdo de menores, não consensual ou ilícito; o registro é versionado e auditado, e contas antigas recebem um painel de confirmação única nas áreas Cliente e Titular;
- o anúncio não solicita novamente os mesmos termos por perfil. Upload e publicação mantêm apenas os controles operacionais e server-side aplicáveis, como ownership, tipo/tamanho de arquivo, identidade configurada e completude;
- formulário do titular usa Estado → cidade/município → bairro ou região aproximada, com 27 listas de municípios carregadas sob demanda e regiões administrativas selecionáveis no DF. A migration aditiva `0012_profile_neighborhood.sql` cria somente `profiles.neighborhood`;
- telefone brasileiro aceita DDD válido e celular com nove dígitos; a localização é validada novamente no servidor antes da publicação e cartões/perfil público exibem somente cidade, UF e bairro/região aproximada;
- o upload permite selecionar múltiplas fotos e vídeos em fila sequencial, com resultado por arquivo e continuidade após falhas. Mídia do titular continua autoaprovável quando configurada, sem reabrir revisão manual por padrão;
- `AUTO_PUBLISH_ENABLED=true` deixa o titular publicar diretamente somente após os gates automáticos. Com `false`, o mesmo comando encaminha o anúncio à fila administrativa; suspensão, ocultação, rejeição, denúncias e auditoria continuam disponíveis;
- a Home usa somente perfis públicos elegíveis no hero rotativo e mantém a arte neutra quando o catálogo está vazio. A busca de cidade passou a usar o catálogo público selecionável;
- corrigido o middleware Vite de desenvolvimento: a configuração funcional agora é resolvida antes do servidor, evitando que `/src/main.tsx` caísse no fallback HTML e resultasse em tela branca no preview local;
- fonte e limitação temporal do catálogo municipal documentadas em `docs/LOCATIONS.md`; validação local desta etapa: typecheck, 171 testes, build e `git diff --check` aprovados. Deploy e aplicação da migration permanecem pendentes de aprovação explícita.

## 2026-10-26 — fluxo simplificado do titular e galeria

- dados pessoais editáveis no painel do titular e na área do cliente, com e-mail de acesso somente leitura e retorno seguro após troca de senha;
- rascunhos agora aceitam o primeiro salvamento parcial, geram slug interno único, preservam ownership e podem ser retomados por `/titular?profileId=...` sem iniciar outro anúncio;
- publicação direta do titular disponível quando o anúncio está completo, ativo, com termo vigente e mídia aprovada; suspensão, pendência e rejeição administrativa continuam bloqueios server-side;
- categorias, estado, idiomas, características, preferências, contatos, formas de pagamento, locais e serviços usam seleção por chips com checkboxes acessíveis; a descrição continua livre para contexto pessoal;
- `POST /api/upload/media` exige consentimento explícito, cria o registro da mídia no mesmo fluxo, retorna `mediaId` e limpa o objeto armazenado quando a gravação falha; mídia do próprio titular pode ser autoaprovada por `OWNER_MEDIA_AUTO_APPROVE`, enquanto uploads administrativos permanecem pendentes;
- a mutation legada que aceitava `storageKey`/URL arbitrária foi removida do router público; ocultar ou alterar metadados de mídia despublica o anúncio para nova confirmação;
- página pública do perfil exibe galeria responsiva com selo discreto de vídeo e formas de pagamento quando publicadas; migration `0011_talented_ares` adiciona somente `profiles.paymentMethods`;
- validação local anterior: `pnpm check`, 157 testes, `pnpm build` e `git diff --check` aprovados; os gates serão repetidos após esta simplificação. Ajuda por IA para descrição permanece desativada até haver provider/modelo configurado e auditável.

## 2026-10-26 — navegação lateral administrativa

- painel administrativo reorganizado em sidebar fixo no desktop e drawer acessível no mobile/PWA, com agrupamentos Principal, Pessoas, Conteúdo, Atendimento, Comercial, Site e Sistema;
- URLs diretas para cada área, fallback seguro de slug inexistente/sem permissão para `/admin`, recolhimento persistido apenas no navegador e foco inicial, trap de Tab, Escape e retorno de foco no drawer;
- badges de pendências entregues por `management.navigationCounts`, filtrados no servidor pelo escopo efetivo para não revelar contadores de áreas não autorizadas; MFA pendente mantém o menu travado em Segurança;
- preservados o conteúdo das abas, tRPC, RBAC, age gate, rotas públicas, banco, flags e migrations; validação local: `pnpm check`, 153 testes, `pnpm build` e `git diff --check` aprovados.
- mapa de dashboards e entrada DEV documentado em `docs/ACCESS-MAP-2026-10-26.md`, sem salvar senha ou token no código, no ZIP ou no chat.
- `pnpm smoke:prod` ampliado para 38 verificações automáticas de produção e incluído no CI após push na `main`, com retries para aguardar o rollout do Coolify; o smoke confirma healthcheck, rotas, PWA, flags e envelope tRPC sem credenciais reais.

## 2026-10-26 — funções da equipe (moderador, suporte, financeiro, auditoria)

- cada administrador pode ter uma função: Moderador (anúncios, moderação, denúncias, verificações), Suporte (contas e mensagens do Fale conosco), Financeiro (planos, assinaturas e caixa) ou Auditoria (somente leitura); sem função definida continua com acesso total, então nada muda para quem já é administrador;
- o bloqueio é feito no servidor em cada rota do painel (não só escondendo abas); função desconhecida não recebe nenhum acesso; só Acesso completo altera a página inicial e anonimiza contas; o envio de mídia por outro titular exige a permissão de editar anúncios;
- o painel mostra só as abas permitidas à função e esconde botões de ação sem permissão; em Usuários → Administradores há a escolha da função (só Super administrador e Desenvolvedor podem definir) e a lista mostra a função de cada pessoa; trocas ficam no registro de auditoria;
- migration `0010_admin_function` (uma coluna nova em `users`); o `/healthz` confere a coluna.

## 2026-10-26 — mídia funcionando e novo painel de contas

- armazenamento de fotos e vídeos: o sistema só sabia usar um serviço interno da plataforma antiga, ausente no Coolify, e por isso o envio falhava ("Não foi possível armazenar a mídia"); agora há três modos (`STORAGE_DRIVER`): `local` (volume em `/app/storage`, padrão), `s3` (S3, R2, Spaces, MinIO) e `forge` (legado). O modo local entrega vídeos com suporte a Range e protege contra caminhos fora da pasta; a aba Prontidão bloqueia se a pasta não estiver em volume persistente;
- aba Usuários refeita: Clientes (sem anúncio), Titulares (com anúncio) e Administradores em áreas separadas, com contadores, busca com atraso, filtro de situação, avatar, ficha com suspender/reativar, link de senha, anúncios vinculados, zona de risco com confirmação, e níveis de acesso (Administrador, Super administrador, Desenvolvedor); só o desenvolvedor concede Super administrador; no celular a ficha ocupa a tela com botão de voltar;
- `/healthz` e prontidão passam a considerar o novo armazenamento.

## 2026-10-26 — preparação para entrar no ar

- textos de Privacidade, Denúncia, Ajuda, Contato, Cadastro e Segurança reescritos sem linguagem de pré-lançamento, e sem contradizer a página de planos;
- formulário "Fale conosco" em /contato (suporte, recuperação de senha, privacidade, remoção), com limite de 5 envios por hora por IP e campo anti-robô; as mensagens ficam na nova aba Mensagens do admin, com marcação de atendida e auditoria (migration `0009_contact_messages`);
- e-mail de contato, e-mail de privacidade, nome e documento do responsável são opcionais (`CONTACT_EMAIL`, `PRIVACY_EMAIL`, `OPERATOR_NAME`, `OPERATOR_DOCUMENT`) e só aparecem nas páginas quando preenchidos; a aba Prontidão apenas avisa;
- `/healthz` passa a conferir também as colunas e tabelas da migration 0008, para o Coolify não manter no ar uma versão à frente do banco;
- `scripts/smoke-prod.mjs`: teste de 20 verificações pós-deploy (healthz dos três hosts, redirecionamentos, robots, sitemap, páginas públicas, vitrine aberta, canal de contato);
- roteiro do dia em `docs/GO-LIVE.md`.

## 2026-10-26 — revisão visual de todas as páginas

- home: o título do topo não passa mais por baixo da foto (tamanho fluido por largura de tela);
- títulos e textos que ficavam invisíveis (faixa escura "Filtre pelo que importa", cartões do catálogo e de categorias) agora têm contraste correto; a landing usa paleta clara própria e o botão de tema não aparece nela;
- busca do topo com dois campos e botão em largura total; filtros e contadores da vitrine alinhados;
- cabeçalhos de seção alinhados à esquerda do conteúdo (antes ficavam recuados) e espaçamento vertical menor entre seções;
- bloco "Sobre" deixa de virar coluna estreita no celular;
- páginas de texto (como anunciar, termos, ajuda, planos) com tamanho de letra, listas numeradas e largura de linha confortáveis;
- rodapé com colunas alinhadas no celular e texto mais legível;
- conferido em 360, 390, 768, 1024 e 1440 px, sem rolagem horizontal em nenhuma página testada (home, cidade, categoria, planos, como anunciar, calculadora, termos, privacidade, segurança, denúncia, ajuda, contato, login, cadastro, titular, conta e admin). As telas foram checadas com dados simulados; confira também com anúncios reais.

## 2026-10-26 — pronto para receber cadastros: planos, segurança do admin e vitrine completa

- migration `0008_plans_mfa_availability`: tabela `user_mfa`, campos novos em `plans` (destaque, duração, ordem, benefícios), em `subscriptions` (origem, observação, quem ativou) e `availableUntil` em `profiles`;
- página pública `/planos` e painel do admin para criar planos, registrar pedidos e ativar a assinatura manualmente (Pix fora da plataforma), com lançamento financeiro e auditoria;
- anúncios de planos em destaque aparecem primeiro e sempre com o rótulo "Patrocinado", somente com `SPONSORED_LISTINGS_ENABLED=true`;
- verificação em duas etapas (TOTP) para contas de admin, com segredo criptografado e proteção contra reuso do código; `ADMIN_MFA_REQUIRED=true` passa a exigir o cadastro antes do acesso ao admin;
- "Disponível agora" com validade escolhida pelo titular, sem precisar reenviar o anúncio para revisão;
- painel do titular com nota de qualidade do anúncio, comparação com o período anterior e situação do plano;
- aba "Prontidão" no admin: lista o que ainda impede abrir a vitrine e receber cadastros;
- vitrine mostra o total de anúncios e "Página X de Y"; páginas de cidade e categoria têm texto próprio;
- sitemap com todos os anúncios, cidades e categorias (antes limitado a 60);
- Disque 100 no rodapé e na página de denúncia;
- `/healthz` e `/api/release` passam a mostrar o commit real do deploy (o Dockerfile grava `SOURCE_COMMIT`), que tem prioridade sobre `APP_RELEASE`;
- validação local: `pnpm check`, suíte completa (126 testes), `pnpm build` e conferência do SQL gerado; sem teste contra MySQL real.

## 2026-10-25 — competitividade: busca por preço e serviço, verificação manual e métricas

- migration `0007_profile_discovery` adiciona `priceFromCents`, `services` e `attendancePlaces` (opcionais) e o índice `profiles_price_idx`; o healthcheck passa a validar essas colunas;
- vitrine com filtros de preço, serviço, local de atendimento e identidade verificada, ordenação por menor preço e URLs compartilháveis; cartão e página do anúncio mostram "a partir de", selo de verificação, local e serviços;
- formulário do titular e do admin com os novos campos, validados por vocabulário controlado em `shared/discovery-options.ts`;
- fluxo manual de verificação de identidade: pedido pelo titular, fila e decisão no admin (aprovação por 12 meses ou recusa com motivo), auditoria, bloqueio de autoaprovação e limite de pedidos; nenhum documento é armazenado;
- métricas diárias agregadas (visualizações e cliques de contato), sem IP ou identificador, e painel de desempenho no anúncio publicado;
- páginas `/como-anunciar` e `/calculadora-de-ganhos`, incluídas no sitemap e no rodapé;
- análise e plano em `docs/ROADMAP-COMPETITIVO.md`;
- validação local: `pnpm check`, suíte completa (116 testes), `pnpm build` e conferência do SQL gerado; não houve teste contra MySQL real nesta etapa.

## 2026-10-25 — correção visual pós-publicação

- a revisão do screenshot real mostrou que a etapa anterior tornou o conteúdo configurável, mas preservou defaults e settings antigos o suficiente para a mudança pública parecer pequena;
- a landing recebeu uma segunda calibração visual, com navegação maior, headline e corpo mais legíveis, contraste reforçado, cards com hierarquia mais clara e ritmo mais equilibrado entre seções;
- settings persistidos que ainda contêm “Só Models” ou “So Models” são normalizados para “Ero Models” no carregamento, sem migration e sem apagar a possibilidade de editar a copy pelo admin;
- validação local: `pnpm check`, suíte completa (`103 testes`), build, Prettier e `git diff --check` passaram; Chromium mobile `390x844` confirmou `document.scrollWidth === 390` após a nova calibração.

## 2026-10-25 — landing editorial de marketplace

- a home foi reorganizada em hero visual, busca acima da dobra, links rápidos, sinais de segurança, CTA contextual para titulares, catálogo, busca avançada, categorias/localidades e rodapé institucional;
- o texto foi reduzido para títulos e ações diretas, mantendo o age gate, SEO, filtros compartilháveis, PWA e rotas privadas existentes;
- a apresentação usa o hero e a identidade Ero Models já versionados; não foram copiados marca, textos, imagens ou métricas da referência visual enviada;
- perfis, cidades e localidades continuam vindo somente das consultas públicas elegíveis; quando não há publicação, a interface exibe estado neutro e CTA de cadastro, sem números ou anúncios fictícios;
- preservados os settings administráveis da vitrine, normalização dos filtros de idade, navegação semântica do rodapé e JSON-LD consolidado para rotas de cidade/categoria;
- toda a copy editorial visível da home, header e footer agora vem de `home` estruturado, validado por Zod e editável no painel admin por seções, sem HTML arbitrário ou destinos externos configuráveis;
- a entrada 18+ recebeu layout próprio para desktop, mobile e PWA, e o headline deixou de quebrar palavras no meio; o header usa o logo de contraste correto na landing clara mesmo com tema escuro persistido;
- validação local: `pnpm check`, suíte completa (`102 testes`), `pnpm build`, Prettier nos arquivos TypeScript/documentais e `git diff --check` passaram; a captura desktop confirmou hero, cards e CTA, enquanto a captura Chromium mobile (`390x844`) confirmou `document.scrollWidth === 390`, hero empilhado, busca vertical e footer dentro do viewport.

## 2026-10-22 — descoberta mobile, PWA e controles de conta

- a vitrine ganhou filtros compartilháveis por cidade/região, categoria, característica, idade, disponibilidade atual e ordenação; as sugestões de localização vêm somente de anúncios públicos elegíveis;
- o CTA de anunciante saiu do hero principal e permanece em contexto de titular/cadastro, enquanto a busca ganhou filtros rápidos, painel avançado, resumo de resultados e layout responsivo para telas pequenas;
- adicionados manifest, ícones 192/512, registro de service worker, atalhos de instalação e fallback offline sem cachear respostas `/api/` ou dados privados;
- a conta do cliente agora permite atualizar nome, encerrar a própria conta com senha e confirmação `EXCLUIR`, apagar preferências privadas e despublicar anúncios; o titular pode arquivar logicamente seus próprios anúncios, sempre com ownership backend;
- pesquisa de referências registrada em `docs/UX-PWA-RESEARCH-2026-10-22.md`; foram adotados padrões funcionais de localização/filtros e requisitos oficiais de PWA, sem copiar marca, textos, imagens ou identidade de terceiros;
- validação local: `pnpm check`, suíte completa com `99 testes`, `pnpm build` e `git diff --check` passaram; o PR #25 foi mesclado no commit `52601e8f8c22f036d3c4df900a600762b5756191`;
- o deployment `ixhkta5tyocwfaii98sdjyfn` terminou `Success` no Coolify, com healthcheck saudável e `database: true`; os três hosts retornaram manifest PWA, `auth.me` e `profiles.locations` em envelope tRPC válido;
- smoke final confirmou `eromodels.com.br` 200, `conta.eromodels.com.br/` → `/conta`, `admin.eromodels.com.br/` → `/admin`, `manifest.webmanifest` com ícones 192/512 e `sw.js` servido como JavaScript;
- `/api/release` continua reportando `2a9a43e2ee9cfe837a77afdfa141bb249c3a4f98` por causa do metadata `APP_RELEASE`; isso não impediu o healthcheck nem o funcionamento do novo runtime, e a variável não foi alterada nesta entrega.

## 2026-10-22 — roteamento privado por hostname e deploy controlado

- o servidor passou a redirecionar `/` de `conta.eromodels.com.br` para `/conta` e de `admin.eromodels.com.br` para `/admin`, mantendo RBAC backend e sem compartilhar cookie entre hosts;
- `robots.txt` e `sitemap.xml` ficam fail-closed nos hosts privados para evitar indexação ou canonical incorreto;
- DNS/Cloudflare dos dois hosts foi confirmado e os três domínios exatos foram associados no Coolify, com HTTP → HTTPS e `DNS matches`;
- `pnpm check`, suíte completa (`84 testes`), build e testes de host routing passaram; o deploy `nd415rf8z5i6irutfozsdvjc` de `176f80576bcff79ad576ddf7dec1330b03db1e38` terminou `Success`, com `database: true`;
- `/api/release` ainda reporta `2a9a43e2ee9cfe837a77afdfa141bb249c3a4f98` por causa do metadata `APP_RELEASE`; a tentativa de corrigir somente essa variável no editor Coolify respondeu 500 e não foi repetida, sem mudança parcial observada;
- smoke final confirmou `/` → `/conta` e `/admin`, rotas 200, `robots.txt` privado e sitemap vazio;
- nenhuma variável adicional, secret, migration, flag ou provider foi criado para esta fatia.

## 2026-10-21 — preflight e conta do cliente

- registrada a fotografia da Etapa A em `docs/PREFLIGHT-2026-10-21.md`, incluindo a divergência entre `main` (`95a7ab1`) e o release público (`a8e5a8e`), o alvo Coolify de produção e os gates ainda pendentes;
- criada matriz de papéis e permissões em `docs/ROLE-PERMISSION-MATRIX-2026-10-21.md` e ADR de separação de vitrine, conta e administração em `docs/ADR-0002-account-and-host-separation.md`;
- adicionadas as rotas privadas `/conta` e `/cliente`, com dados básicos da conta, favoritos, bloqueios, acompanhamento das próprias denúncias e mensagem honesta de que checkout/premium continuam indisponíveis;
- alinhada a autoridade administrativa efetiva entre allowlist `ADMIN_EMAILS`, login, console, upload e preview HTTP, sem promover o papel persistido nem remover a separação de funções;
- corrigido o reset de senha para aceitar o token base64url realmente emitido pela aplicação, com a suíte existente atualizada para reproduzir o formato real;
- adicionados endpoints autenticados para editar título/descrição de mídia e reordenar a galeria por ownership; alterações de metadados em mídia aprovada retornam o item para revisão;
- o perfil público agora representa conteúdo premium aprovado sem expor URL ou simular checkout, enquanto fotos/vídeos gratuitos continuam com player/galeria normais;
- o cabeçalho público e a área do titular passaram a oferecer acesso claro à conta, exploração e logout;
- a alteração não cria migration, não ativa flags, não configura DNS/host, não altera secrets e não executa deploy.

## Próxima versão — reconciliação de produção

A administração de perfis passou a ter ciclo de vida explícito e auditado: busca por nome/slug/cidade, filtros de ativo/inativo/excluído, edição de qualquer perfil não excluído, ativação, inativação, restauração e exclusão lógica com confirmação pelo slug. Perfis inativos ou excluídos não aparecem na publicação, não aceitam novos uploads e não podem ser aprovados sem passar novamente pelos gates. A tela de novo perfil foi reescrita com copy profissional da Ero Models, formulário vazio por padrão, placeholders orientativos, localização aproximada e descrição editorial focada em experiência, especialidades e projetos.

A identidade pública foi personalizada para **Ero Models**: símbolo vetorial monolinear refinado, lockups claro/escuro, favicon, social card, paleta plum/vinho/blush, tipografia e guia de uso em `docs/BRAND-IDENTITY-EROMODELS.md`. A home recebeu hero editorial otimizado em WebP, navegação pública orientada a descoberta, busca e categorias, metadados e fallbacks executáveis alinhados ao domínio `eromodels.com.br`, e as artes hero antigas sem referências foram removidas. A abertura pública, os gates de idade/identidade, contato, pagamentos e indexação continuam subordinados às flags fail-closed existentes.

A entrega seguinte completa a operação de portfólios: cadastro real de titular com rate limit, rota administrativa `/admin/portfolio/novo` com CTA, preparação de mídia por admin auditada, checklist backend de publicação, motivos obrigatórios em ajustes/suspensão, status operacional do titular, links privados de ligação e WhatsApp derivados de telefone normalizado, copy de home orientada a produto, fallback sem JavaScript e JSON-LD seguro de perfil. A copy legada é substituída por fallback reversível em código, sem migration de dados, porque o Coolify não tem backups agendados verificáveis. As flags de contato externo, KYC, age assurance, pagamentos e conteúdo de risco permanecem desligadas quando não há provider e operação aprovados.

A auditoria de 2026-09-20 documentou a divergência entre o release público e o último deployment observado no Coolify, sem executar novo deploy. O servidor passou a renderizar SEO por rota, separar sitemaps fail-closed, expor páginas institucionais responsáveis, suportar categorias canônicas e aplicar rate limiting com expiração em login, upload, denúncias e contato. As capabilities adultas, KYC, pagamentos e providers continuam desligadas.

A aplicação recebeu controles de sessão local com armazenamento server-side revogável, bootstrap seguro de super admin e dev, rotação obrigatória de senha temporária, rate limiting de login, serialização de usuário sem hashes e autorização para os papéis privilegiados.

O schema Drizzle foi ampliado com verificação de idade, identidade/KYC, sessões, tokens de e-mail e reset, moderação, auditoria, favoritos, disponibilidade, tours, planos, assinaturas, carteira e ledger de créditos, analytics, avaliações, bloqueios e eventos idempotentes. A migration `0002_certain_carlie_cooper.sql` é forward-only e inclui preenchimento de hash de storage antes da restrição `NOT NULL`.

O storage passou a exigir sessão de idade aprovada, publicação do perfil, aprovação da mídia e entitlement para mídia premium. O upload passou a usar chaves aleatórias, limites, validação base64 e assinaturas binárias. A aplicação ganhou headers de segurança, `trust proxy`, CORS de origem para mutações, healthcheck com status do banco, endpoint de release, robots e sitemap.

A abertura pública, o KYC efetivo e os pagamentos continuam desligados até a configuração e o teste de provedores reais e a aprovação jurídica/comercial correspondente.

## 2026-09-17 — fundação Trust & Safety e hardening de produção

- adicionadas capability flags fail-closed para marketplace adulto, acompanhantes, age assurance, identity, secure contact, sponsored listings, creator content 18+, favoritos, bloqueios e denúncias;
- contatos brutos removidos dos payloads públicos de listagem e perfil;
- adicionado fluxo autenticado de intenção de contato com age gate, bloqueio bilateral e aceite vigente do titular;
- adicionados favoritos e bloqueios com autorização backend e auditoria;
- adicionadas denúncias categorizadas/priorizadas, dedupe de caso aberto, fila administrativa e trilha de decisão em audit log;
- perfil ganhou ações de favorito, bloqueio, denúncia e contato controlado, todas protegidas por flags;
- painel admin ganhou fila Trust & Safety;
- build de produção deixou de carregar plugins de instrumentação de preview/editor;
- rotas passaram a lazy loading e o build ganhou budget automatizado de chunk;
- documentação de ADR, flags, segurança, moderação, contato e rollback consolidada;
- migrations históricas `0000`–`0005` preservadas sem alteração;
- checkpoint do Work validado com 113 testes, TypeScript, build e smoke HTTP local verdes.

### Ajuste final de integridade do pacote

- limita a descrição da denúncia pública a 200 caracteres para manter o payload JSON dentro do `varchar(500)` legado de `moderation_cases.reason`, inclusive no pior caso de escape, sem alterar migration histórica;
- adiciona `docs/FINAL-PACKAGE-VALIDATION.md` com proveniência do checkpoint, hashes das migrations e critérios de empacotamento.

## 2026-09-17 — hotfix de build do contato seguro

- corrige a tipagem dos métodos de contato em `ProfilePage.tsx`, eliminando o `TS7006` no callback da lista de canais;
- remove a mutação incompatível do retorno de `getPublicProfile()` em `server/routers.ts` e passa a retornar um novo payload sanitizado, eliminando o `TS2353` de `availableContactMethods`;
- mantém a remoção de telefone/WhatsApp/Telegram dos payloads públicos e preserva o fluxo autenticado de `safety.contactIntent`;
- nenhuma migration ou schema de banco foi alterado neste hotfix.
