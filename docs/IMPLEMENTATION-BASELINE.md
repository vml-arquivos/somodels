# Baseline de implementação — 2026-09-17

## Fonte de verdade

A fonte de código usada para esta entrega é `somodels-main (2).zip`. O checkout final foi reconciliado contra esse ZIP antes do empacotamento.

## Stack confirmada

React 19, Vite, TypeScript, Express, tRPC, Drizzle ORM, MySQL/TiDB, Vitest e pnpm. O sistema já possuía autenticação/sessões, perfis, mídia, painel do titular, administração/moderação, storage protegido, age gate, KYC/identity preparado, auditoria, healthcheck e primitives de premium/payment desligadas.

## Baseline funcional preservado

- login/logout e sessão server-side;
- troca/reset de senha;
- papéis e autorização administrativa;
- criação/edição/revisão de perfil;
- upload e moderação de mídia;
- publicação pública condicionada aos gates;
- age gate e KYC fail-closed;
- storage/proxy protegido;
- aceite versionado do titular;
- filtros e paginação da descoberta;
- páginas por cidade, canonical, robots e sitemap já existentes;
- payments desligados por padrão.

## Incremento recuperado do Work

O último checkpoint validado do Work continha:

- 11 capability flags expostas de forma segura, incluindo as 8 obrigatórias e 3 flags operacionais de favoritos/bloqueios/denúncias;
- remoção de telefone/WhatsApp/Telegram dos payloads públicos de listagem/perfil;
- intenção de contato autenticada, age-gated, bloqueada quando houver block e dependente de aceite atual do titular;
- favoritos com ACL, idempotência e auditoria;
- bloqueios com ACL, remoção automática de favorito e auditoria;
- denúncias categorizadas, deduplicadas por caso aberto, prioridade, fila admin e histórico via audit log;
- UI de favorite/block/report/contact no perfil e fila administrativa de denúncias;
- lazy loading de rotas e remoção da instrumentação Manus do build de produção;
- budget automatizado para maior chunk JavaScript;
- suíte ampliada para **113 testes** no checkpoint do Work;
- TypeScript, testes, build e smoke HTTP local verdes nesse checkpoint.

## Banco

Não foi necessária migration nova para este incremento: `favorites`, `blocks`, `moderation_cases` e `audit_logs` já existiam no schema/migrations do baseline. As migrations históricas `0000` a `0005` permanecem byte a byte inalteradas. Qualquer evolução futura de schema deve começar em `0006` ou posterior e seguir expand-and-contract.

## Pendências externas deliberadamente não falsificadas

- homologação contra MySQL/TiDB real de produção;
- browser visual/E2E automatizado no runtime desta conversa;
- entidade jurídica, jurisdições e DPO;
- providers reais de age assurance, KYC e pagamento;
- relay interno completo;
- pipeline externo de vídeo/transcoding;
- ativação pública das novas flags.
