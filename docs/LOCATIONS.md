# Localização estruturada

O formulário do titular usa uma sequência de seleção **Estado → cidade/município → bairro ou região aproximada**. O endereço completo não é solicitado nem publicado.

## Fonte atual

As 27 listas de municípios ficam em `shared/locations/`, carregadas sob demanda por UF. Elas foram geradas a partir do snapshot público versionado de [letanure/3012978](https://gist.github.com/letanure/3012978), associado aos dados municipais do IBGE e atualizado em 2020.

Esse catálogo é um fallback versionado. Ele **não** é uma resposta em tempo real da API do IBGE e pode estar defasado diante de mudanças posteriores de município ou nomenclatura. A API oficial não estava acessível no ambiente de geração desta alteração.

Para o Distrito Federal, o campo subsequente apresenta regiões administrativas selecionáveis, incluindo Brasília, Recanto das Emas, Riacho Fundo I e Samambaia. Para as demais UFs, o produto trabalha com regiões aproximadas padronizadas, como Centro e Zona Sul, até que exista uma fonte municipal de bairros validada para todo o país.

## Validação e atualização

O frontend carrega a lista da UF escolhida; o servidor volta a validar a combinação de estado, cidade e região antes da publicação. Isso impede que uma chamada direta à API publique valores fora do catálogo.

A migration não altera em massa anúncios já aprovados. Um perfil aprovado sem `neighborhood` antes dessa alteração continua elegível durante uma edição, reativação ou moderação de mídia, até que o titular escolha uma região estruturada. Rascunhos e novos anúncios não recebem essa compatibilidade.

Quando houver uma exportação oficial mais recente, a manutenção deve:

1. salvar a origem, data de referência e licença da exportação;
2. gerar novamente os chunks por UF, preservando acentuação e ordenação;
3. revisar explicitamente a lista de regiões administrativas do DF;
4. executar `pnpm check`, `pnpm test` e `pnpm build`;
5. publicar a atualização em PR revisável, sem alterar perfis existentes em massa.
