# Direção visual inspirada em OKC

Fonte principal: https://okc.media/en/ (consultada em 29/08/2026).

A referência apresenta uma direção editorial de alto contraste, com fundo grafite quase preto, tipografia clara e ampla área negativa. A composição combina navegação mínima no topo, chamadas curtas e uma grade de projetos com imagens grandes, cantos arredondados e bastante respiro. O movimento e a hierarquia visual parecem priorizar transições suaves, rolagem narrativa e interação por hover, sem excesso de elementos decorativos.

## Padrões observados

| Elemento | Padrão a reinterpretar no Só Models |
|---|---|
| Fundo | Grafite profundo, evitando preto absoluto para manter textura e conforto visual. |
| Contraste | Texto branco/off-white em grandes títulos; cinzas claros para metadados; cor de destaque usada de forma pontual. |
| Acento | Gradientes quentes entre vermelho, coral, rosa e laranja em blocos visuais selecionados, contrastando com o fundo frio. |
| Tipografia | Sans-serif contemporânea, com títulos grandes, leves e espaçados; navegação compacta e discreta. A família exata ainda será confirmada nos arquivos CSS carregados pelo site. |
| Imagens | Imagens tratadas como peças editoriais de grande escala, com crop controlado, cantos arredondados e forte presença visual. |
| Layout | Grade assimétrica de cards/projetos, ritmo vertical longo, margens generosas e leitura por blocos. |
| Interação | Hover, transições de opacidade/escala e movimento suave; evitar efeitos que prejudiquem acessibilidade ou legibilidade. |
| Conteúdo | Seções com frases curtas, rótulos pequenos, categorias e chamadas contextuais. |
| Rodapé | Encerramento editorial com chamada, contatos e links organizados, sem aparência de painel administrativo. |

## Adaptação para o produto

A aplicação será reinterpretada, não clonada: a vitrine pública usará fundo grafite, cards de modelos com imagens grandes, chips de cidade/estilo em baixo contraste, CTAs em coral/vermelho e microinterações suaves. O bloqueio de idade e a postura fail-closed continuarão visíveis e acessíveis. O painel administrativo manterá densidade funcional maior, mas compartilhará tokens de cor, tipografia, bordas, estados e foco.

A identidade visual não será usada para ocultar a proteção de idade, a moderação ou o status de disponibilidade. Recursos de provedor externo que ainda não estejam configurados continuarão desabilitados de forma explícita.

## Metadados confirmados no navegador

A inspeção computada do site confirmou a família `Involve, sans-serif` no corpo, títulos e links. O corpo usa 16px, peso 400 e cor `rgb(254, 254, 254)` sobre fundo `rgb(34, 34, 34)`; o `h1` observado usa 18px e peso 500; o `h2` usa 24px e peso 700; links usam branco puro. O site carrega folhas específicas para intro, navegação, blob, cursor, grid, reveal, hero, cases, expertise, awards, footer e cookie consent, confirmando uma composição modular com camadas de interação e revelação. A implementação do Só Models usará a mesma intenção editorial, mas substituirá dependências proprietárias por fontes e componentes licenciados/disponíveis no próprio projeto quando necessário.
