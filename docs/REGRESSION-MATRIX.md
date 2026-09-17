# Matriz de regressão

| Jornada | Risco principal | Proteção/teste esperado | Gate de deploy |
| --- | --- | --- | --- |
| Login | brute force / sessão inválida | rate limit + auth tests | smoke login |
| Logout | sessão reutilizável | revogação server-side | auth.logout tests |
| Troca de senha | sessão antiga permanecer válida | política de senha + rotação | password/auth tests |
| Reset de senha | token reutilizável/vazado | token opaco/hash/expiração | password-reset tests |
| Criação de perfil | IDOR/categoria inválida | owner ACL + Zod | profile tests |
| Edição | alteração por terceiro | owner/admin backend ACL | authorization tests |
| Envio para revisão | bypass de termos/KYC | aceite vigente + KYC quando exigido | profile-terms tests |
| Upload | MIME/ownership/storage | auth + owner + assinatura/MIME | storage/security tests |
| Aprovação | publicação sem gates | admin ACL + termos/KYC | moderation tests |
| Suspensão | perfil continuar público | status/publication checks | public indexing tests |
| Perfil público | PII/contato vazar | payload sem phone/WhatsApp/Telegram | contract/static tests |
| Age gate | bypass por rota direta | `hasValidAgeSession` no backend | security-access tests |
| Storage | mídia privada/premium exposta | storage proxy fail-closed | storage-access tests |
| Healthcheck | código à frente do schema | `/healthz` + DB readiness | smoke HTTP |
| Admin | escalada de privilégio | `adminProcedure` e role checks | portfolio-management tests |
| Favoritos | autoação/IDOR | protected procedure + target publicado | safety tests |
| Bloqueios | bypass de contato | block bilateral no contact intent | safety tests |
| Denúncias | exposição do denunciante | fila não exibe reporter na UI pública | safety tests + admin smoke |
| Contato externo | PII/saída sem consentimento | login + age + block + termos atuais | safety tests |
| Build frontend | instrumentação/editor em produção | plugins somente `serve` + budget | `pnpm build` |

## Regra de release

Qualquer falha em `check`, `test`, `build`, auth, storage, age gate ou autorização bloqueia promoção. Feature nova pode ser desligada isoladamente pelas flags descritas em `FEATURE-FLAGS.md`.
