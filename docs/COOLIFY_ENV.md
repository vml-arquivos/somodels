# Configuração de ambiente no Coolify

## Estado operacional

A aplicação usa o recurso correto de aplicação no Coolify com build Docker a partir da branch aprovada do GitHub. O processo escuta na porta `3000`, expõe `GET /healthz` e identifica a versão em `GET /api/release`. O banco compatível esperado pelo código é **MySQL 8 ou TiDB**, porque o ORM usa `drizzle-orm/mysql2`; o recurso PostgreSQL legado não é compatível com as migrations atuais e deve ser preservado sem reconectar a aplicação.

## Variáveis

| Nome | Obrigatoriedade | Finalidade | Exemplo não secreto | Quando ausente |
|---|---|---|---|---|
| `NODE_ENV` | Obrigatória | Seleciona execução de produção | `production` | A aplicação não deve ser publicada como produção |
| `PORT` | Obrigatória | Porta HTTP do container | `3000` | Usa `3000` |
| `CANONICAL_ORIGIN` | Obrigatória em produção | Origem canônica, links e sitemap | `https://somodels.buscarr.com.br` | Startup de produção falha |
| `SITE_NAME` | Recomendada | Nome exibido no produto | `Só Models` | Usa valor padrão |
| `APP_RELEASE` | Recomendada | SHA ou release exibido no healthcheck | SHA do merge | Usa `development` |
| `TRUST_PROXY` | Recomendada | Reconhece TLS atrás do proxy | `true` | Usa `true` |
| `ALLOWED_ORIGIN` | Recomendada | Origem permitida nas mutações | `https://somodels.buscarr.com.br` | Usa origem canônica |
| `DATABASE_URL` | Obrigatória | Conexão MySQL/TiDB privado | `mysql://...` | Healthcheck fica não saudável |
| `JWT_SECRET` | Obrigatória | Segredo de sessões e OAuth | valor no secret manager | Startup de produção falha se tiver menos de 32 caracteres |
| `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL` | Condicionais | Integração OAuth legada | valores do provedor | OAuth fica indisponível |
| `OWNER_OPEN_ID` | Condicional | Compatibilidade com owner OAuth | identificador do owner | Nenhuma promoção automática |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Necessárias para storage | Upload e leitura de mídia | URL + segredo no manager | Upload e leitura ficam indisponíveis |
| `APP_MODE` | Obrigatória como decisão | `test` na homologação; `production` no lançamento | `test` | Usa o modo derivado das flags legadas |
| `PUBLIC_ACCESS_ENABLED` | Obrigatória como decisão | Abre a vitrine do QA | `true` | Mantém a vitrine bloqueada |
| `PUBLIC_LAUNCH_ENABLED` | Obrigatória em QA | Mantém o lançamento formal fechado | `false` | Usa `false` |
| `TEST_MODE`, `TEST_ACCESS_ENABLED` | Obrigatórias no QA | Compatibilidade e acesso de teste | `true` / `true` | Cadastro/vitrine de teste fechados |
| `ALLOW_TEST_SIGNUP` | Obrigatória no QA | Libera `/cadastro-teste` | `true` | Cadastro de teste fechado |
| `ALLOW_FAKE_DATA` | Obrigatória no QA | Permite apenas perfis `isDemo`/`isTest` | `true` | Demos ficam ocultos |
| `ALLOW_DEMO_SEED` | Obrigatória no QA | Autoriza seed explícito | `true` | Seed falha fechado |
| `DEMO_CONTACTS_ENABLED` | Obrigatória no QA | Controla contatos demonstrativos | `false` | Contatos ficam desativados |
| `ROBOTS_NOINDEX` | Obrigatória no QA | Bloqueia indexação e sitemap | `true` | Usa `true` em modo test |
| `ADMIN_EMAILS` | Obrigatória no QA | Allowlist backend do developer | `authorized-developer@example.com` | Apenas roles persistidas autorizam |
| `REQUIRE_AGE_VERIFICATION` | `false` somente no QA isolado | Gate de idade real | `false` no QA | Em produção usa `true` |
| `AGE_VERIFICATION_PROVIDER`, `AGE_VERIFICATION_API_KEY`, `AGE_VERIFICATION_WEBHOOK_SECRET` | Obrigatórias antes do lançamento | Provedor real, segredo e webhook assinado | valores secretos | Idade real indisponível |
| `REQUIRE_IDENTITY_VERIFICATION` | `false` somente no QA isolado | Gate de identidade/KYC real | `false` no QA | Em produção usa `true` |
| `KYC_REQUIRED` | Legada | Alias de `REQUIRE_IDENTITY_VERIFICATION` | `true` | Usa `true` |
| `KYC_PROVIDER`, `KYC_API_KEY`, `KYC_WEBHOOK_SECRET` | Obrigatórias antes do lançamento | Provedor real de identidade | valores secretos | Upload/publicação reais permanecem bloqueados |
| `PAYMENTS_ENABLED` | `false` no QA | Mantém pagamentos desligados | `false` | Pagamentos ficam desligados |
| `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET` | Condicionais | Checkout com provedor aprovado | valores secretos | Checkout não é criado |
| `BOOTSTRAP_SUPER_ADMIN_EMAIL/PASSWORD` | Condicionais | Conta temporária inicial | e-mail + senha no manager | Nenhuma conta é criada |
| `BOOTSTRAP_DEV_EMAIL/PASSWORD` | Condicionais | Conta dev temporária | e-mail + senha no manager | Nenhuma conta é criada |
| `SESSION_DURATION_HOURS` | Recomendada | Duração da sessão local | `12` | Usa 12 horas |
| `LOGIN_RATE_LIMIT_WINDOW_MS`, `LOGIN_RATE_LIMIT_MAX` | Recomendadas | Limitação de tentativas | `900000`, `10` | Usa defaults seguros |

## Procedimento de homologação

No aplicativo `somodels.buscarr.com.br`, mantenha o MySQL privado compatível, aplique a migration Drizzle incremental sem `DROP`, faça redeploy e valide `GET /healthz` com `database:true`. Somente depois execute `pnpm db:seed-demo` em job/container controlado. O comando é idempotente, cria 15 perfis fictícios e não apaga linhas reais. A segunda execução deve manter a mesma quantidade de perfis e mídias.

Durante a homologação, valide `/cadastro-teste`, `/titular`, `/admin`, home, filtros, páginas de cidade/perfil, moderação e logout/login local. O administrador é autorizado pelo backend por role persistida ou `ADMIN_EMAILS`; a interface não é a única barreira. Contatos demo permanecem não acionáveis e nenhum documento, dado real, e-mail, webhook ou pagamento deve ser enviado.

Valores secretos devem ser cadastrados exclusivamente no gerenciador de segredos do Coolify. Nunca devem ser commitados, inseridos no HTML, impressos em logs ou incluídos em relatório. Após o primeiro login, as senhas de bootstrap devem ser trocadas na rota `/alterar-senha`; o handoff deve ocorrer somente de forma privada e a senha temporária não deve permanecer na documentação.
