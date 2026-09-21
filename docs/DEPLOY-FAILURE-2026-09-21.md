# Falha de deployment — 2026-09-21

O deployment do commit `1881eea` no Coolify falhou durante a construção da imagem final, antes da troca do container. O log exibido pelo Coolify termina no `Dockerfile:122` com `ERROR: failed to build: failed to solve: ResourceExhausted: failed to copy files: copy file range 1: no space left on device`. A etapa apontada é a cópia integral de `/app/node_modules` do estágio de build para o estágio runtime.

A causa operacional é o empacotamento de dependências de desenvolvimento e ferramentas de build na imagem final. O Dockerfile executava o build com todas as dependências e depois copiava esse diretório integral, além de instalar `pnpm` globalmente no runtime apenas para executar `drizzle-kit migrate`. A correção será produzir o bundle de migration durante o build, podar dependências de desenvolvimento antes da cópia e iniciar o runtime com Node diretamente. Não há evidência de falha de TypeScript, testes ou do código da vitrine neste deployment; a aplicação anterior permaneceu saudável e servindo o release anterior.


## Segunda evidência — deployment `azd83bz726evve6i8d7zzh76`

O commit `c00d3f9` corrigiu a primeira cópia integral, executou o build e chegou à etapa `RUN pnpm prune --prod`. Mesmo assim, o deployment falhou na etapa de runtime ao copiar aproximadamente `405 MB` de `node_modules`, novamente com `no space left on device`. Portanto, o limite do builder é menor que o necessário até para a árvore de produção completa.

A correção final em preparação usa uma instalação separada e determinística em `runtime/`, com apenas `express`, `axios`, os dois pacotes S3, `dotenv` e `mysql2`. As demais dependências da aplicação são incorporadas no bundle server-side. A instalação isolada dessa lista mede aproximadamente `35 MB`, e o smoke do entrypoint com essa instalação mínima respondeu `/api/release` e a home corretamente.


## Conclusão — deployment `ilkldjmfutefkeodgelewmqn`

Após a integração do PR #9, o commit `07fd969` foi implantado pelo Coolify com status `Success`; a aplicação permaneceu `Running` e o deployment terminou em aproximadamente `02m40s`. O smoke público posterior confirmou `GET /healthz` com `ok=true`, `database=true`, `GET /api/release` respondendo pelo serviço e os seis assets demo retornando HTTP 200. A primeira tentativa de smoke excedeu o timeout durante a propagação do proxy, mas a verificação seguinte confirmou TLS, Cloudflare e HTTP 200.

A configuração de lançamento continua fechada de forma intencional e fail-closed: a home e a rota demo exibem `noindex, nofollow`, `robots.txt` responde `Disallow: /` e `sitemap.xml` permanece vazio. Isso confirma que a vitrine demonstrativa não está sendo apresentada como publicação real nem enviada ao Google antes da ativação formal dos gates de produção.
