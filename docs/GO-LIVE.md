# Entrada no ar — receber cadastros e exibir anúncios

Use a aba **Admin → Prontidão**: ela lista o que ainda bloqueia. Este roteiro é a mesma lista em ordem.

## Antes do deploy
1. Faça backup do banco (ver `docs/BACKUP-RESTORE.md`).
2. Publique o pacote. As migrations 0007 e 0008 rodam sozinhas na subida do container.
3. Confira `/healthz` nos três hosts: `ok: true`, `database: true` e `release` com o commit novo.

## Roteiro de hoje (cerca de 40 minutos)
1. Backup do banco (5 min).
2. Subir o pacote no GitHub e esperar o deploy do Coolify (5 a 10 min). Se o healthcheck falhar, o Coolify mantém a versão antiga no ar.
3. Rodar `node scripts/smoke-prod.mjs https://eromodels.com.br` e conferir `/healthz` (5 min). A falha de "vitrine aberta" é esperada até o passo 4.
4. Ajustar as variáveis abaixo no Coolify e reiniciar (10 min).
5. Entrar no admin, ativar o autenticador, criar os planos e abrir Admin → Prontidão: deve estar sem itens vermelhos (10 min).
6. Rodar o smoke de novo: tudo OK. Divulgar.

Se algo sair errado: Coolify → Deployments → Redeploy da versão anterior. As migrations só adicionam colunas e tabelas, então a versão antiga continua funcionando com o banco novo.

## Armazenamento de fotos e vídeos (obrigatório)
Sem isto o envio de mídia falha com "Não foi possível armazenar a mídia".

Opção A — disco do servidor (padrão, sem custo):
1. Coolify → seu aplicativo → Storages → Add → Volume Mount.
2. Destino (Destination Path): `/app/storage`. Salve e faça um novo deploy.
3. Admin → Prontidão: "Volume persistente das mídias" deve ficar verde. Se estiver vermelho, o volume não foi montado e os arquivos somem a cada deploy.
4. Inclua esse volume nos backups (veja `docs/BACKUP-RESTORE.md`).
5. Se o erro continuar, veja os logs do aplicativo no Coolify: a linha `[Upload] failed` mostra o motivo (por exemplo, permissão de escrita no volume).

Opção B — S3, Cloudflare R2 ou DigitalOcean Spaces (recomendado para crescer): defina `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` e, para R2/Spaces, `S3_ENDPOINT` e `S3_REGION`. O bucket deve ser privado: o site entrega os arquivos por links temporários, só para quem passou pela confirmação de idade e só de anúncios aprovados.

## Variáveis no Coolify
- Obrigatórias para abrir: `PUBLIC_ACCESS_ENABLED`, `PUBLIC_LAUNCH_ENABLED`, `ROBOTS_NOINDEX=false`, `TEST_MODE=false`, `ALLOW_FAKE_DATA=false`.
- Opcionais (podem ficar para depois): `CONTACT_EMAIL`, `PRIVACY_EMAIL`, `OPERATOR_NAME`, `OPERATOR_DOCUMENT`. Sem elas, o canal de contato é o formulário Fale conosco; as mensagens chegam em Admin → Mensagens. Olhe essa aba todos os dias (pedidos de recuperação de senha e de remoção chegam por lá).
- `PUBLIC_ACCESS_ENABLED=true` e `PUBLIC_LAUNCH_ENABLED=true`
- `ROBOTS_NOINDEX=false`, `TEST_MODE=false`, `ALLOW_FAKE_DATA=false`
- `REPORTS_ENABLED=true`, `FAVORITES_ENABLED=true`, `BLOCKING_ENABLED=true`, `SECURE_CONTACT_ENABLED=true` (já são o padrão)
- `ADULT_MARKETPLACE_ENABLED=true`, `ESCORT_LISTINGS_ENABLED=true` (sem elas ninguém consegue publicar)
- `REQUIRE_IDENTITY_VERIFICATION=false` (padrão: identidade só dá o selo)
- `SPONSORED_LISTINGS_ENABLED=true` só depois de criar planos com destaque
- `ADMIN_MFA_REQUIRED=true` só depois que cada admin ativar o autenticador

## Primeiro dia
1. Entre no admin e ative a verificação em duas etapas (aba Segurança).
2. Crie os planos em Admin → Planos (um gratuito e ao menos um com destaque).
3. Cadastre ou convide os primeiros anunciantes. Eles publicam sozinhos; você acompanha em Admin → Anúncios e Denúncias e oculta ou suspende o que descumprir as regras.
4. Quando houver perfis publicados, eles aparecem na página inicial, nos filtros, nas cidades e no sitemap.

## Plano pago por Pix (manual)
1. O titular pede o plano em `/planos` ou no painel.
2. Combine o Pix fora da plataforma.
3. Confirmado o pagamento, ative em Admin → Planos → Assinaturas. O sistema lança a receita e registra quem ativou.
4. O destaque vale até o fim do período; não há cobrança automática.

## Funções da equipe

Em Admin → Usuários → Administradores, o Super administrador ou o desenvolvedor escolhe a função de cada pessoa: Acesso completo, Moderador, Suporte, Financeiro ou Auditoria. Quem já era administrador continua com acesso completo até alguém mudar. Para a operação inicial, sugestão: você com acesso completo, e uma pessoa de Moderador e outra de Suporte quando houver equipe.

## Moderação
- Fila de denúncias: casos de menor de idade, exploração ou coerção são urgentes, atender no mesmo dia.
- Demais denúncias: responder em até 72 horas.
- Defina o responsável por turno e registre as decisões no admin.

## Monitoramento
Crie um monitor externo (UptimeRobot ou similar) em `https://eromodels.com.br/healthz` a cada 5 minutos, com alerta por e-mail ou celular.

## Ainda desligado por decisão
Cobrança automática (Pix com provedor), verificação por documento, envio de e-mails e dados da empresa/encarregado (DPO) na política de privacidade.
