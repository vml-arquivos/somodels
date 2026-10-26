# Mapa de acessos — Ero Models

Este documento registra apenas URLs, papéis e caminhos de entrada. Senhas e tokens não são armazenados no repositório, no ZIP ou no chat.

## Ambientes e dashboards

| Área | URL de entrada | Papel | Escopo |
| --- | --- | --- | --- |
| Vitrine pública | `https://eromodels.com.br/` | visitante autorizado | pesquisar anúncios publicados, cidade, categoria e páginas institucionais |
| Conta do cliente | `https://conta.eromodels.com.br/conta` | conta comum | favoritos, bloqueios, denúncias próprias e preferências |
| Cadastro/login | `https://conta.eromodels.com.br/cadastro` ou `/login` | conta comum ou titular | criar sessão e seguir para o dashboard correspondente |
| Dashboard do titular | `https://conta.eromodels.com.br/titular` | titular | editar anúncio próprio, mídia, disponibilidade, plano e status de revisão |
| Painel DEV/admin | `https://admin.eromodels.com.br/admin` | DEV, super administrador ou administrador | gestão administrativa conforme função e MFA |

## Conta DEV confirmada

- E-mail de entrada: `vilsonmarcio@gmail.com`.
- Login: `https://admin.eromodels.com.br/login?returnTo=%2Fadmin`.
- A senha permanece somente no gerenciador seguro/Coolify e no conhecimento do responsável; não é exibida nem persistida neste documento.
- A recuperação temporária `BOOTSTRAP_DEV_RESET_EXISTING` foi desligada após a validação do login. Não reativar sem uma janela de recuperação autorizada.

## Divisão do painel administrativo

Após o login, o painel usa URLs diretas e menu lateral filtrado pelo escopo efetivo:

- `/admin` — Visão geral.
- `/admin/usuarios` — Usuários e contas.
- `/admin/anuncios` — Anúncios e perfis.
- `/admin/moderacao` — Moderação de anúncios e mídias.
- `/admin/denuncias` — Denúncias.
- `/admin/verificacoes` — Verificações de identidade.
- `/admin/mensagens` — Fale conosco.
- `/admin/planos` — Planos e assinaturas.
- `/admin/financeiro` — Financeiro interno.
- `/admin/pagina-inicial` — Copy e conteúdo configurável da home.
- `/admin/prontidao` — Prontidão operacional.
- `/admin/auditoria` — Histórico administrativo.
- `/admin/seguranca` — MFA e segurança.

Moderador, Suporte, Financeiro e Auditoria veem somente as áreas da sua função. Função desconhecida fica limitada às áreas sem escopo. Se o MFA estiver pendente, o painel redireciona para Segurança e mantém as demais áreas bloqueadas.

## Recuperação segura

Se a senha DEV for esquecida, não enviar a senha por mensagem. Abrir o editor seguro de `BOOTSTRAP_DEV_PASSWORD` no Coolify, definir uma nova senha diretamente no campo protegido e validar no login administrativo. Se a conta já existir e não aceitar a nova senha, seguir o procedimento one-shot documentado em `docs/COOLIFY_ENV.md`; desligar a flag imediatamente após o primeiro login confirmado.
