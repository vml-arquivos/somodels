# Só Models — implantação em produção

## Pré-requisitos

A aplicação requer Node.js 22 ou superior, pnpm 10, um banco MySQL/TiDB acessível e as credenciais de OAuth e storage fornecidas pelo ambiente Manus. Os arquivos enviados não devem ser persistidos localmente; o sistema usa o storage seguro e registra apenas referências no banco.

## Variáveis de ambiente

Configure `NODE_ENV=production`, `PORT` conforme o provedor, `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID`, `VITE_APP_TITLE`, `VITE_APP_LOGO`, `CANONICAL_ORIGIN` e `SITE_NAME`. Nunca commite valores reais dessas variáveis.

## Instalação e build

Execute `corepack enable`, `corepack pnpm install`, `corepack pnpm drizzle-kit generate`, aplique a migration SQL gerada no banco de produção seguindo o procedimento do provedor, e então execute `corepack pnpm run build`. O artefato do servidor fica em `dist/index.js` e os arquivos públicos ficam em `dist/public`.

## Inicialização

Inicie com `NODE_ENV=production node dist/index.js`. O servidor usa `process.env.PORT` e expõe `GET /healthz`, que retorna JSON com `ok: true` para health checks. Não use um processo separado para frontend: o servidor de produção serve `dist/public`.

## Segurança operacional

Use HTTPS, mantenha `JWT_SECRET` longo e aleatório, limite o tamanho de upload conforme a política do negócio, mantenha o banco com SSL quando o provedor oferecer essa opção e configure backups. Perfis e mídias começam pendentes e não aparecem publicamente antes da aprovação administrativa.

## Estado funcional

A vitrine, autenticação, perfis, filtros, páginas por cidade, upload autenticado, moderação, SEO client-side e intenção técnica de acesso premium estão implementados. O checkout de pagamento real, SSR para indexação plena, ordenação avançada da galeria e catálogo administrativo completo ainda exigem ativação/desenvolvimento antes de uma operação pública definitiva.
