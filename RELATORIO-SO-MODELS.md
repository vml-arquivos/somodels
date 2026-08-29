# Só Models — Relatório técnico da transformação

## 1. Resumo

A base do projeto foi inicializada como uma aplicação full-stack React, TypeScript, Express, tRPC, Drizzle e Manus OAuth. O repositório anexado `permupay-vendas-main(2).zip` foi extraído e analisado. A base original é um simulador de precificação com entidades de produtos, cotação, vendas e componentes de imagem voltados a catálogo comercial. Como a modelagem e a experiência estavam fortemente acopladas ao domínio de precificação, a implementação atual preserva a infraestrutura full-stack do scaffold e reaproveita o princípio de vitrine, autenticação e armazenamento, substituindo a experiência por uma arquitetura nativa de perfis.

## 2. Arquitetura atual

O sistema possui uma vitrine pública com busca textual, filtro por cidade, categoria e atributo, página individual por slug, área autenticada do titular e área administrativa protegida por papel. Perfis são criados pelo titular e podem permanecer em rascunho ou ser enviados explicitamente para revisão. O administrador pode aprovar, suspender, destacar e revisar mídias antes de torná-las públicas.

Fotos e vídeos não são gravados no banco de dados. O endpoint autenticado `/api/upload/media` envia os bytes ao storage seguro por `storagePut` e grava no banco apenas chave, URL, MIME type, tipo de mídia, título, descrição, status, ordem e sinalização premium. A tabela de direitos premium já existe para futura integração de checkout, mas nenhuma cobrança real foi ativada nesta etapa.

## 3. Modelo de dados

As tabelas adicionadas são `profiles`, `profile_media` e `premium_entitlements`. `profiles` guarda o titular, slug, nome artístico, descrição, cidade, região, categorias, atributos, formas de contato, avatar e estado editorial. `profile_media` guarda os arquivos e seus metadados, com estados `pending`, `approved`, `rejected` e `private`. `premium_entitlements` prepara a relação entre usuário, mídia e eventual referência de provedor de pagamento.

A migration aplicada é `drizzle/0001_careless_annihilus.sql`. Ela cria quatro índices em perfis e mídias para titular, cidade e estado de publicação, além do índice único de direitos por usuário e mídia.

## 4. Arquivos principais alterados ou criados

| Arquivo | Alteração |
|---|---|
| `drizzle/schema.ts` | Novo modelo de perfis, mídias e direitos premium. |
| `drizzle/0001_careless_annihilus.sql` | Migration aplicada no banco. |
| `server/db.ts` | Helpers para consulta pública, titular, moderação, hidratação e persistência. |
| `server/routers.ts` | Procedimentos tRPC públicos, protegidos e administrativos com Zod. |
| `server/_core/index.ts` | Endpoint autenticado de upload para fotos e vídeos. |
| `client/src/App.tsx` | Rotas da home, perfil, titular e administração. |
| `client/src/pages/Home.tsx` | Vitrine, filtros, empty state e navegação. |
| `client/src/pages/ProfilePage.tsx` | Página individual, informações, galeria e vídeos. |
| `client/src/pages/OwnerDashboard.tsx` | Cadastro de perfil, rascunho, revisão e upload de mídia. |
| `client/src/pages/AdminDashboard.tsx` | Aprovação, suspensão, destaque e revisão de mídias. |
| `client/src/index.css` | Identidade visual original do Só Models. |
| `server/profiles.test.ts` | Testes de hidratação e tolerância a JSON inválido. |
| `todo.md` | Rastreamento do escopo, pendências e lacunas. |

## 5. Identidade visual

A direção usa fundo plum-black, acento blush pink, títulos editoriais serifados, painéis escuros e linha orbital como motivo visual. O conteúdo evita anúncios fictícios: quando não há perfis aprovados, a vitrine informa honestamente que nenhum perfil foi publicado ainda. O painel do titular também comunica que as mídias ficam pendentes de revisão.

## 6. Configuração

A aplicação usa os segredos já injetados pelo projeto para banco, OAuth e storage. Não é necessário adicionar chave manual para o storage seguro. Para checkout premium, será necessário ativar uma integração de pagamento e definir a política de preço, moeda, webhook e liberação de entitlement. Para SEO avançado, recomenda-se configurar `SITE_NAME=Só Models` e `CANONICAL_ORIGIN` no ambiente de produção e concluir SSR ou prerender das rotas públicas.

## 7. Verificações executadas

`pnpm test` passou com 3 testes. `pnpm check` passou sem erros TypeScript. `pnpm build` passou para frontend e servidor. A home, a área do titular e a área administrativa foram verificadas visualmente em viewport desktop. A vitrine começa vazia por design, sem seed ou conteúdo de anúncio falso.

## 8. Pendências conhecidas

Ainda precisam ser concluídos, preferencialmente antes de ativação pública, o SSR/metadados por rota, as páginas dedicadas por cidade, a ordenação visual da galeria, a edição completa de metadados de mídia, o player de vídeo real com política de acesso premium, o catálogo administrativo de cidades/categorias/atributos, testes de autorização mais amplos e a integração efetiva de checkout. Essas pendências estão registradas no `todo.md` e não devem ser consideradas implementadas apenas porque a estrutura inicial já existe.
