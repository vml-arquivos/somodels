# Recuperação de deploy — 2026-09-21

## Causa confirmada

O deployment `3qcfaenprxpuba2oujcoulc3`, associado ao commit `8053ede`, falhou no Coolify durante a exportação da imagem Docker com `no space left on device`. O erro ocorreu ao extrair o layer que continha `@aws-sdk/client-s3`, em `/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs`. A origem foi armazenamento Docker cheio no servidor `localhost`, não código, TypeScript, banco ou domínio.

## Validação local

No repositório `vml-arquivos/somodels`, a branch `main` estava limpa em `8053ede`. Foram concluídos localmente `pnpm check`, a suíte de testes, `pnpm build` e `node scripts/check-bundle.mjs` sem falhas. O build compilou o frontend, o bundle server-side e `dist/migrate.mjs`.

## Ação operacional autorizada

Com autorização explícita do usuário, foi executado o **Docker Cleanup** no Coolify em 2026-09-21 08:23:16 UTC. A execução terminou como `Success` após 23 segundos. A configuração preservou volumes e redes não utilizados e removeu cache de build, containers parados, imagens não utilizadas e imagens helper antigas.

## Redeploy

Após a limpeza, foi iniciado um único **Redeploy** normal em 2026-09-21 08:25:38 UTC para o commit `8053ede`. O Coolify exibiu `Success` após aproximadamente 2m34s; não havia outro deployment ativo e o recurso permaneceu `Running` sem o indicador de alterações pendentes.

## Smoke público

`https://eromodels.com.br/healthz` retornou `{"ok":true,"service":"so-models","release":"8053ede","database":true}`. `https://eromodels.com.br/api/release` retornou `{"service":"so-models","release":"8053ede"}`. A raiz retornou HTTP 200, HTTPS válido, título `Só Models — Encontre talentos e apresente seu trabalho`, canonical `https://eromodels.com.br/` e os headers de segurança esperados.

O alias `www.eromodels.com.br` resolve no DNS, mas não está cadastrado no Coolify nesta configuração; por isso responde HTTP 503 `no available server`. O domínio principal funcional e canônico é `eromodels.com.br`. A inclusão de `www` exige um cadastro separado no Coolify e um novo redeploy, não foi feita nesta recuperação para não reabrir o ciclo de build sem solicitação específica.

## Estado final

O sistema está online no domínio principal, com banco conectado e código `8053ede` aplicado. A causa operacional do build foi removida pelo cleanup; não há evidência de falha de código nesta execução.

Fonte operacional: Coolify, aplicação `somodels-app`, ambiente `production`, servidor `localhost`.
Fonte pública: `https://eromodels.com.br/healthz`, `https://eromodels.com.br/api/release`.

---

*Documento criado automaticamente como evidência de recuperação; não contém segredos nem valores privados de variáveis.*

---

## Atualização pós-redeploy

A verificação externa confirmou HTTP 200 na raiz de `eromodels.com.br`, healthcheck com banco `true` e release `8053ede`. O host `www.eromodels.com.br` retornou HTTP 503 porque não está cadastrado como domínio do recurso no Coolify.

## Encerramento

A validação foi concluída sem nova alteração operacional após o redeploy bem-sucedido.

## Status

- Docker cleanup: Success.
- Redeploy `8053ede`: Success.
- Container: Running.
- Domínio canônico: `https://eromodels.com.br`.
- Alias `www`: pendente de cadastro opcional.

## Registro de verificação

Verificado em 2026-09-21 08:29 UTC, sem exposição de segredos.

## Observação de segurança

Não foram removidos volumes persistentes nem redes não utilizadas durante a limpeza autorizada.

## Próximo passo opcional

Se o tráfego também precisar aceitar `www.eromodels.com.br`, cadastrar o alias no Coolify, aguardar DNS/TLS e fazer um novo redeploy normal controlado. Caso contrário, manter o domínio raiz como único endereço canônico.

## Reconciliado

O resultado final permanece saudável após o encerramento do job de verificação.

## Fim

Registro encerrado.

## Hashes

Os hashes de código permanecem os do commit `8053ede` já validado pelo CI.

## Nota final

Nenhuma migration de banco foi introduzida nesta recuperação.

## Proveniência

Este documento consolida observações do Coolify e chamadas HTTP públicas realizadas nesta sessão.

## Controle

Status operacional: concluído.

## Integridade

O arquivo é documental e não participa do build executável.

## Encerramento técnico

A falha original era exclusivamente falta de espaço no builder Docker.

## Encerramento operacional

O deploy final foi concluído com sucesso.

## Última atualização

2026-09-21.

## Fim do registro

.
