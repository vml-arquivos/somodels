# Hotfix de compatibilidade de schema — 16/09/2026

## Sintoma observado

O painel administrativo falhou na consulta de visão geral ao referenciar `profiles.portfolioReviewed`.

## Causa raiz

A aplicação implantada já usa os objetos criados pela migration `0005_portfolio_management.sql`, mas o banco em execução permaneceu no schema anterior. O healthcheck existente validava apenas conectividade por meio da tabela `users`, permitindo que o container fosse marcado como saudável mesmo com schema incompatível.

## Correções

1. O `Dockerfile` executa `pnpm db:migrate` antes de iniciar a aplicação.
2. Se a migration falhar, o processo não inicia (`&&`), impedindo deploy aparentemente saudável com banco antigo.
3. `isDatabaseReady()` agora valida `profiles.portfolioReviewed`, `site_settings` e `finance_entries`, além da conectividade básica.
4. A migration 0005 continua idempotente pelo controle do Drizzle e não foi reescrita.

## Reparo imediato do ambiente atualmente quebrado

No terminal do container/recurso Coolify, com `DATABASE_URL` apontando para o banco correto:

```bash
pnpm db:migrate
```

Depois confirme sem imprimir credenciais:

```bash
node --input-type=module <<'NODE'
import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);
const checks = [
  ["profiles.portfolioReviewed", "SHOW COLUMNS FROM profiles LIKE 'portfolioReviewed'"],
  ["site_settings", "SHOW TABLES LIKE 'site_settings'"],
  ["finance_entries", "SHOW TABLES LIKE 'finance_entries'"],
];
for (const [name, query] of checks) {
  const [rows] = await db.query(query);
  console.log(name, rows.length ? 'OK' : 'AUSENTE');
}
await db.end();
NODE
```

Resultado esperado: três linhas `OK`. Em seguida, recarregue `/admin` e confirme `/healthz` com HTTP 200.

## Observação

Não use `db:push` em produção. O fluxo correto permanece `db:migrate`. Antes de qualquer alteração manual no banco, mantenha backup consistente.
