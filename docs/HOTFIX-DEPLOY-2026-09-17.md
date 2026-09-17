# Hotfix de deploy — 17/09/2026

## Falha observada

O deploy do commit `a55dae9e4ca92fad1589c39d80d217437819cb53` parou em `pnpm check` com dois erros TypeScript:

- `client/src/pages/ProfilePage.tsx`: `TS7006` em `method`;
- `server/routers.ts`: `TS2353` ao adicionar `availableContactMethods` por mutação em `data.profile`.

## Correção aplicada

1. `ContactMethod` passou a ser uma união literal derivada de `contactMethods`, e `availableContactMethods` é filtrado com type guard explícito.
2. `profiles.bySlug` não altera mais `data.profile`; retorna um novo objeto com perfil e relacionados sanitizados por `sanitizePublicProfileContact`.
3. Telefones, WhatsApp e Telegram continuam removidos do payload público; apenas os nomes dos canais autorizados são expostos.
4. Nenhuma migration foi criada ou modificada.

## Gate esperado no redeploy

O Dockerfile executa `pnpm check && pnpm build`. O redeploy deve ultrapassar a etapa que antes falhava com `TS7006`/`TS2353`. Depois disso o runtime executará `pnpm db:migrate && node dist/index.js`.

As variáveis de ambiente e segredos do Coolify são responsabilidade da configuração de runtime e não fazem parte deste ZIP.
