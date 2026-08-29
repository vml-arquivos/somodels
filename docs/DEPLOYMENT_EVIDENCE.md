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
