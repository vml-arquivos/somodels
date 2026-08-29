# Projeto TODO — Só Models

- [x] Inspecionar o ZIP anexado do Permupay Vendas e registrar a arquitetura reaproveitável
- [x] Substituir a marca Permupay Vendas por Só Models em toda a experiência
- [x] Definir modelo de usuário, titular de perfil, visitante e administrador
- [x] Implementar autenticação e proteção de rotas e procedimentos sensíveis
- [x] Criar tabela e validações de perfil com nome artístico, descrição, cidade/região, categorias, atributos, contato e status
- [x] Criar fluxo de criação, edição, envio para revisão e publicação de perfil pelo titular
- [x] Criar vitrine pública responsiva sem anúncios fictícios exibidos como reais
- [x] Implementar busca textual e filtros por cidade, categoria e atributos
- [x] Implementar localização e URLs públicas por cidade
- [x] Criar página individual pública de perfil com estados de privacidade e indisponibilidade
- [ ] Implementar galeria ordenada de fotos com metadados no banco e arquivos no armazenamento seguro
- [ ] Implementar área de vídeos com estados gratuito, premium, privado e indisponível
- [x] Preparar estrutura de checkout e liberação de acesso para vídeos premium sem ativar cobrança real nesta etapa
- [x] Criar revisão, aprovação, suspensão e destaque administrativo de perfis
- [x] Criar revisão e aprovação administrativa de mídias
- [x] Criar painel do titular para dados, mídia e status de publicação
- [ ] Criar painel administrativo para perfis, mídias, filtros e estados
- [x] Implementar schema Drizzle, migrations e execução/verificação no banco
- [x] Implementar helpers de banco, procedimentos tRPC e validações de entrada
- [x] Implementar uploads via storagePut sem gravar arquivos pesados no banco
- [x] Aplicar identidade visual original, responsiva, elegante e popular do Só Models
- [ ] Implementar SEO técnico, metadados, canonical e páginas indexáveis por cidade
- [ ] Avaliar necessidade de SSR para conteúdo público indexável
- [ ] Criar testes Vitest para permissões, validações, filtros, publicação e mídia
- [x] Executar check, build, testes e verificação visual responsiva
- [x] Documentar análise do repositório, arquitetura, arquivos alterados, migrations, configuração e testes
- [x] Criar ZIP final atualizado do projeto

## Pendências identificadas na revisão

- [x] Implementar fluxo completo do titular: criar, editar perfil existente, enviar para revisão explicitamente e refletir estados no painel
- [x] Criar rotas e páginas públicas por cidade com URLs dedicadas e navegação própria
- [ ] Adicionar ordenação funcional da galeria e edição de metadados de mídia
- [ ] Completar a experiência de vídeos com player e estados distintos de gratuito, premium, privado e indisponível
- [ ] Adicionar gestão administrativa de catálogos de cidades, categorias e atributos
- [ ] Criar testes Vitest para permissões, validações, filtros, publicação/moderação e mídia
- [x] Salvar relatório técnico no repositório documentando análise, arquitetura, migrações, arquivos alterados, configuração e testes

## Correções de rastreamento

- [x] Implementar canonical e metadados dinâmicos por rota/cidade; os metadados atuais são apenas estáticos no HTML base
- [ ] Gerar e anexar o ZIP final após a conclusão das validações
- [ ] Ampliar testes para autorização de titular/admin, validação Zod, filtros, moderação e mídia; a cobertura atual é inicial
