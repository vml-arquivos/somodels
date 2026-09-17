# Validação do pacote final — 2026-09-17

## Fonte de verdade

O pacote final foi reconciliado exclusivamente contra `somodels-main (2).zip`.

## Checkpoint funcional recuperado do Work

Antes da etapa final de documentação/empacotamento, o mesmo conjunto funcional desta entrega havia passado no Work por:

- `pnpm check`;
- `pnpm test` — **113 testes aprovados**;
- `pnpm build`;
- smoke HTTP local.

Após esse checkpoint, a finalização ficou limitada a documentação, conferência de integridade, empacotamento e um ajuste conservador de limite do texto de denúncia para caber no campo legado `moderation_cases.reason` (`varchar(500)`). O limite público foi reduzido para 200 caracteres; o pior caso de escape JSON verificado ocupa 496 caracteres e não exige migration histórica.

## Verificações executadas na finalização

- 134 arquivos TypeScript/TSX de fonte analisados sintaticamente sem erro pelo compilador TypeScript disponível no runtime;
- `scripts/check-bundle.mjs` aprovado por `node --check`;
- `package.json` e `drizzle/meta/_journal.json` parseiam como JSON válido;
- as migrations históricas `0000`–`0005` permanecem byte a byte idênticas ao ZIP fonte;
- `git diff --check` do delta contra o ZIP fonte deve permanecer verde no pacote gerado;
- nenhuma pasta `.git`, `node_modules`, `dist`, `coverage` ou `.vite` entra no ZIP final;
- nenhum `.env` real, chave PEM/KEY ou symlink entra no ZIP final;
- somente `.env.example` é incluído para documentação;
- o ZIP é testado integralmente e extraído novamente para comparação de conteúdo antes da entrega.

## Migrations históricas — SHA-256

- `0000_living_human_fly.sql`: `814a08e40d7fc2bcfd458759d18319198ca8ae394f2fa15617a78678e9c9c93b`
- `0001_careless_annihilus.sql`: `b5004fbd9226965940176f3814329cedae8ae46a1f52a2436fb310b22b0967f3`
- `0002_certain_carlie_cooper.sql`: `41d308b51545df5640bbe7c66a333d8f0a068eb1cf06928fbe1011a84f8ffdad`
- `0003_wet_timeslip.sql`: `0c535421d44871d3d1c09d591902eaccbe1fcd8936e9320e7e6ad420a926a4dd`
- `0004_add-profile-location-note.sql`: `9ddb4d210a61ab11e363e3aedb0cfa59943a8f42c7fe6f0a3f165b6c4364e71a`
- `0005_portfolio_management.sql`: `e5d57bfcba8973df984ce34e0bfe1813b687fc7fc5fb3adf2a7b55c4a37d2ba0`

## Gate obrigatório após push

O GitHub Actions do repositório deve executar novamente `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test` e `pnpm build` no commit criado pelo usuário antes de merge/redeploy. As novas capability flags devem permanecer `false` no primeiro deploy.
