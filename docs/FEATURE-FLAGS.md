# Feature flags

Todas as flags abaixo têm default seguro `false` e não devem ser inferidas a partir de flags legadas.

| Variável | Chave exposta ao frontend | Default | Finalidade |
| --- | --- | --- | --- |
| `ADULT_MARKETPLACE_ENABLED` | `adultMarketplaceEnabled` | false | Gate-mestre do novo domínio adulto. |
| `ESCORT_LISTINGS_ENABLED` | `escortListingsEnabled` | false | Classificados de acompanhantes. |
| `AGE_ASSURANCE_ENABLED` | `ageAssuranceEnabled` | false | Nova camada/provider de age assurance. |
| `IDENTITY_VERIFICATION_ENABLED` | `identityVerificationEnabled` | false | Nova experiência de identidade/titularidade. |
| `SECURE_CONTACT_ENABLED` | `secureContactEnabled` | false | Intenção de contato autenticada/age-gated. |
| `SPONSORED_LISTINGS_ENABLED` | `sponsoredListingsEnabled` | false | Superfícies patrocinadas, sempre rotuladas. |
| `CREATOR_CONTENT_18_ENABLED` | `creatorContent18Enabled` | false | Domínio futuro e separado de criadores 18+. |
| `PAYMENTS_ENABLED` | `paymentsEnabled` | false | Pagamentos reais; também exige provider configurado. |
| `FAVORITES_ENABLED` | `favoritesEnabled` | false | Favoritos. |
| `BLOCKING_ENABLED` | `blockingEnabled` | false | Bloqueios de perfil/contato. |
| `REPORTS_ENABLED` | `reportsEnabled` | false | Denúncias e fila administrativa. |

## Dependências de ativação

- `secureContactEnabled`: exige política de contato, `showContact`, age gate real e monitoramento de abuso.
- `paymentsEnabled`: exige provider compatível, webhook/idempotência, cancelamento/reembolso e aprovação jurídica/comercial.
- `adultMarketplaceEnabled`/`escortListingsEnabled`: exigem aprovação do ADR, jurisdição e operação de Trust & Safety.
- `creatorContent18Enabled`: permanece desligada até existir domínio próprio de consentimento, media processing, copyright/NCII e payments compatíveis.

## Rollback

O primeiro rollback de qualquer capacidade nova é ajustar a flag para `false` e redeployar/recarregar a configuração conforme a plataforma. Não remover dados para realizar rollback de feature.
