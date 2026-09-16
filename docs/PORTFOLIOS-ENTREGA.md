# Entrega — portfólios profissionais

## Escopo

Adaptação autorizada para portfólios profissionais de modelos e criadores, sem oferta de serviços sexuais. Os titulares preenchem seus próprios conteúdos. Nenhuma conta, perfil, foto, vídeo ou lançamento financeiro foi criado no banco nesta tarefa. Nenhum servidor de produção foi acessado ou alterado. O seed demonstrativo foi desativado; o cadastro de homologação existente continua restrito às flags de teste.

## Funcionalidades entregues

- Página inicial nova, sem pessoas ou portfólios de exemplo: título, descrição, botão, seção sobre e rodapé editáveis.
- Controle de visibilidade da vitrine e dos contatos, aplicado também às APIs públicas; não apenas ao HTML.
- Páginas individuais com nome/título, descrição, cidade/região, categorias profissionais, especialidades, idiomas, fotos e vídeos.
- Área do titular para criar/editar rascunhos e enviar para revisão, upload de imagens/vídeos, capa com foto aprovada e ocultação de mídia.
- Links profissionais de WhatsApp e ligação gerados a partir de telefones validados (DDI explícito ou número brasileiro com DDD). Dados demo/teste não recebem contato público.
- Temas claro/escuro nas páginas ativas, com preferência local persistida.
- Painel de usuários com busca, filtros, paginação, ficha, criação administrativa de contas, edição, suspensão e hierarquia de permissões. Senha inicial obrigatoriamente temporária.
- DEV pode administrar contas não DEV; super administrador gerencia usuários e administradores; administrador gerencia titulares. Alterar a própria conta por esse fluxo é bloqueado. Senhas existentes e hashes nunca são retornados nas fichas.
- Links de redefinição com 30 minutos de validade e uso único, tokens armazenados somente por hash. A redefinição encerra sessões locais e invalida links anteriores. O link usa fragmento de URL para não ir no pedido HTTP inicial. O operador copia e compartilha o link com o titular: não há envio automático por e-mail nesta versão. A integração OAuth preexistente tem sessões próprias; a revogação local não equivale à revogação de tokens no provedor OAuth.
- Anonimização administrativa de conta comum: retira nome/e-mail/login, invalida acesso, suspende os perfis e retira contatos. Arquivos, conteúdo dos perfis e auditoria são preservados; não é uma exclusão integral de dados pessoais nem substitui um processo de atendimento à LGPD.
- Dashboard de contas, status, perfis, cidades e áreas de atuação. Dados vêm do banco; não há números fictícios. Contagens incluem registros antigos/de teste e isso é informado no painel.
- Ficha administrativa dos portfólios, edição das informações, visualização autenticada de mídias, revisão e suspensão.
- Aprovação de portfólio exige categorias profissionais válidas, confirmação explícita da revisão e controles de identidade/publicação existentes. Registros antigos têm portfolioReviewed=false por padrão e não são republicados automaticamente.
- Controle financeiro interno: receitas e despesas manuais em reais, totais, saldo e anulação com histórico. Não é gateway, cobrança, assinatura, processamento de pagamentos ou contabilidade fiscal. Lista exibe últimos 100 lançamentos; totais consideram todos os lançamentos válidos.
- Auditoria administrativa paginada. Lista de portfólios administrativos exibe os últimos 200 registros, informada na tela.

## Migração obrigatória antes de subir a aplicação

1. Faça backup consistente do MySQL e confirme o procedimento de restauração.
2. Em homologação, instale com `corepack pnpm install --frozen-lockfile` e valide a migration `drizzle/0005_portfolio_management.sql`.
3. Com DATABASE_URL apontando ao banco correto, execute `pnpm db:migrate` no ambiente de deploy. Esse comando aplica as migrations versionadas; não gera SQL novo. Não use `db:push` em produção.
4. A migration cria `site_settings` e `finance_entries` vazias e adiciona `profiles.portfolioReviewed` com default false. Não insere registros de exemplo nem remove dados existentes.
5. Publique a aplicação somente após aplicar a migration. O Dockerfile NÃO aplica migrations automaticamente. O healthcheck geral existente não substitui a conferência das tabelas novas.
6. Confirme login, troca obrigatória de senha, acessos por papel, configuração da página inicial, salvamento de rascunho, revisão, upload e abertura das mídias, incluindo bloqueio público de perfis ocultos.

A reversão da aplicação deve ser planejada: a versão anterior não conhece o campo de revisão de portfólios. Em rollback, mantenha a vitrine pública fechada para evitar republicar conteúdo legado. As duas tabelas novas podem ser preservadas; não exclua lançamentos/configurações para fazer rollback.

## Dependências e limites operacionais

- MySQL/TiDB compatível com o schema atual; não há migração para PostgreSQL.
- CANONICAL_ORIGIN deve ser a origem HTTPS real para os links de senha.
- O armazenamento de arquivos continua dependendo da integração Forge/S3 já usada pelo projeto. Sem essas credenciais, upload e preview não funcionam. Nada foi simulado.
- Verificação de identidade/idade e abertura pública continuam respeitando as flags/provedores existentes. Esta entrega não implementa um provedor real de KYC/idade nem confirmação de e-mail. Não desative verificações apenas para contornar a falta de integração.
- URLs assinadas já emitidas podem continuar válidas até expirar no armazenamento.
- Os perfis e mídias existentes permanecem no banco. A ocultação por revisão é intencional, necessária para a mudança de escopo do produto.
- Documentação antiga permanece como histórico e não certifica o estado desta entrega. Consulte este documento e VALIDATION-PORTFOLIOS.txt para o escopo atual.

## Validação

Os resultados dos comandos finais estão em VALIDATION-PORTFOLIOS.txt. Testes de transações usam dublês de banco; não são testes de integração real com MySQL. Não foram feitas alterações no banco do usuário.

A inspeção visual por navegador ficou bloqueada: o navegador disponibilizado recusou a prévia local com ERR_BLOCKED_BY_CLIENT. Não houve teste visual completo de desktop/mobile nem teste ponta a ponta com banco, credenciais, storage ou deploy reais. Não há garantia absoluta de ausência de regressões. Faça a validação em homologação antes da produção.
