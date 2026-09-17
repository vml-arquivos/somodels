# Continuação — aceite do titular e paridade administrativa

## Objetivo

Esta alteração conclui a continuidade do módulo de portfólios sem substituir os fluxos já existentes.

- O titular mantém o mesmo editor de dados, fotos e vídeos.
- A administração pode criar um novo portfólio escolhendo um titular existente e usar o mesmo editor.
- A administração pode preparar fotos e vídeos para o titular, com as mesmas validações de tipo e tamanho do upload existente.
- O administrador **não** pode aceitar o termo em nome do titular.
- O titular aceita um termo versionado que declara 18+, direitos/autorização sobre o conteúdo e responsabilidade pelo material enviado/autorizado.
- O aceite é registrado no `audit_logs` existente, incluindo versão, hash, texto integral aceito e digest do conteúdo atual; não foi criada uma segunda fonte de auditoria.
- Mudança relevante nos dados ou inclusão de mídia altera o digest e torna o aceite anterior insuficiente para a próxima aprovação.
- Aprovação de perfil ou mídia é bloqueada quando o aceite não corresponde ao conteúdo atual.
- Se a verificação de identidade estiver habilitada, ela continua sendo exigida na aprovação. A declaração 18+ não substitui verificação real de idade/identidade quando esta for necessária.

## Responsabilidade da plataforma

O termo não promete imunidade absoluta para a plataforma. Ele atribui ao titular a responsabilidade pelo conteúdo que envia/autoriza, preserva a moderação e deixa expresso que obrigações legais inderrogáveis da plataforma continuam aplicáveis.

## Banco de dados

Nenhuma nova tabela ou migration é necessária para este incremento. O registro versionado reutiliza `audit_logs`, que já é a fonte de auditoria do sistema. A migration `0005_portfolio_management.sql` da versão anterior continua sendo a migration pendente daquela entrega e deve ser tratada conforme o procedimento já documentado.

## Validação esperada

Execute no HEAD atualizado:

```bash
pnpm check
pnpm test
pnpm build
git diff --check
```

Depois valide manualmente:

1. admin cria titular ou seleciona um titular existente;
2. admin abre `/admin/portfolio/novo`, cria o portfólio e envia foto/vídeo;
3. portfólio não é aprovado enquanto o titular não aceitar o termo;
4. titular entra em `/titular`, revisa o conteúdo e registra o aceite;
5. admin aprova mídia/perfil;
6. titular/admin altera dado ou adiciona nova mídia;
7. aprovação volta a exigir novo aceite do titular;
8. a página pública continua exibindo título, localização, fotos e vídeos aprovados.
