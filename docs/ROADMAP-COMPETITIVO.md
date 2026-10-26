# Roadmap competitivo — Ero Models × Fatal Model

Data da análise: 25/10/2026. Base: código do repositório (fonte de verdade da Ero Models) e páginas públicas do Fatal Model. Os números do concorrente são os que ele divulga na própria home e não foram auditados.

## Ponto de partida

A Ero Models tem uma base técnica sólida e prudente: age gate, RBAC, moderação, denúncias, bloqueios, favoritos, auditoria, PWA, SEO por rota, storage protegido e flags fail-closed. Typecheck limpo e suíte de testes verde.

O que ela ainda não tem é o que gera volume e receita: busca por preço e serviço, avaliações, planos pagos, métricas para o anunciante, verificação operável e conteúdo de aquisição. Várias tabelas já existem no banco (planos, assinaturas, créditos, avaliações, turnês, analytics), mas nenhuma tem tela ou rotina por trás.

## Achados que travavam o lançamento

| # | Achado | Situação |
|---|---|---|
| 1 | Nada criava a verificação de identidade. Com `KYC_REQUIRED=true` (padrão), nenhuma anunciante conseguia enviar perfil para revisão. | Corrigido na Fase 1 (fluxo manual). |
| 2 | Nenhum registro de visualização ou clique de contato (tabelas de analytics sem uso). | Corrigido na Fase 1. |
| 3 | Sitemap de perfis limitado aos 60 primeiros anúncios. | Corrigido na Fase 2. |
| 4 | Listagem faz uma consulta extra de termos por perfil (até 60 por página) e busca com `LIKE '%...%'`. | Corrigido na Fase 2. |
| 5 | Sem total de resultados nem paginação numerada; sem página de cidade com texto próprio para SEO. | Corrigido na Fase 2. |

## Comparativo de funções

| Função | Fatal Model | Ero Models hoje | Depois da Fase 1 |
|---|---|---|---|
| Busca por cidade, região, categoria, idade | Sim | Sim | Sim |
| "Em expediente / disponível agora" | Sim | Sim | Sim |
| Filtro por faixa de preço | Sim | Não | **Sim** |
| Filtro por serviço / local de atendimento | Sim | Parcial (texto livre) | **Sim (vocabulário controlado)** |
| Selo de documentos verificados | Sim (verificação de documento, face e vídeo) | Não | **Sim (verificação manual por videochamada)** |
| Métricas para o anunciante | Não divulgado | Não | **Sim (visitas e cliques de contato)** |
| Calculadora de ganhos / guia da anunciante | Sim | Não | **Sim** |
| Avaliações de clientes | Sim (130 mil) | Tabelas sem tela | Fase 3 |
| Planos pagos / destaque | Sim | Tabelas sem tela, pagamentos desligados | Fase 2 |
| Vídeos com selo de verificação | Sim | Upload existe, sem player dedicado nem selo | Fase 2 |
| Categorias masculino / trans com páginas próprias | Sim | Categorias existem, sem páginas de cidade × categoria | Fase 2 |
| Conteúdo (blog, podcast, redes) | Sim | Não | Fase 3 |
| Idioma inglês | Sim | Não | Fase 3 |
| Canal de denúncia de exploração (Disque 100) em destaque | Sim | Denúncia interna, sem o destaque no rodapé | Fase 2 (rápido) |
| App / PWA | Sem app divulgado | PWA pronto | Sim |

## Fase 1 — entregue neste pacote

- Migration `0007_profile_discovery`: `priceFromCents`, `services`, `attendancePlaces` e índice de preço. Colunas opcionais; anúncios existentes não mudam.
- Filtros públicos de preço, serviço, local de atendimento, "identidade verificada" e ordenação por menor preço, todos compartilháveis por URL.
- Cartão e página do anúncio mostram "a partir de R$", selo de identidade verificada, local de atendimento e serviços.
- Formulário do anunciante (e do admin) com os novos campos.
- Verificação de identidade manual: pedido pelo anunciante, fila no admin, aprovação (12 meses) ou recusa com motivo, auditoria e bloqueio de autoaprovação. Nenhum documento é armazenado.
- Métricas agregadas por dia (sem IP nem identificador) e painel "Desempenho" no anúncio publicado.
- Páginas `/como-anunciar` e `/calculadora-de-ganhos`, no sitemap e no rodapé.
- Healthcheck passa a exigir as colunas da migration 0007.

## Fase 2 — receita e escala (entregue em grande parte)

Feito: planos e destaque com ativação manual por Pix (item 1, sem provider automático), SEO em escala (item 3), Disque 100 (item 6), MFA do admin e checklist de prontidão. Fica para depois: verificação com documento (2), FULLTEXT e vídeo dedicado (4 e 5), catálogo editável (7).

1. **Planos e destaque**: telas de planos (tabela `plans` já existe), assinatura, ranking por plano com rótulo "Patrocinado", e provider de pagamento com Pix. Depende de decisão de preço, entidade jurídica e provider; manter `PAYMENTS_ENABLED=false` até lá.
2. **Verificação com documento**: envio de documento e selfie para bucket privado, retenção definida, revisão no admin. Depende da política de retenção (LGPD).
3. **SEO em escala**: sitemap paginado, páginas cidade × categoria com texto próprio, total de resultados e paginação numerada.
4. **Desempenho da listagem**: contar termos em lote, índice de busca (FULLTEXT) no lugar de `LIKE`, cache curto das localidades.
5. **Vídeo**: player dedicado, selo de vídeo verificado, miniatura automática.
6. **Segurança visível**: destaque do Disque 100 no rodapé e página de denúncia.
7. **Catálogo administrável**: cidades, categorias, serviços e atributos editáveis no admin.

## Fase 3 — crescimento

- Avaliações de clientes com moderação, direito de resposta e recurso (tabelas `reviews` e `review_appeals` já existem).
- Turnês ("em viagem para") usando a tabela `tours`.
- Disponibilidade com expiração automática (`availability.availableUntil`) e lembretes por e-mail.
- Blog e conteúdo de aquisição; versão em inglês.
- Notificações (e-mail/push) para anunciante: perfil aprovado, mídia recusada, verificação vencendo.
- Painel de crescimento no admin: anunciantes ativos, funil cadastro → verificação → publicação, tempo de moderação.

## Fora do código (decide o resultado)

O Fatal Model opera desde 2016 e divulga mais de 70 mil anunciantes. Paridade de funções não gera paridade de mercado. Os fatores que mais pesam são:

- **Oferta**: captar as primeiras centenas de anunciantes por cidade, começando por poucas cidades.
- **Tráfego**: SEO por cidade, conteúdo e canais próprios; compra de mídia é limitada para o setor.
- **Confiança**: verificação operando de verdade, moderação rápida e política pública clara.
- **Jurídico**: entidade operadora, canal de privacidade/DPO e política de retenção, hoje marcados como pendentes no ADR-0001.

## Decisões que precisam do dono do produto

1. Preço e estrutura dos planos de anunciante e de cliente.
2. Provider de pagamento (Pix) e quando ligar `PAYMENTS_ENABLED`.
3. Verificação por videochamada (hoje) ou envio de documento (Fase 2) e prazo de retenção.
4. Cidades prioritárias para o lançamento.
5. Se haverá categorias masculino/trans como vitrines próprias.
