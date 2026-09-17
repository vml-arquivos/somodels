# Deploy e rollback

## Sequência obrigatória

1. Fixar o SHA/ZIP aprovado.
2. Criar backup consistente do MySQL/TiDB e testar restauração em ambiente separado.
3. Executar `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build`.
4. Comparar migrations históricas e revisar qualquer migration nova.
5. Aplicar somente migrations expand aprovadas, nunca `db:push` destrutivo em produção.
6. Deploy com todas as novas capability flags `false`.
7. Validar `/healthz`, `/api/release`, auth, storage, age gate, admin e páginas públicas.
8. Ativar internamente uma flag por vez.
9. Canary e monitoramento de erros/abuso.
10. Ampliação gradual somente após métricas estáveis.

## Rollback de código

Redeployar o último SHA conhecido como saudável. Como este incremento reutiliza schema existente e não altera `0000`–`0005`, rollback de código não exige apagar tabelas/dados.

## Rollback por capacidade

Desligar a flag específica: `ADULT_MARKETPLACE_ENABLED`, `ESCORT_LISTINGS_ENABLED`, `AGE_ASSURANCE_ENABLED`, `IDENTITY_VERIFICATION_ENABLED`, `SECURE_CONTACT_ENABLED`, `SPONSORED_LISTINGS_ENABLED`, `CREATOR_CONTENT_18_ENABLED`, `PAYMENTS_ENABLED`, `FAVORITES_ENABLED`, `BLOCKING_ENABLED` ou `REPORTS_ENABLED`.

## Migration compensatória

Se versões futuras criarem migration expand, nunca fazer downgrade destrutivo automático. Criar migration compensatória aditiva, preservar dados e só remover legado em release posterior com backup/restauração comprovados.

## Webhooks e filas

Providers devem usar event id idempotente. Em incidente, pausar ingestão/flag, preservar eventos recebidos e reprocessar somente após corrigir a causa. Não apagar fila para “limpar” erro.

## Métricas que exigem rollback/suspensão

- bypass de auth/age/KYC;
- IDOR;
- contato/PII em payload público;
- mídia privada acessível sem gate;
- falha de healthcheck ou schema incompatível;
- erro elevado de login/upload/moderação;
- denúncias urgentes sem processamento;
- webhook sem verificação/idempotência;
- incidente jurídico/regulatório.

## Responsáveis

Operadora, DPO/canal de privacidade, plantão Trust & Safety e responsáveis de incidentes: **PENDENTE DE DECISÃO / COMPLIANCE**.
