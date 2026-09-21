# Auditoria de follow-up e implementação — Só Models

## Escopo e proveniência

Esta revisão foi feita em 20 de setembro de 2026 sobre o repositório Git `vml-arquivos/somodels`, usando `main` e o commit publicado `8b268f2` como fonte de verdade. O prompt anexado referencia o arquivo `somodels-main(6).zip`, mas esse ZIP não estava disponível no workspace; por isso, nenhuma conclusão foi baseada em um pacote não verificável. O ambiente real continuou protegido: as flags de lançamento público, indexação, contato externo, denúncias e bloqueios permanecem sob controle das variáveis existentes e não foram abertas automaticamente.

## Estado anterior e lacunas confirmadas

A base anterior já tinha autenticação local, sessão revogável, termos versionados, invalidação por mudança de conteúdo, storage protegido, mídia privada até moderação, fila administrativa, denúncias auditadas, bloqueios, favoritos, SEO server-side, páginas institucionais e sitemap fail-closed. A auditoria confirmou, porém, que a rota administrativa de novo portfólio não estava registrada no roteador; não havia CTA no painel; o upload HTTP aceitava somente o owner; o titular via apenas estados curtos sem checklist de publicação; a aprovação não exigia mídia pública aprovada; rejeições e suspensões podiam ser registradas sem motivo obrigatório; não existia cadastro real de titular; e a home ainda usava copy genérica. O release público anterior já havia sido reconciliado com o commit `91ee13b` antes desta etapa.

## Implementações realizadas

| Área | Resultado |
| --- | --- |
| Cadastro | Foi criado `/cadastro`, com senha mínima de 16 caracteres, rate limit de cinco tentativas por IP por hora, conta sempre criada como `user`, sessão local e auditoria. O cadastro de homologação continua separado e bloqueado em produção. |
| Titular | `/titular` mantém criação de rascunho, edição, upload privado, aceite exclusivo do titular e envio para revisão. Agora apresenta labels operacionais, motivo de ajustes/suspensão, link público somente quando publicado e checklist backend de termos, identidade, mídia e configuração. |
| Administração | `/admin/portfolio/novo` foi registrado com lazy loading, noindex e gates de backend. O painel ganhou o CTA “Criar portfólio para um titular”. O administrador pode preparar dados e mídia de titular ativo, mas não aceita o termo nem registra confirmações contratuais em nome do titular. |
| Mídia | Upload administrativo usa o owner real no storage, valida conta ativa, mantém mídia pendente/privada e registra `media.created_by_admin` com o administrador como ator. O endpoint de preview continua protegido. |
| Moderação | Aprovação passou a exigir titular ativo, identidade vigente quando configurada, termo atual, perfil completo, categoria permitida e pelo menos uma mídia pública aprovada; mídia pendente bloqueia aprovação. Rejeição e suspensão exigem motivo. A aprovação com configuração pública fechada fica como “Aprovado oculto” com bloqueadores específicos. |
| Publicação | A alteração de mídia reconcilia `isPublished` quando o perfil já aprovado ganha ou perde sua última mídia pública. A publicação também permanece bloqueada se acesso/lançamento/indexação/galeria estiverem fechados ou se denúncia e bloqueio não estiverem operacionais. |
| Contato | O editor privado gera automaticamente `tel:` e `https://wa.me/` a partir de telefone normalizado. Quando a capability de contato seguro for habilitada por operação autorizada, WhatsApp também pode usar o telefone quando o campo WhatsApp estiver vazio. O número nunca retorna no payload público; a saída externa continua autenticada, age-gated, bloqueada por ACL e auditada. |
| Home | A home recebeu posicionamento mais claro, CTA para explorar e CTA para criar portfólio, orientações para titulares e visitantes, descoberta por cidade/categoria e seção de publicação responsável. Foi adicionado fallback `noscript` navegável e um fallback reversível em código atualiza a copy padrão antiga sem sobrescrever customizações administrativas. |
| SEO | A rota de cadastro e a rota administrativa nova têm title, description, canonical e noindex server-side. Perfis públicos recebem JSON-LD seguro sem telefone, endereço preciso ou dados privados. O perfil client-side também atualiza JSON-LD durante navegação SPA. |

## Migration, backup e integridade

Foi verificado no Coolify que a aplicação não possui backups agendados (`Schedules 0`, `Enabled 0`, `Total executions 0`). Por segurança, a migration incremental inicialmente considerada para a copy foi retirada antes do commit. A atualização da copy legada ficou somente como fallback reversível em código e não altera dados persistidos. As migrations históricas `0000` a `0005` não foram editadas.

## Validação local

Foram executados com sucesso `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test -- --run`, `pnpm build` e `git diff --check`. O resultado final local foi de 14 arquivos de teste aprovados e 72 testes aprovados. O bundle principal permaneceu abaixo do limite automatizado de 650 KiB. O smoke HTTP local confirmou HTTP 200, SEO SSR correto e `noindex` para `/cadastro`, `/admin/portfolio/novo`, `/titular`, `/admin`, cidade, categoria e perfil inexistente; também confirmou ausência de `tel:` e `wa.me` no HTML inicial de perfil indisponível.

## O que continua deliberadamente não habilitado

A implementação não inventa providers nem abre capabilities sem operação. Permanecem desligados ou condicionados no ambiente real: `PUBLIC_LAUNCH_ENABLED`, `ROBOTS_NOINDEX=false`, `SECURE_CONTACT_ENABLED`, `AGE_ASSURANCE_ENABLED`, `IDENTITY_VERIFICATION_ENABLED` quando provider não estiver configurado, `PAYMENTS_ENABLED`, `CREATOR_CONTENT_18_ENABLED`, `ESCORT_LISTINGS_ENABLED` e qualquer conteúdo adulto ou pago. A publicação de perfis reais exige, adicionalmente, titular real ativo, aceite vigente, identidade quando aplicável, mídia aprovada, denúncia e bloqueio habilitados, backup/rollback confirmados e pelo menos um perfil consentido revisado. Nenhum perfil real foi criado automaticamente nem dados de demonstração foram inseridos no banco de produção.

## Deploy e critérios pós-deploy

O código desta etapa só deve ser considerado operacionalmente concluído depois de um deploy normal no Coolify com backup confirmado para qualquer futura alteração de dados, `GET /healthz` saudável, `/api/release` igual ao SHA efetivamente implantado, rotas públicas e privadas respondendo conforme esperado, sitemaps mantendo o fail-closed e logs sem segredos. Como esta entrega não altera schema nem dados persistidos, o rollback é o procedimento documentado no runbook: retornar ao commit anterior aprovado e, se necessário, desligar a nova capacidade por flag.

## Conclusão

A plataforma agora está preparada para criar contas de titulares, preparar portfólios pelo titular ou por administração autorizada, revisar e moderar mídia, gerar páginas individuais por slug e produzir links privados de telefone/WhatsApp sem expor contato bruto. Ela está pronta para um rollout controlado do fluxo de portfólios; não está autorizada a abrir automaticamente a vitrine indexável nem a representar verificação, contato seguro, pagamento ou conteúdo adulto como capacidades operacionais sem os providers e aprovações correspondentes.
