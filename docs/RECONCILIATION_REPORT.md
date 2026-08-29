# Relatório de reconciliação

## Estado inicial confirmado

A branch padrão do repositório remoto é `main`, com SHA inicial `5620ee60791953f8baf82eb93b59f4f622ef0c38`. O commit local histórico `757f8e7` não estava disponível remotamente e não foi utilizado. A branch de trabalho é `feat/production-reconciliation-marketplace`.

O domínio `https://somodels.buscarr.com.br` estava apontado para Cloudflare, mas retornava HTTP 503 com `no available server`. No Coolify, o projeto `somodels`, ambiente `production`, exibia apenas um recurso de banco chamado `somodels`; não havia recurso de aplicação web cadastrado.

## Divergências críticas

O código usa MySQL/TiDB com `drizzle-orm/mysql2`, enquanto o recurso de banco do Coolify é PostgreSQL 17. O recurso tem volume persistente nomeado, mas não possui backup agendado. O PostgreSQL aceita conexões no socket local, porém as roles esperadas (`modelsdb` e `postgres`) não existem, então não foi possível executar consulta de schema nem backup lógico com segurança. Nenhuma alteração de dados ou migration foi aplicada.

A aplicação inicial não possuía Dockerfile, `.env.example`, age gate server-side, proteção efetiva de mídia, KYC, sessões locais revogáveis, distinção de papéis administrativos, endpoint de release, sitemap/robots server-side ou controles de upload suficientemente restritos.

## Reconciliação executada no código

Foi criada a branch de produção, ampliado o schema com primitives de segurança, verificação, moderação, auditoria e monetização, adicionada a migration `0002_certain_carlie_cooper.sql`, implementados controles fail-closed, login local administrativo com rotação obrigatória de senha, Dockerfile, configuração de ambiente e documentação operacional. A migration foi gerada localmente contra uma URL MySQL fictícia apenas para gerar SQL e não foi aplicada a nenhum banco.

A arquitetura de produção recomendada é manter o PostgreSQL atual preservado até que suas credenciais e conteúdo sejam auditados, criar um recurso MySQL 8/TiDB compatível no ambiente, configurar volume e backup e só então cadastrar o recurso de aplicação com a mesma rede e `DATABASE_URL` interna. Não é seguro converter ou apagar o PostgreSQL existente neste fluxo.

## Bloqueios reais ainda presentes

A abertura pública está desativada por padrão porque não há provedor real de verificação de idade configurado. KYC e pagamentos também permanecem desativados ou bloqueados até credenciais, webhook assinado e aprovação comercial/jurídica. O deploy final ainda depende da criação de um banco MySQL compatível e de um recurso de aplicação no Coolify.

## Evidências de qualidade

Antes das alterações, `pnpm check`, `pnpm test` e `pnpm build` passaram. Após a primeira implementação, o `pnpm check` voltou a passar. Os demais gates finais, Docker build, migration em cópia segura e smoke tests de produção devem ser registrados em [`DEPLOYMENT_EVIDENCE.md`](DEPLOYMENT_EVIDENCE.md) somente após o ambiente compatível estar disponível.
