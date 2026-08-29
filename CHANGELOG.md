# Changelog

## Próxima versão — reconciliação de produção

A aplicação recebeu controles de sessão local com armazenamento server-side revogável, bootstrap seguro de super admin e dev, rotação obrigatória de senha temporária, rate limiting de login, serialização de usuário sem hashes e autorização para os papéis privilegiados.

O schema Drizzle foi ampliado com verificação de idade, identidade/KYC, sessões, tokens de e-mail e reset, moderação, auditoria, favoritos, disponibilidade, tours, planos, assinaturas, carteira e ledger de créditos, analytics, avaliações, bloqueios e eventos idempotentes. A migration `0002_certain_carlie_cooper.sql` é forward-only e inclui preenchimento de hash de storage antes da restrição `NOT NULL`.

O storage passou a exigir sessão de idade aprovada, publicação do perfil, aprovação da mídia e entitlement para mídia premium. O upload passou a usar chaves aleatórias, limites, validação base64 e assinaturas binárias. A aplicação ganhou headers de segurança, `trust proxy`, CORS de origem para mutações, healthcheck com status do banco, endpoint de release, robots e sitemap.

A abertura pública, o KYC efetivo e os pagamentos continuam desligados até a configuração e o teste de provedores reais e a aprovação jurídica/comercial correspondente.
