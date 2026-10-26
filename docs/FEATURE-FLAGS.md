# Feature flags

As flags abaixo têm defaults explícitos e não devem ser inferidas a partir de flags legadas. Gates de abertura pública continuam em `false`; a publicação automática do titular é `true`, mas ainda depende desses gates e das validações server-side.

| Variável                        | Chave exposta ao frontend     | Default | Finalidade                                                                                      |
| ------------------------------- | ----------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `ADULT_MARKETPLACE_ENABLED`     | `adultMarketplaceEnabled`     | false   | Gate-mestre do novo domínio adulto.                                                             |
| `ESCORT_LISTINGS_ENABLED`       | `escortListingsEnabled`       | false   | Classificados de acompanhantes.                                                                 |
| `AGE_ASSURANCE_ENABLED`         | `ageAssuranceEnabled`         | false   | Gate explícito do age gate; pode usar `AGE_VERIFICATION_MODE=self_attestation` sem API externa. |
| `IDENTITY_VERIFICATION_ENABLED` | `identityVerificationEnabled` | false   | Nova experiência de identidade/titularidade.                                                    |
| `SECURE_CONTACT_ENABLED`        | `secureContactEnabled`        | false   | Intenção de contato autenticada/age-gated.                                                      |
| `SPONSORED_LISTINGS_ENABLED`    | `sponsoredListingsEnabled`    | false   | Superfícies patrocinadas, sempre rotuladas.                                                     |
| `CREATOR_CONTENT_18_ENABLED`    | `creatorContent18Enabled`     | false   | Domínio futuro e separado de criadores 18+.                                                     |
| `PAYMENTS_ENABLED`              | `paymentsEnabled`             | false   | Pagamentos reais; também exige provider configurado.                                            |
| `FAVORITES_ENABLED`             | `favoritesEnabled`            | false   | Favoritos.                                                                                      |
| `BLOCKING_ENABLED`              | `blockingEnabled`             | false   | Bloqueios de perfil/contato.                                                                    |
| `REPORTS_ENABLED`               | `reportsEnabled`              | false   | Denúncias e fila administrativa.                                                                |
| `ADMIN_MFA_REQUIRED`            | — (só servidor)               | false   | Exige verificação em duas etapas para acessar o admin.                                          |
| `AUTO_PUBLISH_ENABLED`          | — (só servidor)               | true    | Publica o anúncio do titular após os gates automáticos; `false` envia para a fila de revisão.   |

## Dependências de ativação

- `secureContactEnabled`: exige política de contato, `showContact`, sessão de maioridade válida e monitoramento de abuso.
- `sponsoredListingsEnabled`: só tem efeito com ao menos um plano marcado como destaque e uma assinatura ativa; o anúncio sobe na lista e sempre exibe "Patrocinado".
- `ADMIN_MFA_REQUIRED`: antes de ligar, cada admin precisa entrar em Admin → Segurança e ativar o autenticador, senão fica sem acesso ao painel.
- `paymentsEnabled`: exige provider compatível, webhook/idempotência, cancelamento/reembolso e aprovação jurídica/comercial.
- `adultMarketplaceEnabled`/`escortListingsEnabled`: exigem aprovação do ADR, jurisdição e operação de Trust & Safety.
- `creatorContent18Enabled`: permanece desligada até existir domínio próprio de consentimento, media processing, copyright/NCII e payments compatíveis.
- `AUTO_PUBLISH_ENABLED`: exige aceite de conta vigente, perfil completo, mídia válida e os gates globais de lançamento. A moderação continua disponível como pós-moderação, com suspensão/ocultação/rejeição auditáveis.

## Rollback

O primeiro rollback de qualquer capacidade nova é ajustar a flag para `false` e redeployar/recarregar a configuração conforme a plataforma. Não remover dados para realizar rollback de feature.
