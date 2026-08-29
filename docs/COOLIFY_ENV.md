# Configuração de ambiente no Coolify

## Estado operacional

A aplicação usa o recurso de aplicação no Coolify com build Docker a partir da branch aprovada do GitHub. O processo escuta na porta `3000`, expõe `GET /healthz` e identifica a versão em `GET /api/release`. O banco compatível esperado pelo código é **MySQL 8 ou TiDB**, porque o ORM usa `drizzle-orm/mysql2`; o recurso PostgreSQL existente no ambiente não é compatível com as migrations atuais.

## Variáveis

| Nome | Obrigatoriedade | Finalidade | Exemplo não secreto | Quando ausente |
|---|---|---|---|---|
| `NODE_ENV` | Obrigatória | Seleciona execução de produção | `production` | A aplicação não deve ser publicada como produção |
| `PORT` | Obrigatória | Porta HTTP do container | `3000` | Usa `3000` |
| `CANONICAL_ORIGIN` | Obrigatória em produção | Origem canônica, links e sitemap | `https://somodels.buscarr.com.br` | Startup de produção falha |
| `SITE_NAME` | Recomendada | Nome exibido no produto | `Só Models` | Usa valor padrão |
| `APP_RELEASE` | Recomendada | SHA ou release exibido no healthcheck | `5620ee6` | Usa `development` |
| `TRUST_PROXY` | Recomendada | Reconhece TLS atrás do proxy | `true` | Usa `true` |
| `ALLOWED_ORIGIN` | Recomendada | Origem permitida nas mutações | `https://somodels.buscarr.com.br` | Usa origem canônica |
| `DATABASE_URL` | Obrigatória | Conexão MySQL/TiDB | `mysql://...` | Healthcheck fica não saudável |
| `JWT_SECRET` | Obrigatória | Assinatura do OAuth e cookies | valor gerado no secret manager | Startup de produção falha se tiver menos de 32 caracteres |
| `VITE_APP_ID` | Necessária para OAuth | Identificação do app | valor do provedor | OAuth fica indisponível |
| `VITE_OAUTH_PORTAL_URL` | Necessária para OAuth | Destino de login | URL HTTPS do provedor | Login OAuth fica indisponível |
| `OAUTH_SERVER_URL` | Necessária para OAuth | API do provedor OAuth | URL HTTPS do provedor | Login OAuth fica indisponível |
| `OWNER_OPEN_ID` | Condicional | Compatibilidade com owner OAuth | identificador do owner | Nenhuma promoção automática |
| `BUILT_IN_FORGE_API_URL` | Necessária para storage | Endpoint de storage | URL HTTPS do storage | Upload e leitura ficam indisponíveis |
| `BUILT_IN_FORGE_API_KEY` | Necessária para storage | Credencial server-side | segredo | Upload e leitura ficam indisponíveis |
| `PUBLIC_ACCESS_ENABLED` | Obrigatória como decisão | Abre a vitrine somente após configuração | `false` | Mantém a vitrine bloqueada |
| `AGE_VERIFICATION_PROVIDER` | Condicional | Identifica provedor real | nome do provedor | Verificação não configurada |
| `AGE_VERIFICATION_API_KEY` | Condicional | API server-side do provedor | segredo | Verificação não configurada |
| `AGE_VERIFICATION_WEBHOOK_SECRET` | Condicional | Valida callbacks | segredo | Webhook não configurado |
| `AGE_VERIFICATION_TTL_HOURS` | Recomendada | Validade da sessão de idade | `24` | Usa 24 horas |
| `KYC_REQUIRED` | Recomendada | Exige identidade aprovada para publicar | `true` | Usa `true` |
| `KYC_PROVIDER` | Condicional | Provedor de KYC | nome do provedor | Upload/publicação permanecem bloqueados |
| `KYC_API_KEY` | Condicional | API server-side de KYC | segredo | Upload/publicação permanecem bloqueados |
| `KYC_WEBHOOK_SECRET` | Condicional | Valida callbacks de KYC | segredo | KYC fica indisponível |
| `PAYMENTS_ENABLED` | Obrigatória como decisão | Ativa pagamentos somente com aprovação formal | `false` | Pagamentos ficam desligados |
| `PAYMENT_PROVIDER` | Condicional | Provedor aprovado | nome do provedor | Checkout não é criado |
| `PAYMENT_API_KEY` | Condicional | API de pagamentos | segredo | Checkout não é criado |
| `PAYMENT_WEBHOOK_SECRET` | Condicional | Idempotência e assinatura | segredo | Webhook não é processado |
| `BOOTSTRAP_SUPER_ADMIN_EMAIL` | Condicional | Cria super admin inicial | `admin@dominio.tld` | Nenhuma conta é criada |
| `BOOTSTRAP_SUPER_ADMIN_PASSWORD` | Condicional | Senha temporária do super admin | gerada no secret manager | Nenhuma conta é criada |
| `BOOTSTRAP_DEV_EMAIL` | Condicional | Cria usuário dev inicial | `dev@dominio.tld` | Nenhuma conta é criada |
| `BOOTSTRAP_DEV_PASSWORD` | Condicional | Senha temporária do dev | gerada no secret manager | Nenhuma conta é criada |
| `SESSION_DURATION_HOURS` | Recomendada | Duração da sessão local | `12` | Usa 12 horas |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Recomendada | Janela de rate limit | `900000` | Usa 15 minutos |
| `LOGIN_RATE_LIMIT_MAX` | Recomendada | Tentativas por janela/IP | `10` | Usa 10 tentativas |

Valores secretos devem ser cadastrados exclusivamente no gerenciador de segredos do Coolify. Nunca devem ser commitados, inseridos no HTML, impressos em logs ou incluídos em relatório. Após o primeiro login, as senhas de bootstrap devem ser trocadas na rota `/alterar-senha`; a rotação posterior das variáveis de bootstrap deve ser feita ou removida conforme a política do operador.
