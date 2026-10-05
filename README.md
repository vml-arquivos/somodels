# Ero Models

Ero Models é um portal adulto de anúncios de acompanhantes construído com React, Vite, Express, tRPC, Drizzle ORM e MySQL/TiDB. O produto mantém a vitrine por cidade/região, páginas individuais, cadastro de fotos e vídeos, área do titular, painel administrativo, moderação, storage e contato externo controlado, sem intermediar pagamentos.

## Postura de lançamento

A aplicação **falha fechada**. A experiência adulta começa com age gate explícito para maiores de 18 anos; a vitrine, as URLs de mídia e os contatos públicos somente ficam disponíveis quando `PUBLIC_ACCESS_ENABLED=true`, o lançamento estiver aberto e a verificação de idade real estiver configurada e testada. Enquanto `KYC_REQUIRED=true`, o anunciante também precisa de verificação de identidade aprovada para enviar perfil para revisão ou fazer upload. Pagamentos permanecem desligados até existir aprovação formal do processador e as variáveis correspondentes.

O banco esperado é MySQL 8 ou TiDB. O ORM atual usa `drizzle-orm/mysql2`; um recurso PostgreSQL não é compatível com as migrations deste projeto. O processo de produção expõe `/healthz`, `/api/release`, `/robots.txt` e `/sitemap.xml`, escuta na porta `3000` por padrão e serve o frontend compilado pelo próprio Express.

## Desenvolvimento

Use Node.js 22 e pnpm 10. A instalação determinística é `pnpm install --frozen-lockfile`. Os gates principais são `pnpm check`, `pnpm test` e `pnpm build`. Para gerar migration local sem aplicar em produção, use `DATABASE_URL=mysql://user:pass@127.0.0.1:3306/somodels pnpm drizzle-kit generate` e revise o SQL antes de qualquer aplicação.

## Produção no Coolify

O deploy deve usar o `Dockerfile` versionado e a branch/commit aprovado. Configure as variáveis conforme [`docs/COOLIFY_ENV.md`](docs/COOLIFY_ENV.md), crie ou selecione um banco MySQL compatível, configure volume persistente e healthcheck em `/healthz`. Antes de migration, crie backup consistente e confirme o procedimento de restauração. Não substitua secrets existentes sem identificar a finalidade e não coloque valores no GitHub.

O bootstrap opcional usa `BOOTSTRAP_SUPER_ADMIN_EMAIL`, `BOOTSTRAP_SUPER_ADMIN_PASSWORD`, `BOOTSTRAP_DEV_EMAIL` e `BOOTSTRAP_DEV_PASSWORD` somente no secret manager. As duas senhas devem ser temporárias e ter pelo menos 16 caracteres, com maiúsculas, minúsculas e números. Após o primeiro login, cada conta deve acessar `/alterar-senha` e a senha de bootstrap deve ser removida ou rotacionada no ambiente.

## Documentação operacional

A estratégia de reconciliação está em [`docs/RECONCILIATION_REPORT.md`](docs/RECONCILIATION_REPORT.md), as variáveis em [`docs/COOLIFY_ENV.md`](docs/COOLIFY_ENV.md), o runbook de segurança em [`docs/SECURITY_COMPLIANCE.md`](docs/SECURITY_COMPLIANCE.md), o deploy em [`docs/DEPLOYMENT_EVIDENCE.md`](docs/DEPLOYMENT_EVIDENCE.md) e o rollback/backup em [`docs/OPERATIONS.md`](docs/OPERATIONS.md). Nenhum desses arquivos contém segredos, documentos pessoais ou URLs assinadas.

## Atualização de segurança de 16/09/2026

Este pacote inclui correções de autorização e proteção de dados. Não constitui liberação para cadastros reais ou produção. Consulte `docs/SECURITY-HARDENING-2026-09-16.md` e os resultados de validação associados antes de implantar. Contas existentes não são reativadas ou promovidas pelo bootstrap, e a troca obrigatória de senha passa a ser exigida pela API.

## Anúncios adultos — atualização da plataforma

Esta versão adapta as páginas e categorias a anúncios adultos legais de acompanhantes, sem inserir perfis, imagens ou contatos fictícios. A home é configurável pelo painel e permanece vazia até que titulares/admins cadastrem anúncios reais, mídias autorizadas e dados revisados. Registros existentes são preservados, mas precisam de revisão de adequação antes de voltar à vitrine.

A migration `0006_profile_lifecycle.sql` faz parte do schema atual e deve ser aplicada após backup antes de iniciar a nova versão. Use `pnpm db:migrate`; não use `db:push` em produção. O deploy não publica anúncios automaticamente. Consulte `docs/PROFILE-LIFECYCLE-2026-09-21.md`.

## Hotfix de compatibilidade de schema — 16/09/2026

O container de produção executa `pnpm db:migrate` antes de iniciar `dist/index.js`. O healthcheck valida também os objetos de banco exigidos pela migration `0006_profile_lifecycle.sql`. Assim, um deploy não é considerado saudável quando o código está à frente do schema.

## Fundação de marketplace adulto

Este repositório contém a experiência de portal adulto e uma **fundação técnica controlada** para publicação legal. As flags e providers continuam explícitos: não são substituídos por dados sintéticos nem por bypass de idade, identidade, moderação ou privacidade. A decisão técnica e os bloqueios de compliance estão em [`docs/ADR-0001-adult-marketplace-scope.md`](docs/ADR-0001-adult-marketplace-scope.md).

O incremento adiciona favoritos, bloqueios, denúncias e contato externo controlado reutilizando as tabelas já existentes no baseline. Telefones, WhatsApp e Telegram não são mais enviados em payload público de descoberta/perfil; o href de saída só é retornado por um procedimento autenticado e age-gated quando o recurso estiver habilitado e a autorização do titular estiver vigente.

As migrations históricas `0000`–`0005` permanecem intactas. Não use `db:push` em produção. Antes de ativar qualquer capability nova, siga [`docs/DEPLOY-ROLLBACK-PLAN.md`](docs/DEPLOY-ROLLBACK-PLAN.md) e mantenha payments/creator content desligados até provider e compliance aprovados.
