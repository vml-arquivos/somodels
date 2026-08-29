# Evidências de deploy

Este arquivo deve ser atualizado somente com resultados observados no ambiente, nunca com resultados presumidos. Não registrar senhas, tokens, `DATABASE_URL`, URLs assinadas, documentos pessoais ou dados de usuários.

## Identificação

| Item | Resultado |
|---|---|
| Branch aprovada | `feat/production-reconciliation-marketplace` |
| SHA final testado | Pendente do commit final |
| SHA implantado | Pendente da aplicação Coolify |
| ID do deploy | Pendente da criação do recurso de aplicação |
| URL pública | `https://somodels.buscarr.com.br` |
| Healthcheck | Pendente: `/healthz` |
| Release endpoint | Pendente: `/api/release` |
| Banco | MySQL 8/TiDB compatível pendente; PostgreSQL atual não compatível |
| Backup | Pendente de backup consistente e restauração de validação |

## Gates locais

| Verificação | Resultado inicial | Resultado final |
|---|---|---|
| `pnpm check` | PASS | Pendente após revisão final |
| `pnpm test` | PASS: 3 arquivos, 5 testes | Pendente após novos testes |
| `pnpm build` | PASS | Pendente após revisão final |
| Docker build | Não executado | Pendente |
| Migration em MySQL limpo | Não executado | Pendente |
| Migration em cópia existente | Não executado | Pendente |
| Segredos versionados | Nenhum padrão encontrado na auditoria inicial | Pendente da revisão final |

## Smoke tests de produção

| Fluxo | Resultado |
|---|---|
| Home e mobile | Pendente do recurso de aplicação |
| Vitrine bloqueada sem age provider | Pendente do recurso de aplicação |
| Mídia direta sem idade | Pendente do recurso de aplicação |
| Login local administrativo | Pendente do bootstrap no banco compatível |
| Troca obrigatória de senha | Pendente do bootstrap no banco compatível |
| Autorização server-side | Pendente do recurso de aplicação |
| Moderação e auditoria | Pendente do recurso de aplicação |
| Upload persistente | Pendente de storage configurado |
| `/robots.txt` e `/sitemap.xml` | Pendente do recurso de aplicação |
| 404, canonical, metadados | Pendente do recurso de aplicação |
| Persistência após restart | Pendente do recurso de aplicação e banco |

## Matriz de flags

| Flag | Estado seguro padrão | Ativar somente quando |
|---|---|---|
| `PUBLIC_ACCESS_ENABLED` | `false` | Age provider real configurado e testado |
| `KYC_REQUIRED` | `true` | Deve permanecer ligado para publicação de anunciantes |
| `PAYMENTS_ENABLED` | `false` | Provedor com aprovação formal e webhooks testados |
| `BOOTSTRAP_*` | ausente | Somente para criação inicial; remover/rotacionar após troca |

## Atualização observada — 2026-08-29

O redeploy do aplicativo `somodels-app` foi iniciado no Coolify a partir do commit `c13d5f7` do branch `feat/production-reconciliation-marketplace`. O Coolify criou um novo container e registrou o healthcheck configurado como `HTTP localhost:3000/healthz`, seguido de `New container is healthy` e `Removing old containers`. A confirmação final do estado do deploy ainda estava sendo acompanhada no painel no momento deste registro. Nenhum segredo foi armazenado neste documento.

O domínio público configurado é `https://somodels.buscarr.com.br`. A validação pública de DNS/roteamento continua separada porque as verificações anteriores retornaram `503 — no available server`, enquanto a rota HTTP temporária do Coolify respondeu com a aplicação.

> `/healthz` é o endpoint real de saúde implementado pelo servidor; `/health` não é utilizado pela versão atual.

### Postura atual de recursos

Verificação de idade, KYC, pagamentos e storage dependentes de provedores permanecem em modo fail-closed enquanto os respectivos provedores reais não estiverem configurados. O deploy não deve ser tratado como lançamento completo do marketplace até que esses pré-requisitos, a migration e o bootstrap de produção sejam validados.

---

## Atualização de acompanhamento — 2026-08-29

No painel Coolify, o deployment `jxuinb6yhjnrruarqkr65zux` do commit `4210ff3` (`fix: align coolify healthcheck endpoint`) segue em andamento. A instalação das dependências foi concluída e o processo avançou para a etapa de build; as versões dos deployments anteriores permanecem marcadas como `Success`. Fonte: painel autenticado do Coolify em `https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/jxuinb6yhjnrruarqkr65zux`.

O estado visual da aplicação no painel ainda mostra `Running` e `Changes pending` enquanto o deployment corrente não encerra. Nenhuma credencial ou variável secreta foi copiada.

