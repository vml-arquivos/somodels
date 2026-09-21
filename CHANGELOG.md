# Changelog

## Próxima versão — reconciliação de produção

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
