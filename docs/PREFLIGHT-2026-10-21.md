# Ero Models — preflight verificável

**Data de referência:** 21 de outubro de 2026, sessão local em 22/10 UTC  
**Repositório:** `vml-arquivos/somodels`  
**Domínio público:** `https://eromodels.com.br`  
**Branch de trabalho:** `feat/evolution-preflight-client-rbac-20261022`  
**Escopo desta fotografia:** Etapa A do prompt mestre; nenhuma alteração foi feita na `main` e nenhum deploy foi executado.

## 1. Linha de base observada

- `main` remoto e checkout local: `95a7ab1455f3f94824d061ac3a3b1af24e8497d3`.
- Release público em `GET /api/release`: `a8e5a8e`.
- `GET /healthz`: HTTP 200, `ok: true`, `database: true`, release `a8e5a8e`.
- A branch principal está dois commits à frente do release público (`78a43b8` e `95a7ab1`). Isso não prova defeito, mas prova divergência de artefato.
- `GET /robots.txt` permite rastreamento geral, mas bloqueia áreas privadas e API; `GET /sitemap.xml` responde. A home pública carregou com age gate e vitrine vazia na inspeção realizada.
- As rotas `/conta` e `/cliente` ainda não existem no release público; foram adicionadas somente nesta branch de feature.

## 2. GitHub

Branches remotas identificadas: `main`, `chore/ero-models-env-example`, `feat/adult-classified-marketplace-2026-10-05`, `feat/adult-legal-disclosure-policy`, `feat/production-reconciliation-marketplace`, `feat/self-attested-age-gate-2026-10-05` e `fix/profile-delete-and-account-separation`.

PRs abertos observados no GitHub:

| PR                                             | Estado | Mergeabilidade | Decisão nesta etapa                                   |
| ---------------------------------------------- | ------ | -------------- | ----------------------------------------------------- |
| #14 — alinhar `.env.example`                   | aberto | `MERGEABLE`    | não mesclado automaticamente                          |
| #15 — divulgações legais com consentimento     | aberto | `CONFLICTING`  | requer reconciliação sem escolher `ours/theirs`       |
| #16 — exclusão de perfil e separação de contas | aberto | `CONFLICTING`  | dependência arquitetural; não mesclar automaticamente |

A proteção de branch reportada pela API do GitHub está desligada. Isso não autoriza force-push, merge automático ou alteração direta da `main`.

## 3. Coolify / ambiente de hospedagem

O painel acessado foi `https://coolifycar.casadf.com.br/`, no caminho fornecido pelo responsável. A aplicação observada foi:

- Projeto: `somodels`.
- Ambiente: `production`.
- Aplicação: `somodels-app`.
- Estado mostrado: `Running`.
- Source: Public GitHub, repositório `vml-arquivos/somodels`, branch `main`, commit configurado como `HEAD`.
- Fotografia inicial (21/10): somente `https://eromodels.com.br` estava configurado, com DNS correspondente, porta 3000 e redirecionamento HTTP → HTTPS habilitado.
- Na fotografia inicial, `conta.eromodels.com.br` e `admin.eromodels.com.br` ainda não estavam observáveis no Coolify; a decisão posterior de DNS/TLS/host foi registrada no ADR-0002.
- Healthcheck: HTTP GET para `localhost:3000/healthz`, esperado 200, intervalo 5 s, timeout 5 s, 10 tentativas, start period 5 s.
- A tela inicial de source/healthcheck mostrou “changes that haven't been saved yet”; a fotografia inicial não clicou em `Reset` nem em `Save changes`.
- A tela inicial de variáveis mostrou 60 entradas e nenhum valor foi copiado para logs, relatório ou chat; a atualização posterior não alterou variáveis ou segredos.
- O painel informou que não há tokens de secret manager cadastrados e que não há canais de notificação habilitados. Isso é risco operacional para lançamento, não motivo para criar integração unilateralmente.

### Atualização operacional observada em 22/10/2026

- `conta.eromodels.com.br` e `admin.eromodels.com.br` resolvem via DNS/Cloudflare e estão associados no Coolify; a aplicação mostra exatamente os três domínios (`eromodels.com.br`, `conta.eromodels.com.br`, `admin.eromodels.com.br`), todos com `DNS matches` e HTTP → HTTPS habilitado.
- O deploy `nd415rf8z5i6irutfozsdvjc` terminou `Success` no commit `176f80576bcff79ad576ddf7dec1330b03db1e38`; `/healthz` retornou 200 com `database: true`.
- `/api/release` ainda retorna `2a9a43e2ee9cfe837a77afdfa141bb249c3a4f98`, porque `APP_RELEASE` permanece nesse metadata antigo. Foi tentada uma alteração exclusiva dessa variável no editor do Coolify, mas o Livewire respondeu 500; a página foi recarregada, o recurso continuou `Running` e nenhuma mudança parcial foi observada. Isso é uma divergência de rastreabilidade, não uma falha do código/healthcheck.
- Smoke final: `/` redireciona para `/conta` no host de conta e para `/admin` no host administrativo; ambas as rotas retornam 200, `robots.txt` retorna `Disallow: /` e `sitemap.xml` é vazio.

Pelo nome do ambiente (`production`), domínio público e aplicação ativa, este alvo deve ser tratado como **produção**. Portanto, qualquer deploy, migration, mudança de flag, domínio ou source permanece sujeito a gate final explícito.

## 4. Instalação e gates locais