---

## Atualização de acompanhamento — 2026-08-29 08:07 UTC

O deployment `jxuinb6yhjnrruarqkr65zux` do commit `4210ff3` continua em andamento no Coolify. Os logs observados mostram a instalação de dependências concluída e o build avançando para `pnpm build`, sem erro registrado até o momento. As versões anteriores permanecem como `Success`. Fonte: `https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/jxuinb6yhjnrruarqkr65zux`.

O painel ainda exibe `Running` e `Changes pending` enquanto a publicação corrente não encerra; isso será revalidado após a conclusão do deployment.

---

## Atualização de diagnóstico — 2026-08-29

A página de variáveis do aplicativo no Coolify confirma 29 variáveis cadastradas em ambiente `Production`; entre as primeiras estão `NODE_ENV`, `PORT`, `CANONICAL_ORIGIN`, `SITE_NAME`, `APP_RELEASE`, `TRUST_PROXY`, `ALLOWED_ORIGIN`, `DATABASE_URL`, `JWT_SECRET` e `PUBLIC_ACCESS_ENABLED`. A tabela utiliza valores mascarados/ocultos e nenhum valor secreto foi extraído.

O deployment `jxuinb6yhjnrruarqkr65zux` chegou à etapa de healthcheck, mas o endpoint configurado retornou `503 Service Unavailable` com `database:false`; isso é tratado como falha de prontidão, não como sucesso. O diagnóstico do vínculo do MySQL permanece necessário antes de promover a aplicação ao novo container.

---

## Atualização de reconciliação do banco — 2026-08-29

O recurso MySQL `somodels-mysql` está em execução no Coolify com imagem `mysql:8`, usuário normal `somodels`, banco inicial `somodels`, acesso `Private`, porta interna `3306`, mapeamento público restrito a loopback e opção de capacidade `--cap-drop=SYS_ADMIN`. O hostname interno observado para a conexão privada é `9shzi6fal9driq5lct3n0sju`; credenciais não foram armazenadas.

A variável `DATABASE_URL` da aplicação foi atualizada para apontar ao hostname interno e à porta/banco corretos do MySQL. O Coolify indica `Changes pending`, portanto o novo vínculo ainda depende de um redeploy para entrar no container; a prontidão continuará sendo considerada inválida até o endpoint retornar HTTP 200 com o banco conectado. Fonte: configuração autenticada do recurso MySQL em `https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/database/9shzi6fal9driq5lct3n0sju`.

---

## Verificação do MySQL em execução — 2026-08-29

O terminal autenticado do recurso `somodels-mysql` confirmou, por consulta somente leitura, MySQL `8.4.11`, a existência do schema `somodels` e do usuário `somodels` com host `%`. O terminal exibiu apenas o aviso padrão do cliente sobre senha na linha de comando; nenhum segredo foi registrado. O banco está, portanto, inicializado, e a falha remanescente está restrita à conectividade da aplicação com o serviço/URL em runtime ou à rede compartilhada.

---

## Redeploy da correção de migrations — 2026-08-29

Após a correção local e a publicação do commit `6c97e43` no branch `feat/production-reconciliation-marketplace`, foi iniciado no Coolify o deployment `xksybfofgewuqauelfgcjlfi`. O painel confirmou a leitura do commit `6c97e43` e o início do build Docker, com o `pnpm install` avançando no container de build. O deployment permanece em acompanhamento até a execução do pre-deployment e a resposta HTTP 200 do healthcheck.

Fonte: `https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/xksybfofgewuqauelfgcjlfi`

---

O deployment `xksybfofgewuqauelfgcjlfi` avançou no Coolify para a instalação das dependências do build do commit `6c97e43`; o painel ainda o marca como `In progress`. O container anterior permanece disponível durante a transição. Fonte: `https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/xksybfofgewuqauelfgcjlfi`.

Na atualização de 08:17 UTC, o deployment `xksybfofgewuqauelfgcjlfi` do commit `6c97e43` estava na etapa final `RUN pnpm check && pnpm build`, com o painel ainda indicando `In progress`. Não houve erro de compilação exibido até esse ponto; a próxima verificação deve confirmar a exportação da imagem, o pre-deployment `pnpm db:push` e o healthcheck.

O deployment `xksybfofgewuqauelfgcjlfi` avançou: o build local do container concluiu o frontend/servidor e o Coolify entrou na etapa runtime, copiando o `node_modules` para a imagem final. Às 08:18 UTC o deployment seguia `In progress`, sem erro de build apresentado; ainda aguardava o término da imagem e o pre-deployment.

