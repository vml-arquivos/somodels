# Só Models

Só Models é uma plataforma de anúncios de acompanhantes adultos construída com React, Vite, Express, tRPC, Drizzle ORM e MySQL/TiDB. O código mantém a vitrine pública, perfis, área do titular, moderação, storage e primitives de monetização desacopladas, sem ativar cobrança fictícia.

## Postura de lançamento

A aplicação **falha fechada**. A vitrine, as URLs de mídia e os contatos públicos somente ficam disponíveis quando `PUBLIC_ACCESS_ENABLED=true` e um provedor real de verificação de idade estiver configurado e testado. Enquanto `KYC_REQUIRED=true`, o anunciante também precisa de verificação de identidade aprovada para enviar perfil para revisão ou fazer upload. Pagamentos permanecem desligados até existir aprovação formal do processador e as variáveis correspondentes.

O banco esperado é MySQL 8 ou TiDB. O ORM atual usa `drizzle-orm/mysql2`; um recurso PostgreSQL não é compatível com as migrations deste projeto. O processo de produção expõe `/healthz`, `/api/release`, `/robots.txt` e `/sitemap.xml`, escuta na porta `3000` por padrão e serve o frontend compilado pelo próprio Express.

## Desenvolvimento

Use Node.js 22 e pnpm 10. A instalação determinística é `pnpm install --frozen-lockfile`. Os gates principais são `pnpm check`, `pnpm test` e `pnpm build`. Para gerar migration local sem aplicar em produção, use `DATABASE_URL=mysql://user:pass@127.0.0.1:3306/somodels pnpm drizzle-kit generate` e revise o SQL antes de qualquer aplicação.

## Produção no Coolify

O deploy deve usar o `Dockerfile` versionado e a branch/commit aprovado. Configure as variáveis conforme [`docs/COOLIFY_ENV.md`](docs/COOLIFY_ENV.md), crie ou selecione um banco MySQL compatível, configure volume persistente e healthcheck em `/healthz`. Antes de migration, crie backup consistente e confirme o procedimento de restauração. Não substitua secrets existentes sem identificar a finalidade e não coloque valores no GitHub.

O bootstrap opcional usa `BOOTSTRAP_SUPER_ADMIN_EMAIL`, `BOOTSTRAP_SUPER_ADMIN_PASSWORD`, `BOOTSTRAP_DEV_EMAIL` e `BOOTSTRAP_DEV_PASSWORD` somente no secret manager. As duas senhas devem ser temporárias e ter pelo menos 16 caracteres, com maiúsculas, minúsculas e números. Após o primeiro login, cada conta deve acessar `/alterar-senha` e a senha de bootstrap deve ser removida ou rotacionada no ambiente.

## Documentação operacional

A estratégia de reconciliação está em [`docs/RECONCILIATION_REPORT.md`](docs/RECONCILIATION_REPORT.md), as variáveis em [`docs/COOLIFY_ENV.md`](docs/COOLIFY_ENV.md), o runbook de segurança em [`docs/SECURITY_COMPLIANCE.md`](docs/SECURITY_COMPLIANCE.md), o deploy em [`docs/DEPLOYMENT_EVIDENCE.md`](docs/DEPLOYMENT_EVIDENCE.md) e o rollback/backup em [`docs/OPERATIONS.md`](docs/OPERATIONS.md). Nenhum desses arquivos contém segredos, documentos pessoais ou URLs assinadas.