- Node.js: `v22.13.0`.
- pnpm: `10.4.1`.
- `pnpm install --frozen-lockfile`: concluído.
- `pnpm check`: concluído.
- `pnpm test`: concluído — 16 arquivos e 80 testes.
- `pnpm build`: concluído; maior chunk de frontend aproximadamente 401,4 KiB, abaixo do limite configurado de 650 KiB.

Avisos que continuam pendentes de confirmação no CI/runtime:

1. O pnpm informou que o campo `pnpm` do `package.json` não lê `patchedDependencies` e `overrides`.
2. Scripts de build de `@tailwindcss/oxide` e `esbuild` foram ignorados na instalação.
3. O build local passou, mas a política de scripts/patches do CI oficial deve ser verificada antes de declarar a instalação plenamente reproduzível no Coolify.

## 5. Schema, migrations e flags

- O stack observado é React, TypeScript, Vite, Express, tRPC, Drizzle ORM e MySQL/TiDB.
- O journal possui migrations `0000` a `0006`; as migrations históricas `0000`–`0005` não foram alteradas.
- Não há `drizzle/meta/0006_snapshot.json` no checkout. O alinhamento de metadata e a aplicação de `0006_profile_lifecycle.sql` no banco real continuam sem prova por não haver acesso direto ao banco.
- As flags críticas do `.env.example` são fail-closed: marketplace, classificados, age assurance, identidade, contato seguro, conteúdo de criador 18+, favoritos, bloqueios, denúncias e pagamentos começam desligadas.
- Pagamentos, premium, provider externo de idade e KYC permanecem bloqueados. Nenhuma cobrança, documento, verificação real ou seed foi executado.

## 6. Gap analysis resumido

| Área                                            | Estado observado                                                                                 | Próximo gate                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Vitrine, busca, perfil público e institucionais | operacional quando gates/flags estão abertos; bloqueada por configuração no release observado    | validar dados reais publicados, age gate, SEO e mobile em homologação                       |
| Login local, sessão e logout                    | parcial; rotas locais funcionam, retorno seguro foi ampliado nesta branch                        | E2E com contas de teste e reset real em ambiente isolado                                    |
| Área de cliente                                 | inexistente no release; `/conta` e `/cliente` implementados nesta branch com recursos existentes | testar com dois clientes e flags de favoritos/bloqueios/denúncias habilitadas em QA         |
| Área de titular                                 | CRUD, editor, upload, checklist, galeria ordenável e metadados revisáveis nesta branch           | testar E2E com mídia aprovada/pending e avaliar host de conta                               |
| Administração                                   | operations/moderação/financeiro manual existem                                                   | separar RBAC por função, MFA para privilégio alto e matriz aprovada                         |
| Allowlist administrativa                        | backend tRPC reconhecia e-mail verificado, UI/HTTP tinham divergências                           | corrigido nesta branch para login, UI e preview/upload; testar com conta allowlisted        |
| Reset de senha                                  | emissão usava token base64url, validação aceitava apenas hex de 64 caracteres                    | corrigido nesta branch e coberto pela suíte existente                                       |
| Premium/pagamentos                              | estrutura sem fluxo; perfil mostra estado reservado sem URL/checkout                             | provider adulto aprovado, sandbox, webhook/reconciliação/entitlement antes de qualquer flag |
| Age/KYC externo                                 | estruturas sem callback de aprovação                                                             | decisão de fornecedor, contrato, retenção, callback assinado e homologação                  |
| Hosts `conta`/`admin`                           | não configurados no Coolify/DNS                                                                  | decisão de host, TLS, CORS/CSRF e SSO isolado; não alterar produção agora                   |
| Backup/restore e banco                          | não comprovados nesta sessão                                                                     | backup consistente e restore em ambiente separado antes de migration/deploy                 |

## 7. Evidência desta branch

Esta branch implementa somente mudanças reversíveis e sem migration:

- área de cliente em `/conta` e alias `/cliente`, sem menu de checkout/premium fictício;
- listas privadas de favoritos e bloqueios usando procedures já autenticadas;
- consulta privada das próprias denúncias, sem expor alvo ou evidência sensível;
- login de usuário comum para `/conta`, com `returnTo` restrito a rotas locais permitidas;
- correção do formato de token de reset para o token realmente emitido;
- autoridade administrativa efetiva compartilhada entre allowlist, tRPC, UI e upload/preview HTTP;
- galeria do titular com ordenação persistente, título/descrição e retorno a revisão quando metadado de mídia aprovada muda;
- perfil público com estados gratuitos e premium sem expor URL protegida ou criar checkout fictício;
- perfil só exibe contato quando `showContact` está explicitamente ativo;
- matriz, ADR e inventário operacional em documentação versionada.

## 8. Gates ainda pendentes antes de publicação

1. Resolver semanticamente PRs #15 e #16 e decidir o destino de PR #14.
2. Confirmar a conta/branch/SHA exatos que o Coolify deve publicar; substituir `HEAD` por SHA aprovado somente após gate.
3. Obter backup e restore verificáveis do banco de produção; confirmar migration aplicada sem `db:push` destrutivo.
4. Homologar E2E de público, cliente, titular e administração em ambiente não produtivo com contas de teste não sensíveis.
5. Aprovar DNS/TLS/SSO para hosts de conta e administração, se essa separação for lançada.
6. Manter flags de marketplace, KYC não homologado, conteúdo pago e pagamentos desligadas.
7. Fazer confirmação final específica antes de qualquer deploy neste ambiente `production`.
