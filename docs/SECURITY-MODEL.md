# Modelo de segurança

## Princípios

1. Backend é a autoridade de autenticação/autorização.
2. Público recebe somente dados necessários à vitrine.
3. Contato bruto não integra payload público.
4. Age gate, KYC, termos e estado editorial são gates independentes.
5. Mídia usa proxy/storage protegido; storage keys não são contrato público.
6. Ações sensíveis geram audit log.
7. Flags novas começam desligadas.

## Contato protegido

`profiles.list` e `profiles.bySlug` removem telefone, WhatsApp, Telegram e `contactOptions`. Quando permitido, o frontend recebe apenas os **tipos** de canais disponíveis. O href real é produzido somente por `safety.contactIntent`, que exige sessão autenticada, age gate válido, configuração de contato ativa, ausência de bloqueio e aceite atual do titular.

## Favoritos e bloqueios

Mutations são `protectedProcedure`; o backend valida que o alvo é perfil público elegível e rejeita ação contra perfil próprio. Bloquear remove favorito existente e o contato verifica block nos dois sentidos.

## Denúncias

A UI do alvo nunca recebe identidade do denunciante. A fila administrativa é `adminProcedure`; justificativas de decisão são armazenadas em audit log. Dados altamente sensíveis/evidência documental não devem ser colocados no campo textual da denúncia.

## Dados que não devem ser expostos

CPF, documentos, biometria, endereço residencial/localização precisa, hashes/segredos, tokens de sessão/reset, API keys, storage key privada, payload bruto de provider e contato sem autorização.
