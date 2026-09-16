# Correções de segurança — 16/09/2026

Base: ZIP somodels-main (2).zip, commit indicado no arquivo 7d61f9c8cdc6cf8e5c8cf2a22ce74da2d43ed14a.

## Alterações

- Autenticação OAuth recusa contas suspensas; procedimentos autenticados também exigem conta ativa.
- Procedimentos protegidos e administrativos exigem troca de senha quando mustChangePassword está ativo. A própria troca continua acessível à conta ativa.
- Elevação administrativa pela lista ADMIN_EMAILS exige emailVerifiedAt, além de conta ativa e senha já trocada. Papéis administrativos explícitos são preservados.
- Bootstrap não reativa, promove, renomeia nem redefine senha de conta existente. Uma conta já existente com e-mail de bootstrap não recebe acesso administrativo automaticamente.
- Novas contas locais não recebem confirmação fictícia de e-mail. Marcas antigas de verificação não foram alteradas: precisam de revisão dos dados reais.
- Upload verifica conta ativa, troca de senha e, quando exigida, identidade aprovada antes de escrever no armazenamento. O parser HTTP ainda recebe o corpo antes dessas verificações; limites de tráfego e upload precisam de revisão adicional.
- Proxy de mídias exige perfil aprovado e publicado, titular ativo e exclusão de dados de teste conforme configuração. URLs assinadas já emitidas podem funcionar até expirar no armazenamento; este patch não revoga esses links.
- Consultas públicas também ocultam perfis cujos titulares estão suspensos.
- Cadastro de teste recusa conta já existente também na função de criação, evitando reutilização de conta em corrida entre requisições.
- Consultas públicas excluem tanto isTest quanto isDemo quando dados fictícios estão desativados.
- Limitador de login utiliza req.ip, respeitando a resolução de proxy do Express, em lugar de ler diretamente o primeiro X-Forwarded-For. A política de proxy e o limitador distribuído continuam pendentes de validação na infraestrutura.

## Limites da entrega

Esta é uma atualização de segurança, não uma liberação para produção. Não inclui cadastro real por convite, confirmação de e-mail completa, integração real de idade/identidade, pagamentos ou videochamadas. Não altera schema, migrations, dependências ou dados de produção. Não exclui contas de teste. Nenhum deploy foi executado.

Antes de tratar dados reais, continuam necessários: integração e validação dos provedores de identidade/idade, recuperação de acesso, revisão dos e-mails previamente marcados como verificados, inventário de contas de teste, backup e restauração comprovados, validação jurídica e de privacidade, testes com banco e armazenamento reais em ambiente separado.

## Compatibilidade operacional

Contas suspensas e contas com troca obrigatória passam a ser efetivamente bloqueadas. O bootstrap deixa de recuperar/resetar contas já existentes. Essas mudanças são intencionais. Novas contas criadas pelo bootstrap mantêm seus papéis explícitos, mas não passam a ter e-mail verificado sem comprovação. Nenhuma integração de verificação foi simulada.

## Validação

TypeScript: aprovado. Testes: 18 aprovados em 7 arquivos (10 testes novos). Build: aprovado, com aviso de tamanho de bundle acima de 500 kB. Logs em VALIDATION-2026-09-16.txt. Não foram executados testes com banco real, armazenamento real, Docker ou servidor de produção.
