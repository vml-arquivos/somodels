# Notas de auditoria inicial

Data da auditoria: 2026-08-29.

## Estado confirmado

- Repositório autorizado: `https://github.com/vml-arquivos/somodels.git`.
- Branch padrão: `main`.
- SHA remoto/local confirmado: `5620ee60791953f8baf82eb93b59f4f622ef0c38`.
- O commit local histórico `757f8e7` não está na branch clonada e não foi usado.
- Repositório público e branch `main` sem proteção configurada.
- Não há conector correspondente a `coolify` ou `qualify` na configuração atual da sessão.
- `https://somodels.buscarr.com.br` resolve via Cloudflare para `172.67.212.19` e `104.21.93.162`, mas responde `HTTP/2 503` com `no available server`.
- O repositório não contém, no estado auditado, `Dockerfile` ou `.env.example` na raiz.

## Arquitetura observada

- Frontend React/Vite com roteamento client-side via Wouter.
- Backend Express + tRPC.
- Persistência MySQL via Drizzle ORM.
- Sessão JWT em cookie e fallback Bearer; login principal por OAuth Manus.
- Storage via proxy `/manus-storage/*` e endpoint base64 `/api/upload/media`.
- Schema atual possui apenas `users`, `profiles`, `profile_media` e `premium_entitlements`.
- Migrations atuais: `0000_living_human_fly.sql` e `0001_careless_annihilus.sql`.

## Gaps críticos confirmados

- Não existe age gate efetivo nem verificação server-side de idade.
- O proxy de storage não autentica, não verifica idade, não verifica entitlement premium, não verifica status de perfil/mídia e redireciona para URL assinada qualquer chave conhecida.
- URLs de mídia são retornadas pelo backend público; fotos e vídeos aprovados não têm política de acesso baseada em verificação.
- Não há KYC/identidade/prova de vida, nem bloqueio de publicação por KYC.
- Autenticação não possui confirmação de e-mail, recuperação de senha, revogação server-side, trilha de auditoria ou rate limiting; a sessão padrão expira em um ano.
- `trust proxy`, CORS/CSRF explícito, CSP, rate limits e headers de segurança abrangentes não estão configurados.
- Upload aceita JSON base64 de até 50 MB no parser, limita arquivo depois do parse, usa nome original sanitizado e não valida magic bytes/antimalware; o fluxo é pesado para mobile.
- Healthcheck existente é `/healthz`; não há endpoint de SHA/release.
- SEO é client-side e limitado a title/description/canonical; não há SSR/prerender, Open Graph, Twitter Cards, JSON-LD, sitemap ou robots observados.
- Rotas públicas atuais incluem `/`, `/perfil/:slug`, `/cidade/:city`, `/titular` e `/admin`; não há a arquitetura `/acompanhantes/...` e `/guias/...` solicitada.
- Página pública exibe contato textual e mídias aprovadas sem gate real; vídeos premium apenas criam uma intenção pendente, sem checkout ou provedor aprovado.
- Role atual é somente `user|admin`; não há distinção `super_admin`/`dev` nem fluxo de credenciais locais, confirmação de e-mail ou alteração obrigatória de senha.

## Regra de execução

Nenhuma migration ou mudança destrutiva em produção foi executada. O deploy não pode ser confirmado até que o acesso ao painel/ambiente Coolify/Qualify seja disponibilizado na sessão ou por URL/credencial segura. O trabalho seguro continua localmente, preservando secrets e preparando configuração/documentação sem inventar credenciais.

## Coolify confirmado após autenticação

- A sessão autenticada abriu o projeto `somodels`, ambiente `production`.
- O ambiente exibe apenas 1 recurso: banco `somodels`, tipo Database, status Running, servidor localhost.
- Não há aplicação web cadastrada nesse ambiente no momento; por isso o domínio público retorna `503 no available server`.
- O painel está acessível em `https://coolifycar.casadf.com.br` e a versão exibida é Coolify v4.3.14.

## Banco e configuração no Coolify

- O recurso chamado `somodels` é PostgreSQL `postgres:17-alpine`, não MySQL 8/TiDB como o código Drizzle atual exige.
- O banco está marcado como privado e em estado degradado/healthcheck starting no painel observado.
- A página de variáveis de ambiente do recurso de banco informa que não há variáveis configuradas.
- O valor sensível exibido na tela não foi copiado para nenhum arquivo, log ou mensagem.
- Antes de qualquer mudança, é necessário definir se o banco PostgreSQL atual será substituído por MySQL compatível ou se o projeto será migrado conscientemente para PostgreSQL; não será feita conversão destrutiva nem migration incompatível por presunção.

## Persistência e backup

- O banco possui um volume Docker nomeado montado em `/var/lib/postgresql/data`, portanto há persistência básica do container.
- O recurso, contudo, não possui backups agendados: o painel informa 0 schedules, 0 enabled e 0 executions.
- A ausência de backup consistente e verificável impede executar migrations de produção com segurança até que um backup seja criado ou que se confirme uma alternativa equivalente.

- O healthcheck do banco está habilitado com parâmetros padrão visíveis de intervalo 15 s, timeout 5 s, retries 5 e start period 5 s.
- A tela de logs do banco informa `No logs yet`, portanto o painel não fornece evidência operacional para explicar o estado degradado.

- O terminal web do recurso PostgreSQL abriu e apresentou prompt `/ #`, mas não executamos comandos ainda; a sessão está pronta para consultas somente leitura e backup controlado.

## Consulta somente leitura no banco