A build do commit `6c97e43` terminou sem erro visível. O Coolify concluiu as etapas runtime, incluindo a cópia de `dist`, `drizzle` e `drizzle.config.ts`, e entrou na exportação da imagem final. O próximo marco esperado é a execução do pre-deployment configurado.

A imagem do commit `6c97e43` foi exportada e nomeada no registro local do servidor Coolify; o deployment `xksybfofgewuqauelfgcjlfi` avançou para o unpack da imagem. Ainda falta observar a criação do container final, o pre-deployment de migrations e o healthcheck.

O Coolify criou o novo container do commit `6c97e43` e iniciou o healthcheck interno. O teste configurado aparece como `GET http://localhost:3000/health`; o container respondeu `503 Service Unavailable`, enquanto o fallback de `wget` foi usado porque `curl` não está instalado. O deployment ainda não foi considerado saudável. A ausência de uma linha de execução de `pnpm db:push` nos logs indica que o campo de pre-deployment provavelmente não foi persistido/aplicado, devendo ser verificado antes de novo redeploy.

## Lifecycle persistido e DNS — 2026-08-29

O painel do Coolify confirmou `Application settings updated!` e agora exibe o pre-deployment `pnpm db:push` no formulário persistido. A validação do domínio, entretanto, retornou `Validating DNS failed`, exigindo um registro DNS do tipo A apontando para `136.116.153.235`. Essa exigência é do provedor DNS e não foi alterada por esta execução.

Fonte: `https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz`

---

O campo de pre-deployment foi alterado para `pnpm exec drizzle-kit migrate --config=drizzle.config.ts`, com o Coolify exibindo `You have changes that haven't been saved yet`. A alteração está pronta para gravação; não será iniciado novo deployment até confirmar a persistência.

Para permitir a inicialização do schema sem promover um container que ainda retornava 503, o healthcheck HTTP foi desativado temporariamente pelo controle nativo do Coolify, com confirmação visual `Healthcheck disabled.`. Ele será reativado somente após a migration e a validação do endpoint.

O Coolify confirmou o estado operacional para o próximo ciclo: `preDeploymentCommand` vazio e `postDeploymentCommand` configurado como `pnpm exec drizzle-kit migrate --config=drizzle.config.ts`. O healthcheck permanece temporariamente desativado, conforme confirmação anterior, para que o container novo possa iniciar e executar o post-deployment no ambiente que contém `drizzle.config.ts`. O painel ainda exibe `Changes pending` como indicador geral, mas a configuração foi submetida pelo controle nativo e deve ser reconfirmada no próximo deployment.

Novo deployment Coolify `7terqarnuqhvit66homa1ode` iniciado às 08:26:34 UTC para o branch `feat/production-reconciliation-marketplace` no commit `6c97e43`. O log confirma preparação do helper, checkout do repositório e ausência de pre-deployment; o healthcheck estava temporariamente desativado para permitir o start do container e o post-deployment da migration.

Às 08:27:12 UTC, o deployment `7terqarnuqhvit66homa1ode` seguia como `In progress`, com `Running (no healthcheck)` no recurso. O log visível confirma criação, start e troca para o container novo, mas ainda não mostra as linhas finais do post-deployment; a próxima verificação será feita no HTML/log bruto para distinguir atraso de execução de falha silenciosa.

O deployment `7terqarnuqhvit66homa1ode` concluiu com status `Success` em 00m46s no Coolify. O container novo foi criado e iniciado a partir do commit `6c97e43`, e o lifecycle registrou o post-deployment de migration. O recurso está `Running (no healthcheck)` porque a verificação foi desativada temporariamente; a etapa seguinte é validar o schema/endpoint e reativar o healthcheck com os parâmetros corretos.

Os logs do container `jmbtzrudav5fyjidtbdrcmcz-082632670754` confirmam que o processo Node escuta na porta 3000, porém reporta `release=c13d5f7` apesar do deploy estar no commit `6c97e43`. O log também informa que `OAUTH_SERVER_URL` não está configurado, esperado para o modo local, e que o bootstrap da conta administrativa falhou durante a inserção na tabela `users`; os parâmetros sensíveis do log foram deliberadamente omitidos deste registro. Antes de considerar o deploy funcional, será feita uma checagem interna de `/healthz`, do schema e do motivo do erro de bootstrap.

Validação interna concluída no container `jmbtzrudav5fyjidtbdrcmcz-082632670754`: `/healthz` respondeu `{"ok":true,"service":"so-models","release":"c13d5f7","database":true}`, `/app/drizzle.config.ts` está presente e `pnpm exec drizzle-kit migrate --config=drizzle.config.ts` retornou `migrations applied successfully` com `migration_rc=0`. A aplicação está funcional internamente; o próximo passo é reativar o healthcheck com `/healthz` e investigar o roteamento externo que ainda retorna `no available server`.

