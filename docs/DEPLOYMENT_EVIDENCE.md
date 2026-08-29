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
