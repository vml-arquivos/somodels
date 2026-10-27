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

Execute `corepack enable`, `corepack pnpm install --frozen-lockfile`, `corepack pnpm db:migrate` e então `corepack pnpm run build`. O deploy aplica somente as migrations versionadas; não gere SQL novo nem use `db:push` em produção. O artefato do servidor fica em `dist/index.js` e os arquivos públicos ficam em `dist/public`.

## Inicialização

Inicie com `NODE_ENV=production node dist/index.js`. O servidor usa `process.env.PORT` e expõe `GET /healthz`, que retorna JSON com `ok: true` para health checks. Não use um processo separado para frontend: o servidor de produção serve `dist/public`.

### Coolify com Dockerfile

Nesta imagem, o `Dockerfile` já executa `node dist/migrate.mjs` antes de iniciar `node dist/index.js`. No recurso do Coolify, mantenha **Pre-deployment** e **Post-deployment** vazios. Não configure `pnpm exec drizzle-kit migrate` no container runtime: o estágio final contém apenas o bundle de produção e não precisa do CLI do pnpm; configurar esse comando faz o deploy terminar com `pnpm: not found` mesmo quando o container está saudável.

## Segurança operacional

Use HTTPS, mantenha `JWT_SECRET` longo e aleatório, limite o tamanho de upload conforme a política do negócio, mantenha o banco com SSL quando o provedor oferecer essa opção e configure backups. Com `AUTO_PUBLISH_ENABLED=true`, o titular publica após os gates automáticos; a moderação continua como pós-moderação e pode suspender ou ocultar a qualquer momento. Com a flag desligada, o fluxo volta para pendência administrativa.

## Estado funcional

A vitrine, autenticação, perfis, filtros, páginas por cidade, upload autenticado, moderação, SEO client-side e intenção técnica de acesso premium estão implementados. O checkout de pagamento real, SSR para indexação plena, ordenação avançada da galeria e catálogo administrativo completo ainda exigem ativação/desenvolvimento antes de uma operação pública definitiva. Portanto, o pacote está **tecnicamente executável em produção**, mas ainda requer essas decisões de produto antes de ser anunciado como operação completa.

## Incremento 17/09/2026 — ativação gradual

O pacote inclui novas capability flags, todas `false` por padrão. **Não ligue `ADULT_MARKETPLACE_ENABLED`, `ESCORT_LISTINGS_ENABLED`, `AGE_ASSURANCE_ENABLED`, `IDENTITY_VERIFICATION_ENABLED`, `SECURE_CONTACT_ENABLED`, `SPONSORED_LISTINGS_ENABLED`, `CREATOR_CONTENT_18_ENABLED` ou `PAYMENTS_ENABLED` em bloco.** Favoritos, bloqueios e denúncias também possuem flags próprias.

Antes de qualquer ativação, execute o gate determinístico:

```bash
set -e
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

Em seguida valide `/healthz`, `/api/release`, login/logout, age gate, storage, perfil público e admin. Use `docs/DEPLOY-ROLLBACK-PLAN.md` como runbook. Faça backup do banco antes de rodar `db:migrate`. Além da `0011_talented_ares.sql` (formas de pagamento), esta etapa inclui `0012_profile_neighborhood.sql`, que adiciona somente `profiles.neighborhood`; ambas são aditivas. As migrations anteriores permanecem necessárias e devem estar integralmente aplicadas antes do tráfego público.

A homologação final deve ocorrer contra um MySQL/TiDB real com backup/restauração testados. Providers de age/KYC/payment não devem ser considerados operacionais apenas por existirem variáveis de ambiente.

## Incremento 26/10/2026 — painel do anunciante

- Rodar a migração `0013_owner_area` (só cria `owner_accounts`, `owner_media` e `payments`). Faça backup do banco antes do deploy.
- Nova variável opcional: `REQUIRE_OWNER_PERSONAL_DATA` (padrão `true`). Com `true`, o titular precisa preencher nome completo, CPF e nascimento antes de publicar um anúncio pela primeira vez. Anúncios já publicados não são afetados. Use `false` para desligar a exigência.
- O texto do contrato é um modelo e deve ser revisado por advogado antes de uso comercial.
- Pagamentos podem ser registrados pelo endpoint `admin.recordPayment`; ainda não há tela de admin para isso.

## Incremento 26/10/2026 — painel do administrador

- Rodar a migração `0014_admin_crm` (só cria `crm_profiles`, `crm_notes` e `verification_documents`). Faça backup do banco antes do deploy.
- Nenhuma variável de ambiente nova.
- Documentos, selfie e vídeo de verificação ficam no armazenamento com a chave `verification/<id do usuário>/...`, que não é servida pelo endereço público. Só abrem pela rota `/api/verification-doc/:id` (dono ou administrador com permissão de identidade e MFA). O administrador pode apagar os arquivos ao aprovar.
- Limites de envio: 8 MB por imagem e 40 MB por vídeo.
- Não há conferência automática de rosto nem consulta a órgão externo; a análise é feita por uma pessoa da equipe.
- Os textos de SEO editados no painel ficam em `site_settings` (id 2) e valem só para páginas públicas fixas.

