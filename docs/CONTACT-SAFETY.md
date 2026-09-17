# Segurança de contato

## Estado atual

Contato externo é uma saída controlada, não mensageria interna. A plataforma não afirma controlar a conversa depois da saída.

Quando `SECURE_CONTACT_ENABLED=true`, `safety.contactIntent` exige:

- usuário autenticado;
- perfil publicado/aprovado/revisado;
- age session válida;
- `showContact` habilitado;
- ausência de bloqueio entre as partes;
- aceite de publicação/termos atual do titular;
- método realmente configurado no perfil.

O evento `contact.external_exit` é gravado na auditoria com o método, sem copiar o número para o log.

## Privacidade

Listagens e perfil público removem telefone, WhatsApp e Telegram. O cliente recebe apenas a lista de métodos disponíveis para decidir quais botões pode apresentar.

## Limitações deliberadas

Relay interno, alias telefônico/e-mail, detecção avançada de spam e rate limit específico de contato exigem provider/infra e devem ser implementados antes de uma ativação de alto volume. Até lá, manter `SECURE_CONTACT_ENABLED=false` em produção pública.
