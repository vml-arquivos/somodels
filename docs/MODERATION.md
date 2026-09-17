# Moderação e denúncias

## Categorias

`minor`, `trafficking_exploitation_coercion`, `fraud`, `threat_extortion`, `impersonation`, `unauthorized_media`, `copyright`, `privacy`, `spam`, `illegal_content`, `abuse`, `other`.

Possível menor e tráfico/exploração/coerção recebem prioridade `urgent`. Ameaça/extorsão, impersonação, mídia sem autorização e conteúdo ilegal recebem prioridade `high`.

## Fluxo implementado

1. Usuário autenticado denuncia um perfil público elegível.
2. O backend rejeita auto-denúncia pela jornada pública e deduplica caso aberto do mesmo usuário/alvo.
3. O caso é gravado em `moderation_cases` com categoria/descrição codificadas em `reason`, prioridade e estado `open`.
4. A criação é auditada.
5. Admin acessa fila sem exposição pública do denunciante e pode assumir, encerrar ou reabrir.
6. Toda mudança de estado é auditada com justificativa administrativa opcional.

## Takedown urgente

A prioridade é um sinal operacional, não substitui procedimento jurídico. Em incidente crítico, o operador deve suspender o perfil/mídia pelos controles de moderação já existentes e preservar somente a evidência necessária conforme política de retenção aprovada.

## Ainda condicionado a processo externo

SLA contratual/regulatório, anexos protegidos, integração de ticketing, recurso completo do denunciante e retenção legal dependem da política operacional/jurídica. Não são simulados como providers prontos.
