# ADR-0001 — Escopo do marketplace adulto legal

- **Status:** aceito para implementação técnica sob feature flags; ativação pública condicionada aos gates abaixo.
- **Data:** 2026-09-17
- **Decisão:** a arquitetura passa a suportar um marketplace adulto legal de classificados, mantendo o produto legado como fallback enquanto as novas capacidades estiverem desligadas.

## Escopo permitido

O domínio novo é destinado exclusivamente a pessoas com 18 anos ou mais e atividades legais. Categorias de anúncios de acompanhantes, novas taxonomias e superfícies adultas somente podem ser expostas quando `adultMarketplaceEnabled` e os gates dependentes estiverem explicitamente ativos.

## Conteúdo e condutas proibidos

São proibidos menores, exploração, tráfico, coerção, violência sexual, extorsão, fraude, impersonação, mídia não consensual, conteúdo roubado, publicação por terceiros sem autorização, serviços ilegais, spam/phishing e violações de direitos autorais, privacidade ou personalidade. Casos de possível menor e tráfico/exploração/coerção recebem prioridade urgente na fila de segurança.

## Decisões operacionais

| Tema | Decisão |
| --- | --- |
| Entidade jurídica operadora | **PENDENTE DE DECISÃO / COMPLIANCE**. Não codificar nome jurídico inexistente. |
| Países e jurisdições | **PENDENTE DE DECISÃO / COMPLIANCE**. Nenhuma localidade implica autorização regulatória. |
| Age assurance | O acesso protegido continua fail-closed. A ativação de `ageAssuranceEnabled` exige provider real configurado, política de retenção e homologação do callback. |
| Identidade do anunciante | O gate KYC existente permanece separado do age gate e não pode ser artificialmente aprovado. `identityVerificationEnabled` inicia `false`. |
| Titularidade e publicação | O aceite versionado do titular permanece ligado ao conteúdo atual do perfil/mídias; mudança relevante invalida o aceite. |
| Mídia | Upload, storage protegido, moderação e autorização do titular permanecem obrigatórios. Evidência documental/biométrica não vai para payload público. |
| Contato | Contatos brutos não fazem parte de payload público. A saída externa, quando habilitada, exige login, age gate válido, ausência de bloqueio e autorização vigente. |
| Denúncia/takedown | Denúncias são autenticadas, categorizadas, priorizadas e encaminhadas à fila administrativa; identidade do denunciante não é exibida na UI do alvo. |
| Recurso | Casos podem ser reabertos/colocados em estado de recurso pela moderação; evidência e justificativas sensíveis permanecem administrativas. |
| Retenção/deleção | **PENDENTE DE POLÍTICA JURÍDICA**. Aplicar minimização de dados até decisão formal. |
| DPO/canal de privacidade | **PENDENTE DE DECISÃO / COMPLIANCE**. |
| Providers externos | Age/KYC/payment providers permanecem **PENDENTES**; flags novas são `false` por padrão. |
| Pagamentos | `paymentsEnabled=false` por padrão. Nenhum checkout real é liberado sem provider formalmente compatível/aprovado. |
| Conteúdo de criadores 18+ | Domínio isolado e desligado por `creatorContent18Enabled=false`; não reutilizar automaticamente o fluxo de classificados. |

## Critérios de lançamento

1. Operadora, jurisdição, DPO/privacidade e políticas públicas aprovadas.
2. Providers necessários contratados e homologados.
3. Backup e restauração comprovados.
4. `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test` e `pnpm build` verdes no SHA a publicar.
5. Smoke tests de auth, age gate, storage, moderação e contato seguro.
6. Métricas/alertas de segurança e rollback testado.
7. Ativação gradual das flags, nunca todas de uma vez.

## Critérios de suspensão

Desligar imediatamente as flags relacionadas e suspender a superfície afetada em caso de possível menor, exploração/tráfico/coerção, bypass de age/KYC, vazamento de contato/dados sensíveis, falha de ACL/IDOR, storage público indevido, callback/webhook não confiável, aumento anormal de abuso ou incidente regulatório.
