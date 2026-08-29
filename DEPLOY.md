# Só Models — implantação em produção

## Pré-requisitos

A aplicação requer Node.js 22 ou superior, pnpm 10, um banco MySQL/TiDB acessível e as credenciais de OAuth e storage fornecidas pelo ambiente Manus. Os arquivos enviados não devem ser persistidos localmente; o sistema usa o storage seguro e registra apenas referências no banco.

## Variáveis de ambiente

### Obrigatórias

Configure `NODE_ENV=production`, `PORT` conforme o provedor, `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY`. Sem banco, segredo de sessão, OAuth e storage, o sistema não consegue autenticar titulares nem persistir perfis e mídias.

### Recomendadas para produção pública

Configure `CANONICAL_ORIGIN` com a URL HTTPS principal, `SITE_NAME=Só Models`, `VITE_APP_TITLE=Só Models`, `VITE_ANALYTICS_ENDPOINT` e `VITE_ANALYTICS_WEBSITE_ID`. A origem canônica é usada pelos metadados e o analytics é opcional para operação, mas recomendado para acompanhamento.

### Opcionais

`VITE_APP_LOGO` pode permanecer vazio se o site usar apenas o logotipo textual. Variáveis de Stripe ou outro provedor de pagamento não são necessárias nesta versão, pois o checkout real ainda não foi ativado.

Nunca commite valores reais dessas variáveis. Em produção, configure-as no gerenciador de segredos do provedor.

## Instalação e build

Execute `corepack enable`, `corepack pnpm install`, `corepack pnpm drizzle-kit generate`, aplique a migration SQL gerada no banco de produção seguindo o procedimento do provedor, e então execute `corepack pnpm run build`. O artefato do servidor fica em `dist/index.js` e os arquivos públicos ficam em `dist/public`.

## Inicialização

Inicie com `NODE_ENV=production node dist/index.js`. O servidor usa `process.env.PORT` e expõe `GET /healthz`, que retorna JSON com `ok: true` para health checks. Não use um processo separado para frontend: o servidor de produção serve `dist/public`.

## Segurança operacional

Use HTTPS, mantenha `JWT_SECRET` longo e aleatório, limite o tamanho de upload conforme a política do negócio, mantenha o banco com SSL quando o provedor oferecer essa opção e configure backups. Perfis e mídias começam pendentes e não aparecem publicamente antes da aprovação administrativa.

## Estado funcional

A vitrine, autenticação, perfis, filtros, páginas por cidade, upload autenticado, moderação, SEO client-side e intenção técnica de acesso premium estão implementados. O checkout de pagamento real, SSR para indexação plena, ordenação avançada da galeria e catálogo administrativo completo ainda exigem ativação/desenvolvimento antes de uma operação pública definitiva. Portanto, o pacote está **tecnicamente executável em produção**, mas ainda requer essas decisões de produto antes de ser anunciado como operação completa.