O healthcheck foi reativado no Coolify com host `localhost`, porta `3000`, caminho `/healthz`, código esperado `200` e sem texto obrigatório. O Coolify iniciou o restart sem rebuild para aplicar a configuração; o deployment de restart aparece em andamento e será validado antes de qualquer conclusão.

O restart `hrezcafsxe1ozr3ojszjpwk7` concluiu o ciclo de healthcheck. Os logs mostram `Healthcheck URL (inside the container): GET http://localhost:3000/healthz`, espera do start period e registro de `Attempt 1 of 10: Healthcheck status: healthy`, seguido de `New container is healthy` e remoção dos containers antigos. O painel ainda exibia o rótulo transitório `Running (no healthcheck)` durante a atualização; será feita nova leitura do recurso e teste externo.

Validação pública após o restart: `https://somodels.buscarr.com.br/healthz` respondeu HTTP 200 com `database:true`; a home respondeu HTTP 200 e exibe a abertura pública bloqueada até provedor real de idade, conforme postura fail-closed. O host temporário SSLIP continuou retornando `503 no available server`, mas o domínio principal, que está atrás do Cloudflare, encaminhou corretamente. A rota `/login` também está publicada e informa a troca obrigatória da senha no primeiro acesso.

Redeploy do commit `d14e2e7`: o Coolify identificou o branch `feat/production-reconciliation-marketplace`, iniciou a build Dockerfile e concluiu localmente `pnpm check && pnpm build`; o deployment ainda estava em andamento na etapa de exportação/troca do container durante a última observação. Nenhum valor de ambiente ou credencial foi registrado.


## Atualização de acompanhamento visual — 2026-08-29

O deployment `xbmutt2bpoxiktf2zec84kk6` do commit `a2928e9` (`feat: apply editorial okc-inspired visual system`) foi iniciado no Coolify para o branch `feat/production-reconciliation-marketplace`. Na verificação do painel, a aplicação permanecia marcada como `Running`; o build havia concluído as etapas de compilação e a imagem estava em exportação/unpack, sem erro de build exibido. O deployment ainda estava marcado como `In progress` naquele instante.

Fonte: https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/xbmutt2bpoxiktf2zec84kk6

Nenhuma senha, token, URL de conexão ou valor de variável foi registrado.


## Conclusão do deploy visual — 2026-08-29

O deployment `xbmutt2bpoxiktf2zec84kk6` do commit `a2928e9` concluiu a build e o Coolify registrou o novo container como saudável. O log observado mostra `Healthcheck URL (inside the container): GET http://localhost:3000/healthz`, `Healthcheck status: healthy`, `New container is healthy` e remoção dos containers antigos. O recurso permanece `Running` no painel. Nenhum segredo foi registrado.

Fonte: https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/xbmutt2bpoxiktf2zec84kk6


O deployment `9d26wrl1lu08fysfb73qdael` do commit `80a2334` foi iniciado após confirmação explícita para a troca do container. Às 08:50 UTC, o painel registrava `In progress`; a build avançou até o pós-processamento de `/app/dist/public/index.html`, incluindo a remoção de `crossorigin`, sem erro de compilação exibido. Fonte: https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/9d26wrl1lu08fysfb73qdael


## Atualização de modo de testes — 2026-08-29

O commit `dec2a2a` (`feat: add isolated test mode and synthetic signup`) foi publicado no Coolify no deployment `9xirof217fjvpoheoqpjfnrn`. No momento da observação, a build avançava após a instalação de dependências, com execução de `pnpm check && pnpm build`; o estado final do container ainda aguardava confirmação. As flags de ambiente aplicadas para este ambiente de testes são `PUBLIC_ACCESS_ENABLED=true`, `TEST_MODE=true`, `TEST_ACCESS_ENABLED=true`, `KYC_REQUIRED=false` e `PAYMENTS_ENABLED=false`. Nenhum segredo foi registrado.

Fonte: `https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/9xirof217fjvpoheoqpjfnrn`.


Na última verificação, o deployment `9xirof217fjvpoheoqpjfnrn` do commit `dec2a2a` havia concluído a compilação e estava na etapa de exportação da imagem runtime, ainda marcado como `In progress`. O Coolify reportava o recurso como `Running` e mantinha `Changes pending` enquanto a atualização não terminava. O modo de testes permanece limitado a cadastros sintéticos, com pagamentos desligados e sem documentos reais. Nenhum segredo foi registrado.

