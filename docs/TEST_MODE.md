# Modo de testes e verificação de idade

> **Aviso:** este documento é um guia técnico-operacional, não substitui análise jurídica ou de proteção de dados. Antes de operar publicamente, valide o fluxo com profissional qualificado e com o provedor escolhido.

## O que é possível fazer sem custo agora

Para validar telas, cadastros, perfis, moderação e permissões, não é necessário coletar documento de ninguém. O sistema possui um modo de teste explícito, controlado por duas variáveis: `TEST_MODE=true` e `TEST_ACCESS_ENABLED=true`. Com `PUBLIC_ACCESS_ENABLED=true`, a vitrine fica aberta somente para o cenário de teste, o status de idade é tratado como aprovado para fins de QA e aparece a rota `/cadastro-teste`.

Use apenas dados sintéticos: nomes como `Pessoa Teste`, e-mails de domínio `.invalid` ou contas de teste controladas, imagens sem pessoas reais e descrições fictícias. O modo de teste não constitui prova de idade, identidade, consentimento ou elegibilidade para uso público.

## Passo a passo no Coolify

1. Abra o aplicativo `somodels-app` no ambiente de testes e entre em **Environment Variables**.
2. Adicione ou altere `PUBLIC_ACCESS_ENABLED` para `true`.
3. Adicione ou altere `TEST_MODE` para `true`.
4. Adicione ou altere `TEST_ACCESS_ENABLED` para `true`.
5. Mantenha `PAYMENTS_ENABLED=false`. Para permitir que perfis de teste sejam enviados sem KYC real, use `KYC_REQUIRED=false` somente neste ambiente isolado.
6. Salve as variáveis e faça um redeploy controlado.
7. Abra `/cadastro-teste`, crie uma conta com dados fictícios e uma senha com pelo menos 16 caracteres, contendo maiúsculas, minúsculas e números.
8. Acesse `/titular`, crie um perfil fictício e salve como rascunho. Com `KYC_REQUIRED=false`, também será possível enviá-lo para a fila de revisão.
9. Entre no `/admin` com uma conta administrativa, aprove ou rejeite o perfil e valide os estados de moderação.
10. Verifique a home, filtros, página de perfil, upload de mídia de teste e logs, sem enviar documentos ou material real.

## Sobre verificação por documento

Não existe uma verificação documental automatizada, confiável e universalmente gratuita. O custo pode ser zero em um ambiente de sandbox ou em um processo manual interno, mas a responsabilidade de conferir autenticidade, minimizar dados, proteger o arquivo, definir retenção, controlar acesso, registrar auditoria e atender às obrigações aplicáveis continua existindo.

O anexo direto de documento não deve ser tratado como aprovação automática. Se for adotado futuramente, o fluxo recomendado é: encaminhar o usuário para um provedor especializado com ambiente de testes; receber apenas o resultado verificado e um identificador mínimo; evitar manter cópia do documento na aplicação; registrar consentimento, finalidade, prazo de retenção e trilha de auditoria; e bloquear a publicação até o webhook assinado do provedor confirmar o resultado.

Para um teste sem custo, a alternativa segura é testar a integração do provedor em sandbox usando documentos de demonstração fornecidos pelo próprio provedor. Não use RG, CNH, passaporte, selfie ou qualquer documento real de clientes em ambiente público de testes.

## Como fechar novamente antes da produção

1. Defina `TEST_MODE=false`.
2. Defina `TEST_ACCESS_ENABLED=false`.
3. Defina `PUBLIC_ACCESS_ENABLED=false` até existir um provedor real de idade configurado e validado.
4. Restaure `KYC_REQUIRED=true` e mantenha `PAYMENTS_ENABLED=false` até concluir a homologação dos provedores.
5. Remova as contas e perfis de teste, ou marque-os para expurgo conforme a política de retenção.
6. Faça redeploy e confirme que `/cadastro-teste` informa que está indisponível e que a vitrine volta a exibir `Vitrine protegida`.
7. Só depois configure `AGE_VERIFICATION_PROVIDER`, `AGE_VERIFICATION_API_KEY` e `AGE_VERIFICATION_WEBHOOK_SECRET` com valores reais no gerenciador de segredos. Nunca grave esses valores no Git.
