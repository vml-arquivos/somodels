# Changelog

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