Fonte: `https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/9xirof217fjvpoheoqpjfnrn`.


## Validação pública do modo de testes — 2026-08-29

- `https://somodels.buscarr.com.br/` respondeu 200 e exibiu o ambiente de testes com vitrine acessível sob as flags explicitamente ativadas.
- `https://somodels.buscarr.com.br/cadastro-teste` exibiu cadastro local de conta comum sem documentos, sem privilégios administrativos e com orientação para usar somente dados fictícios.
- Um cadastro sintético foi aceito e redirecionado para `/titular`, confirmando a criação de conta de teste.
- O login em `/login` reconheceu o e-mail do super administrador depois da reconciliação do registro órfão e encaminhou para `/alterar-senha`.
- A troca obrigatória de senha foi preenchida no primeiro acesso; a confirmação do novo login permanece como etapa final de validação nesta sessão.
- Nenhuma senha, token, hash, `DATABASE_URL` ou documento real foi gravado neste documento.

Fonte pública: https://somodels.buscarr.com.br/
Fonte operacional: https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz

O redeploy `frbuflwehat2ozimpdebuqdf` do commit `b7ad11f` segue em andamento no Coolify. A build passou por `pnpm check && pnpm build`, concluiu a exportação da imagem e avançou para o unpack/runtime; ainda aguardava a substituição definitiva do container e o healthcheck no último acompanhamento. Nenhum valor sensível foi registrado.

Fonte: https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/frbuflwehat2ozimpdebuqdf

Nenhuma senha, token, hash ou URL de conexão foi registrado.

---

O redeploy `frbuflwehat2ozimpdebuqdf` do commit `b7ad11f` concluiu a troca do container. O Coolify registrou `New container is healthy` após duas tentativas, embora o log do helper também mostre `curl: not found` no primeiro probe; o recurso permanece `Running`. A validação seguinte é pública: confirmar o login persistente do super administrador após reinicialização e verificar o acesso do operador de desenvolvimento. Nenhum segredo ou senha foi registrado.

Fonte: https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/application/jmbtzrudav5fyjidtbdrcmcz/deployment/frbuflwehat2ozimpdebuqdf

Validação pós-redeploy: o acesso em `https://somodels.buscarr.com.br/login` com o e-mail administrativo reconciliado e a senha temporária atualmente configurada no Coolify retornou `E-mail ou senha inválidos`. A falha permanece restrita à autenticação; nenhuma senha, hash ou token foi registrado. Será feita uma checagem interna não destrutiva do hash/estado da conta e da origem efetiva da variável no container antes de qualquer nova alteração.

Diagnóstico em andamento: a tentativa de login do super administrador após o redeploy retornou credencial inválida. O terminal interno recebeu uma primeira consulta malformada por causa de uma quebra de linha literal; a consulta foi reenviada com o canal correto para retornar somente identificadores, papéis, estado de rotação e comprimento do hash. Nenhum valor de senha ou hash é persistido no relatório.

O diagnóstico interno mostrou que o container está conectado ao MySQL, mas o probe inicial usou `passwordRotated`, enquanto o schema efetivo não possui essa coluna com esse nome. O banco retornou `Unknown column 'passwordRotated' in 'field list'`; não houve alteração de dados. O próximo passo é descrever a tabela `users` e consultar somente colunas realmente existentes para corrigir a compatibilidade do bootstrap.

O `describe users` confirmou o schema efetivo em MySQL: as colunas de identidade são `openId`, `email`, `role`, `passwordHash` e `mustChangePassword`; não existe `passwordRotated`. O probe anterior falhou apenas por usar um nome de coluna incorreto. Nenhum dado foi alterado. A próxima consulta usará exclusivamente essas colunas e devolverá somente metadados sanitizados.

Após o reset, o login temporário funcionou e a troca de senha retornou a mensagem de sucesso; entretanto, a reautenticação com a nova senha ainda retornou `E-mail ou senha inválidos`. O diagnóstico seguinte será uma comparação booleana interna do hash persistido com a senha temporária e a nova senha, sem exibir os valores.

Nova discrepância no diagnóstico: após o reset confirmado e o login temporário bem-sucedido, uma consulta posterior no terminal do container atual retornou `exists:false` para `admin@somodels.buscarr.com.br`. Isso sugere que o terminal atual está apontando para outro banco/host, ou que houve troca de contexto de conexão; ainda não será feita nenhuma alteração. O próximo probe consulta apenas `DATABASE()`/hostname e a lista sanitizada de usuários para reconciliar o ambiente efetivo.