- `pg_isready` retornou que o PostgreSQL está aceitando conexões no socket local.
- A tentativa de consulta usando os valores padrão expostos pelo próprio container falhou porque a role configurada não existe; nenhum dado foi alterado e nenhuma migration foi executada.
- Esse resultado explica o estado degradado do recurso: há divergência entre as credenciais configuradas no painel e as roles efetivamente inicializadas no PostgreSQL.
- O backup lógico ainda não pode ser considerado concluído; primeiro é necessário corrigir/confirmar a credencial administrativa ou usar o mecanismo de backup do próprio Coolify.

- A consulta de roles com a role padrão `postgres` também falhou com `role "postgres" does not exist`. Assim, o servidor aceita conexões, porém não existe uma role administrativa utilizável com os nomes esperados pelo container/painel; isso exige correção do recurso ou reinstalação controlada após backup, não uma migration da aplicação.

## Recursos disponíveis no Coolify

- O catálogo de novos recursos do ambiente oferece `MySQL` e `Dockerfile`, além de repositórios Git públicos/privados e PostgreSQL.
- O caminho seguro é criar um MySQL separado e publicar a aplicação pelo Dockerfile versionado, mantendo o PostgreSQL existente preservado até uma auditoria própria.

## Catálogo de recursos observado

Fonte: https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/new

- O catálogo autenticado oferece diretamente `MySQL`, `PostgreSQL`, `MariaDB`, `Public Git Repository` e `Dockerfile`.
- A opção MySQL é descrita pelo painel como banco relacional para aplicações web; ela é compatível com o driver `drizzle-orm/mysql2` usado pelo repositório.

## MySQL resource criado

O Coolify criou um recurso MySQL separado com ID `9shzi6fal9driq5lct3n0sju`, imagem `mysql:8`, status inicial `Exited`, usuário normal padrão `mysql`, banco inicial padrão `default` e URL interna disponível no painel. O painel também mostrou um mapeamento de porta padrão `3000:3306`; isso deve ser removido para manter o banco privado dentro da rede do ambiente. Senhas e URL interna geradas não foram copiadas para arquivos nem relatórios.

A edição em massa do formulário atualizou nome, descrição, usuário e banco, mas os campos de opções Docker e mapeamento de portas permaneceram visualmente com os valores padrão. Foi iniciada correção individual; não iniciar o MySQL com essa configuração até confirmar que o mapeamento público e privilégios extras foram removidos.

Após a tentativa normal, os campos controlados do Coolify foram atualizados individualmente e confirmados pelo DOM: as opções Docker e o mapeamento de portas ficaram vazios. Ainda falta clicar em `Save changes` e verificar no formulário persistido; os valores gerados de senha/URL continuam não registrados.

A configuração visível antes de salvar foi ajustada para `somodels-mysql`, banco/usuário `somodels`, opção `--security-opt=no-new-privileges:true` e binding de porta `127.0.0.1:3306:3306`; o recurso continua privado. Senhas e URL interna continuam fora dos registros.

Coolify confirmou `Database updated.` e a configuração persistida foi verificada: recurso `somodels-mysql`, imagem `mysql:8`, banco e usuário `somodels`, opção `--security-opt=no-new-privileges:true`, binding `127.0.0.1:3306:3306`, acesso público `Private`, status ainda `Exited`. As credenciais geradas permanecem somente no Coolify.

O MySQL privado foi iniciado no Coolify. O painel confirmou o início do download da imagem `mysql:8` e o modal ainda mostrava a extração das camadas; o status final saudável ainda precisa ser verificado após a inicialização terminar.

A tentativa de iniciar o MySQL falhou antes de subir o container porque o runtime do Coolify interpretou `--security-opt=no-new-privileges:true` como opção inválida (`Invalid security-opt: "no"`). O container não chegou a ficar saudável e permanece `Exited`; a opção deve ser trocada por uma forma aceita pelo painel ou removida, mantendo somente o binding privado.

O Coolify aceitou e salvou a correção `--security-opt=no-new-privileges` sem erro de validação. O recurso continua privado e parado; a nova tentativa de inicialização ainda precisa confirmar se o container sobe com o runtime corrigido.

A segunda tentativa também falhou no mesmo ponto: mesmo com `--security-opt=no-new-privileges`, o runtime do Coolify registrou `invalid security-opt: "no"`. Conclusão operacional: o campo Custom Docker options do recurso não é compatível com esse formato e deve ser limpo/removido antes de novo start; o binding privado permanece adequado.

O modal de startup foi fechado para corrigir o campo. A interface ainda exibe o valor antigo no input controlado, portanto a remoção precisa ser aplicada com evento DOM e confirmada pelo save; nenhum segredo foi copiado.

O Coolify aceitou e salvou a opção `--cap-drop=SYS_ADMIN`; o recurso segue privado e parado após a falha anterior. Essa opção será validada em um novo start antes de prosseguir com o deploy da aplicação.

Fonte: https://coolifycar.casadf.com.br/project/yrld0mp30fxxj5qnuz0wb70n/environment/wbfn3zzcbzbjwwrccucuz5xm/database/9shzi6fal9driq5lct3n0sju

Após remover a opção incompatível e salvar `--cap-drop=SYS_ADMIN`, o MySQL iniciou com sucesso: o painel registrou `Container Created`, `Starting`, `Started` e `Database started`. O único aviso foi sobre memory swappiness/cgroup e não impediu o startup. O recurso aparece como `Running (healthcheck starting)` no momento da captura; falta aguardar o healthcheck e validar a conexão pelo terminal.

A verificação seguinte manteve o MySQL como `Running (healthcheck starting)` e os logs continuam sem erro fatal após `Database started.`. O healthcheck final ainda não foi observado como `healthy`; a aplicação não deve ser conectada nem migrada até essa validação.
