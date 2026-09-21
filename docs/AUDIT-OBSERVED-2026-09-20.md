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


Após o merge do PR #4, o GitHub `main` avançou para `91ee13b` (merge commit) e a branch remota de trabalho foi removida. O redeploy normal foi disparado no Coolify em 2026-09-21 01:43 UTC, gerando o deployment `gnlxr3gfdeudhkrfwpqv0itj`; o painel mostrou `In progress`, origem `Manual`, commit configurado `HEAD` e uma implantação ativa. Não foi usado rebuild sem cache, restart, stop, alteração de variáveis ou alteração de configuração.


Na verificação de 2026-09-21 01:45 UTC, o deployment `gnlxr3gfdeudhkrfwpqv0itj` continuava `In progress` no Coolify, commit `91ee13b` (merge do PR #4). O log visível já havia concluído `pnpm check`, `pnpm build`, `esbuild`, `check-bundle` (maior chunk 401.2 KiB abaixo do limite 650 KiB) e a etapa de build Docker avançava para o runtime; ainda não era correto declarar healthcheck final até o painel sair de `In progress`.


O deployment `gnlxr3gfdeudhkrfwpqv0itj` saiu como `Success` no Coolify, com aplicação `Running`, commit `91ee13b`, duração aproximada de 05m02s e logs de healthcheck: primeira tentativa `Connection refused`, segunda tentativa `healthy`, `New container is healthy` e remoção do container antigo. O log de build exportou a imagem com o nome contendo `91ee13b`.

O smoke público logo após o sucesso retornou HTTP 200 para `/healthz`, `/api/release`, `/robots.txt`, `/sitemap.xml` e todas as páginas institucionais. O conteúdo institucional e o SEO server-side novos estão públicos, `robots.txt` permanece `Disallow: /` e o sitemap está vazio conforme o fail-closed esperado. Porém `/healthz` e `/api/release` ainda informam `release: c13d5f7`, indicando que `APP_RELEASE`/`GIT_SHA` permanece fixado em valor antigo mesmo com o container novo. Esse metadata deve ser corrigido no Coolify para que o release exposto corresponda ao commit `91ee13b`; nenhuma variável foi alterada ainda.


Na tela de variáveis do Coolify, `APP_RELEASE` existe como variável de produção. O editor foi aberto e o campo `value` foi preenchido com o SHA `91ee13b`; a inspeção DOM confirmou somente `valueLength: 7` para o input de senha do modal, sem retornar o segredo. O botão de atualização ainda não confirmou a persistência até a próxima ação; nenhum outro input foi alterado.


A submissão via `requestSubmit` foi aceita pelo Coolify: o modal permaneceu aberto, mas o botão `Update Variable` ficou inativo e o cabeçalho passou a mostrar `Changes pending`, evidenciando que a configuração `APP_RELEASE=91ee13b` foi salva como mudança pendente de aplicação. O container em execução ainda não recebeu a nova variável; é necessário um redeploy normal para aplicar o metadata, sem rebuild sem cache.


Após salvar `APP_RELEASE=91ee13b`, foi acionado o menu **Actions → Redeploy** normal, sem cache e sem restart/stop manual. O Coolify abriu o deployment `yytxokprghshwpqujvxowch9`, origem `Manual`, commit exibido `HEAD`, iniciado em 2026-09-21 01:54:11 UTC; o painel mostrava `In progress` e um deployment ativo.


O deployment `yytxokprghshwpqujvxowch9` terminou como `Success` no Coolify às 01:58 UTC, com duração aproximada de 04m20s; a aplicação aparece `Running`. O log final registra `Attempt 1 ... starting` com uma falha transitória de conexão, seguida de `Attempt 2 ... healthy`, `New container is healthy` e remoção dos containers antigos. A mudança de tráfego foi concluída.

O smoke público final em `https://somodels.buscarr.com.br` confirmou HTTP 200 em `/healthz`, `/api/release`, `/robots.txt`, `/sitemap.xml`, `/termos`, `/privacidade`, `/seguranca`, `/denuncia`, `/ajuda` e `/contato`. Agora `/healthz` e `/api/release` informam `release: 91ee13b` e `database:true`; `robots.txt` continua `Disallow: /` e o sitemap vazio, coerentes com as flags de lançamento fechadas. As páginas institucionais entregam títulos/metadados SSR específicos.

Conclusão operacional: o commit `91ee13b` está implantado, saudável e identificável publicamente; o metadata de release foi reconciliado sem alterar segredos, domínio ou flags de produto.
