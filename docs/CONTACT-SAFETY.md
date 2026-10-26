# Segurança de contato

## Estado atual

Contato externo é uma saída controlada, não mensageria interna. A plataforma não afirma controlar a conversa depois da saída.

Com `SECURE_CONTACT_ENABLED=true` (padrão), `safety.contactIntent` funciona para qualquer visitante, com ou sem conta, e exige:
- perfil publicado/aprovado/revisado;
- age session válida;
- `showContact` habilitado;
- ausência de bloqueio entre as partes (só quando há conta logada);
- limite de cliques por IP ou por usuário;
- aceite de publicação/termos atual do titular;
- método realmente configurado no perfil.

O evento `contact.external_exit` é gravado na auditoria com o método, sem copiar o número para o log.

## Privacidade

Listagens e perfil público removem telefone, WhatsApp e Telegram. O cliente recebe apenas a lista de métodos disponíveis para decidir quais botões pode apresentar.

## Limitações deliberadas

Relay interno, alias telefônico/e-mail e detecção avançada de spam exigem provider/infra e ficam para quando o volume crescer. Hoje a proteção é: confirmação de idade, limite por IP/usuário, número entregue só no clique e registro de auditoria. Para fechar o contato em uma emergência, desligue `SECURE_CONTACT_ENABLED` ou o campo `showContact` em Admin → Página inicial.
