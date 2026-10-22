# Pesquisa de UX da vitrine e PWA — 2026-10-22

## Padrões funcionais observados

A página pública do Fatal Model organiza a descoberta em torno de uma busca principal por cidade, filtros rápidos de serviços/atributos e listas de cidades populares. A decisão aplicável à Ero Models é funcional: tornar localização o primeiro eixo da busca, oferecer filtros rápidos e manter categorias navegáveis. Não serão copiados marca, textos, imagens, cores, layout ou componentes proprietários.

A implementação da Ero Models deve preservar o modelo próprio de publicação revisada, age gate, privacidade de contato e páginas indexáveis somente quando as flags permitirem. O endereço público deve continuar aceitando consulta por query string para que filtros sejam compartilháveis, rastreáveis e restauráveis no botão voltar.

Fonte consultada: [1].

## PWA

A documentação do web.dev confirma que a instalação depende de HTTPS e de um web app manifest válido. O manifest deve informar nome ou short name, ícones de 192px e 512px, start URL e modo de exibição como standalone. O service worker será usado como aprimoramento progressivo para navegação e fallback, sem cachear respostas privadas ou dados de API.

Fonte consultada: [2].

## Decisões de implementação

- Busca pública com cidade/região, categoria, característica, faixa etária, disponibilidade e ordenação.
- Sugestões de localização baseadas somente em cidades/regiões que possuem publicação pública elegível.
- Filtros rápidos visíveis e filtro avançado agrupado para telas menores.
- CTA de anunciante removido da área hero e mantido em áreas contextuais de titular/cadastro.
- PWA com manifest, ícones, registro de service worker, prompt de instalação e cache apenas do shell público.
- Painéis continuam separados por escopo: cliente, titular e administração.

## Referências

[1]: https://fatalmodel.com/ "Fatal Model — página pública de descoberta e filtros"
[2]: https://web.dev/articles/install-criteria "web.dev — What does it take to be installable?"
