# Evidências observadas — 2026-09-20

A auditoria local foi feita em uma cópia limpa de `vml-arquivos/somodels`, atualmente em `main` no commit `ad81b67` (`origin/main`), sem alterações locais antes da branch de trabalho. O arquivo baseline citado no prompt, `/home/ubuntu/upload/somodels-main(5).zip`, não estava presente; apenas `pasted_content.txt` foi localizado.

Os gates locais executados no estado inicial com `pnpm` 10.4.1 foram aprovados: instalação congelada, TypeScript, 48 testes em 11 arquivos e build Vite/esbuild com verificação de bundle. A primeira tentativa via `corepack pnpm` falhou por erro de assinatura/keyid do Corepack; o `pnpm` local funcionou e é a evidência válida.

O smoke público em `https://somodels.buscarr.com.br` em 2026-09-21 01:24–01:25 UTC retornou HTTP 200 para `/`, `/healthz`, `/api/release`, `/robots.txt`, `/sitemap.xml` e os caminhos SPA `/termos`, `/privacidade`, `/seguranca`, `/denuncia`, `/ajuda` e `/contato`. O `/healthz` informou `database:true`, mas o release exposto foi `c13d5f7`, diferente do commit atual da `main`; isso caracteriza divergência de implantação que precisa ser reconciliada antes de declarar um deploy novo.

No Coolify autenticado, projeto `somodels`, ambiente `production`, aplicação `somodels-app`, o recurso apareceu como `Running`. A fonte Git exibiu repositório `vml-arquivos/somodels`, branch `main` e commit SHA configurado `HEAD`. A página de variáveis foi consultada sem abrir valores secretos; a lista mostrou variáveis de produção e controles de build/runtime, mas não foi feita alteração. Não há conector Coolify dedicado na configuração desta sessão; o acesso foi somente leitura pelo navegador autenticado já habilitado.

Nenhum deploy, migration, alteração de variável, mudança de domínio, reinício ou operação destrutiva foi executado durante a auditoria.


Atualização do Coolify: a aplicação `somodels-app` está `Running`; a fonte Git mostra `vml-arquivos/somodels`, branch `main`, SHA configurado `HEAD`. O healthcheck está ativo em `GET http://localhost:3000/healthz`, porta `3000`, código esperado `200`, host `localhost`, com resposta esperada `OK`. A lista de deployments mostra o deployment mais recente como `Success`, commit `ad81b67`, mensagem `correção pnpm`, iniciado há aproximadamente três dias, com duração de 04m43s. O endpoint público, porém, ainda informa release `c13d5f7`; a variável `APP_RELEASE`/imagem em execução deve ser reconciliada no próximo deploy, sem assumir que o serviço atualmente executa o SHA mais recente somente pelo histórico do painel.

A aplicação pública respondeu 200 para as rotas SPA institucionais solicitadas, mas isso é apenas o fallback do `index.html`: o código atual não possui rotas `/termos`, `/privacidade`, `/seguranca`, `/denuncia`, `/ajuda` ou `/contato`. Esse ponto será corrigido no código antes de qualquer deploy.


O deployment informado (`if2pz7ui1fxte0exbh6ndhh2`) foi aberto somente para leitura. O Coolify o marca como `Success`, commit `ad81b67`, com imagem runtime baseada em `node:22-alpine`, comando `sh -c "pnpm db:migrate && node dist/index.js"` e digests de imagem exibidos pelo painel. O histórico/log visível confirma o início do deploy de `vml-arquivos/somodels:main`; o healthcheck configurado separadamente usa `/healthz`. Não houve ação de redeploy, restart, migration manual ou alteração de configuração.


A análise do HTML/log salvo desse deployment confirmou: `RUN pnpm check && pnpm build`, `[✓] migrations applied successfully!`, healthcheck `GET http://localhost:3000/healthz` e `New container is healthy.`; o status do viewer é `Finished`. Isso valida o deployment `if2pz7ui1fxte0exbh6ndhh2` como execução saudável no Coolify, mas não substitui a verificação pública do release/código depois de um novo deploy.
