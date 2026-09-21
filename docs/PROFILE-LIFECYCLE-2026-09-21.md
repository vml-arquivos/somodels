# Ciclo de vida administrativo de perfis — Ero Models

## Objetivo

A área administrativa agora separa o **estado operacional** do perfil do seu **estado editorial**. Ativo/inativo controla se o registro pode participar da operação e da publicação; rascunho, pendente, aprovado, ajustes solicitados e suspenso continuam representando revisão e moderação. Essa separação evita que uma ação operacional seja confundida com aprovação de conteúdo.

## Operações disponíveis

| Operação | Efeito | Reversibilidade |
| --- | --- | --- |
| Editar | Atualiza dados profissionais de um perfil não excluído e reinicia a necessidade de revisão/publicação conforme as regras existentes. | Sim |
| Ativar | Reabilita o perfil operacionalmente. Se o perfil aprovado ainda cumprir todos os gates, a publicação pode ser recalculada; caso contrário, permanece oculto com os bloqueadores registrados. | Sim |
| Inativar | Remove imediatamente o perfil da publicação, impede novos uploads e preserva o conteúdo para revisão administrativa. Exige justificativa. | Sim |
| Excluir | Faz exclusão lógica, marca o registro como excluído, remove publicação e uploads novos, e preserva mídia, auditoria e referências para rastreabilidade. Exige motivo e digitação exata do slug. | Sim, por restauração |
| Restaurar | Remove a marca de exclusão e retorna o perfil a rascunho não publicado, exigindo nova revisão antes de qualquer publicação. Exige justificativa. | Sim |

## Controles de segurança

Todas as mutations usam `adminProcedure`, validam a sessão administrativa no backend e registram o ator, o alvo e a justificativa em `audit_logs`. A exclusão não é um `DELETE` físico: essa escolha preserva denúncias, mídia, auditoria e possibilidade de investigação, evitando perda irreversível de dados por erro operacional. Um perfil excluído não pode ser editado ou moderado até ser restaurado.

As consultas públicas exigem simultaneamente perfil aprovado, publicado, revisado, ativo e sem `deletedAt`. O mesmo gate é aplicado a mídia pública, favoritos, bloqueios, denúncias e intenções de contato. Uploads HTTP e tRPC recusam perfis inativos ou excluídos antes de gravar o arquivo.

## Dados e copy do novo perfil

A tela `/admin/portfolio/novo` começa com formulário vazio depois que o administrador escolhe um titular ativo. O formulário não copia automaticamente dados de outro perfil. Os campos foram reorganizados para refletir a missão da Ero Models: nome profissional, slug público, cidade de atuação, região, localização aproximada sem endereço privado, idiomas, canais de contato, disponibilidade, especialidades e apresentação profissional. A descrição orienta o uso de experiência, estilo, áreas de atuação e tipos de projeto, sem promessas indevidas ou dados não autorizados.

O telefone continua normalizado no backend. Os links `tel:` e `wa.me` são apenas uma prévia privada para o operador; o número bruto não é incluído no payload público e a publicação continua condicionada às flags e gates da plataforma.

## Migration

A alteração de schema é aditiva e está em `drizzle/0006_profile_lifecycle.sql`. Ela adiciona `profiles.isActive`, `profiles.deletedAt` e um índice composto de ciclo de vida. Registros existentes recebem `isActive = true` e `deletedAt = NULL`, portanto não são removidos nem publicados de forma diferente apenas pela migration. O runner de migrations do container aplica o SQL versionado antes de iniciar o servidor.

## Validação

A implementação foi validada com `pnpm check`, 16 arquivos de teste e 78 testes aprovados, `pnpm build`, verificação de bundle e `git diff --check`. A migration e o journal JSON também foram validados localmente. A abertura pública, indexação, contatos externos, KYC, pagamentos e qualquer capability adulta continuam subordinados às flags fail-closed já existentes.
