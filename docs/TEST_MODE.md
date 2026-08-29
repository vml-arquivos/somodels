# Modo de homologação e dados demonstrativos

> **Aviso:** este documento descreve um ambiente técnico de testes. Ele não constitui validação de idade, identidade, consentimento ou elegibilidade, nem substitui orientação jurídica e de proteção de dados.

## Objetivo e limites

O modo de homologação existe para validar telas, cadastro local, rascunhos, upload, moderação, filtros e permissões usando somente **contas, perfis, contatos e imagens sintéticos**. Não envie RG, CNH, passaporte, selfie, biometria, endereço, telefone real, webhook, e-mail de cliente ou pagamento. A imagem demonstrativa publicada em `client/public/demo/` representa uma pessoa fictícia e não deve ser associada a terceiros.

> **Importante:** `REQUIRE_AGE_VERIFICATION=false` e `REQUIRE_IDENTITY_VERIFICATION=false` apenas liberam o QA isolado. Não são uma verificação real e não podem ser usados para lançar o marketplace.

## Contrato de flags

Use o conjunto abaixo em um ambiente isolado. As flags legadas `TEST_MODE`, `TEST_ACCESS_ENABLED` e `PUBLIC_ACCESS_ENABLED` permanecem ativadas para compatibilidade com o fluxo existente.

| Variável | Homologação | Função |
|---|---:|---|
| `APP_MODE` | `test` | Seleciona o modo de homologação |
| `PUBLIC_ACCESS_ENABLED` | `true` | Permite a vitrine pública do QA |
| `PUBLIC_LAUNCH_ENABLED` | `false` | Mantém o lançamento formal fechado |
| `TEST_MODE` | `true` | Ativa regras de teste |
| `TEST_ACCESS_ENABLED` | `true` | Autoriza o acesso público de teste |
| `ALLOW_TEST_SIGNUP` | `true` | Libera `/cadastro-teste` |
| `ALLOW_FAKE_DATA` | `true` | Permite somente dados marcados como demo/teste na vitrine |
| `ALLOW_DEMO_SEED` | `true` | Autoriza o comando explícito de seed |
| `REQUIRE_AGE_VERIFICATION` | `false` | Não simula uma prova documental; somente desbloqueia o QA |
| `REQUIRE_IDENTITY_VERIFICATION` | `false` | Mantém KYC real desligado no QA |
| `PAYMENTS_ENABLED` | `false` | Mantém pagamentos desligados |
| `DEMO_CONTACTS_ENABLED` | `false` | Impede chamadas e mensagens reais |
| `ROBOTS_NOINDEX` | `true` | Retorna `Disallow: /` e sitemap vazio |
| `ADMIN_EMAILS` | e-mail autorizado | Permite o painel apenas ao developer autorizado |

Não grave senhas ou chaves no Git. Os valores de `BOOTSTRAP_SUPER_ADMIN_PASSWORD` e `BOOTSTRAP_DEV_PASSWORD` devem existir somente no gerenciador de segredos, ser temporários e ser rotacionados imediatamente em `/alterar-senha`.

## Procedimento no Coolify

Abra o aplicativo correto do domínio `somodels.buscarr.com.br`, confira que ele aponta para `vml-arquivos/somodels` e para o MySQL privado já configurado. Em **Environment Variables**, adicione ou altere as flags da tabela acima, preenchendo `ADMIN_EMAILS` com o e-mail developer autorizado sem publicá-lo em logs. Preserve `DATABASE_URL`, `JWT_SECRET`, storage e o bootstrap administrativo existentes; não reconecte ao PostgreSQL legado.

Salve as variáveis e faça um redeploy controlado. Confirme `GET /healthz` com status `200`, `database:true`, e confira que `GET /robots.txt` contém `Disallow: /`. A migração deve ser executada pelo procedimento Drizzle aprovado, sem `DROP`, antes do seed.

Depois da migration, execute o seed de forma explícita no container ou job controlado:

```bash
pnpm db:seed-demo
```

O comando falha se `APP_MODE`, `ALLOW_FAKE_DATA` ou `ALLOW_DEMO_SEED` não estiverem habilitados. Ele cria ou atualiza **15 perfis fictícios estáveis**, marca todos com `isTest=true` e `isDemo=true`, não apaga linhas e distribui os estados `approved`, `draft`, `pending`, `rejected` e `suspended`. Execute-o duas vezes e confirme que os mesmos slugs e IDs lógicos não geram duplicatas.

## Fluxo de QA

Acesse `/cadastro-teste` e crie uma conta com nome e e-mail sintéticos, usando uma senha de pelo menos 16 caracteres com maiúsculas, minúsculas e números. O cadastro cria uma sessão local com papel `user`; ele nunca concede acesso administrativo. Em `/titular`, crie um rascunho com dados fictícios, atualize a página, saia e entre novamente, depois valide o preview, a galeria demonstrativa e o envio para moderação.

No `/admin`, use somente a conta developer/super admin autorizada. Valide as abas de usuários, perfis e moderação; aprove um perfil pendente, rejeite outro informando motivo, suspenda e reative um perfil quando aplicável. A publicação no modo de teste deve aparecer na home sem habilitar lançamento formal. O botão de denúncia permanece informativo até que exista um fluxo de denúncia persistido e moderado; não deve prometer uma ação que ainda não existe.

## Sobre verificação por documento

Não existe uma verificação documental automatizada, confiável e universalmente gratuita. Um anexo manual de documento não comprova autenticidade sozinho e não deve ser tratado como aprovação automática. Para testar sem custo, use somente documentos de demonstração fornecidos por um provedor em sandbox, sem enviar documentos reais para esta aplicação. Antes de qualquer produção, será necessário contratar/configurar um provedor especializado, receber um resultado mínimo por webhook assinado, definir retenção, controle de acesso, consentimento, auditoria e bloqueio de publicação.

## Fechamento antes de qualquer lançamento

Defina `APP_MODE=production`, `TEST_MODE=false`, `TEST_ACCESS_ENABLED=false`, `ALLOW_TEST_SIGNUP=false`, `ALLOW_FAKE_DATA=false`, `ALLOW_DEMO_SEED=false`, `PUBLIC_ACCESS_ENABLED=false` até os provedores reais estarem configurados, `REQUIRE_AGE_VERIFICATION=true`, `REQUIRE_IDENTITY_VERIFICATION=true`, `DEMO_CONTACTS_ENABLED=false`, `ROBOTS_NOINDEX` conforme a política de lançamento e `PAYMENTS_ENABLED=false` até concluir a elegibilidade formal. Faça redeploy, confirme que `/cadastro-teste` está bloqueado, que perfis demo não aparecem publicamente e que `/healthz` segue saudável. A remoção posterior deve ser feita por procedimento de retenção aprovado, nunca por `TRUNCATE` ou exclusão ampla.
