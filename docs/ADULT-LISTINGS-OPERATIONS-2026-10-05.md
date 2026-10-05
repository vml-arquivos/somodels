# Ero Models — anúncios adultos e operação

## Escopo do produto

A Ero Models é um portal adulto para anúncios de acompanhantes maiores de 18 anos. A vitrine pública não cria nem injeta anúncios, fotos, vídeos, telefones ou dados sintéticos. Um anúncio só aparece depois de ser cadastrado por um titular ou por um usuário administrativo autorizado, receber mídia autorizada, passar pelos gates de moderação e ser publicado.

A página individual concentra nome artístico, título/categoria, idade pública, cidade e região, localização aproximada, descrição, disponibilidade, características, preferências, formas de contato autorizadas e galeria ordenada de fotos e vídeos. O telefone bruto não integra o payload público de descoberta. Quando o recurso de contato está habilitado e os controles são atendidos, a plataforma gera a saída para WhatsApp, ligação ou outro canal autorizado por uma procedure autenticada, age-gated, auditada e limitada.

## Age gate

A entrada pública exibe confirmação explícita de maioridade: a pessoa declara ter 18 anos ou mais e estar ciente da natureza adulta do conteúdo. Existe uma saída separada. Essa confirmação visual não substitui o provider real de age assurance exigido pelo ambiente de produção. Sem sessão de idade válida, o frontend não consulta a vitrine liberada e o backend responde sem perfis públicos.

## Painel administrativo

O painel diferencia contas operacionais do sistema (administrador, superadministrador e dev) de titulares de anúncios (contas comuns). O fluxo administrativo permite criar conta, criar anúncio para titular ativo, editar dados e mídia, ativar/inativar, moderar, publicar, solicitar ajustes, suspender, excluir logicamente e restaurar. A exclusão de anúncio é direta, sem prompt ou digitação de slug, mas é sempre lógica, reversível e auditada; dados, referências e histórico não são apagados fisicamente.

## Home configurável

A aba **Página inicial** permite editar sem código o eyebrow, título, descrição, texto do botão, texto do painel visual, placeholder da busca, título e descrição do estado vazio, seção institucional e rodapé. Anúncios reais não são misturados com textos de configuração. Se não houver anúncio publicado, a home exibe o estado vazio configurado.

## Taxonomias e filtros

As categorias iniciais de anúncio são Acompanhante, Acompanhante feminina, Acompanhante masculino, Acompanhante trans, Casal ou dupla, Massagem, Virtual e Anfitriã. Cada titular também pode informar características, preferências, idiomas e disponibilidade. A busca suporta nome/descrição, cidade, estado/região, categoria, característica e faixa etária mínima/máxima. A localização pública permanece aproximada e não deve receber endereço residencial.

Características de aparência ou estilo, como cor de cabelo, podem ser cadastradas como informação autodeclarada na lista de características e filtradas como texto. Elas não devem ser inferidas por imagem, biometria ou terceiros.

## Pré-requisitos de abertura

O código permanece fail-closed. Antes de abrir publicação/indexação em produção, o operador deve configurar e homologar `PUBLIC_ACCESS_ENABLED`, `PUBLIC_LAUNCH_ENABLED`, `ADULT_MARKETPLACE_ENABLED`, `ESCORT_LISTINGS_ENABLED`, `REQUIRE_AGE_VERIFICATION`, provider de age assurance, identidade quando exigida, storage, moderação, denúncias, bloqueios, contato seguro e `ROBOTS_NOINDEX=false` conforme o runbook. Pagamentos, assinaturas e intermediação financeira continuam desligados.

Flags de homologação e colunas históricas de dados não produtivos continuam existindo apenas como barreira técnica de segurança. Elas não são rotas, cards, assets ou copy da superfície pública.
