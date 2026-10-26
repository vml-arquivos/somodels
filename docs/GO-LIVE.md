# Entrada no ar — receber cadastros e exibir anúncios

Use a aba **Admin → Prontidão**: ela lista o que ainda bloqueia. Este roteiro é a mesma lista em ordem.

## Antes do deploy
1. Faça backup do banco (ver `docs/BACKUP-RESTORE.md`).
2. Publique o pacote. As migrations 0007 e 0008 rodam sozinhas na subida do container.
3. Confira `/healthz` nos três hosts: `ok: true`, `database: true` e `release` com o commit novo.

## Variáveis no Coolify
- `PUBLIC_ACCESS_ENABLED=true` e `PUBLIC_LAUNCH_ENABLED=true`
- `ROBOTS_NOINDEX=false`, `TEST_MODE=false`, `ALLOW_FAKE_DATA=false`
- `REPORTS_ENABLED=true`, `FAVORITES_ENABLED=true`, `BLOCKING_ENABLED=true`
- `SPONSORED_LISTINGS_ENABLED=true` só depois de criar planos com destaque
- `ADMIN_MFA_REQUIRED=true` só depois que cada admin ativar o autenticador

## Primeiro dia
1. Entre no admin e ative a verificação em duas etapas (aba Segurança).
2. Crie os planos em Admin → Planos (um gratuito e ao menos um com destaque).
3. Cadastre ou convide os primeiros anunciantes e aprove os perfis na fila.
4. Quando houver perfis aprovados e publicados, eles aparecem na página inicial, nos filtros, nas cidades e no sitemap.

## Plano pago por Pix (manual)
1. O titular pede o plano em `/planos` ou no painel.
2. Combine o Pix fora da plataforma.
3. Confirmado o pagamento, ative em Admin → Planos → Assinaturas. O sistema lança a receita e registra quem ativou.
4. O destaque vale até o fim do período; não há cobrança automática.

## Moderação
- Fila de denúncias: casos de menor de idade, exploração ou coerção são urgentes, atender no mesmo dia.
- Demais denúncias: responder em até 72 horas.
- Defina o responsável por turno e registre as decisões no admin.

## Monitoramento
Crie um monitor externo (UptimeRobot ou similar) em `https://eromodels.com.br/healthz` a cada 5 minutos, com alerta por e-mail ou celular.

## Ainda desligado por decisão
Cobrança automática (Pix com provedor), verificação por documento, envio de e-mails e dados da empresa/encarregado (DPO) na política de privacidade.
