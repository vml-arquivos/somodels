# ADR-0002 — Separação de vitrine, conta e administração

- **Status:** aceito para implementação incremental; hosts adicionais ainda pendentes de decisão DNS/TLS/SSO.
- **Data:** 21/10/2026.
- **Contexto:** o Coolify de produção hoje tem somente `https://eromodels.com.br`, publica a branch `main` com source `HEAD` e entrega uma SPA por fallback. A auditoria confirmou que `/cliente` não tinha jornada de negócio. O cookie de sessão atual é host-only.

## Decisão

Manter um único código-base, API e banco enquanto a operação é estabilizada, mas separar explicitamente os contextos de navegação e autorização:

1. **Vitrine pública** — `eromodels.com.br`: home, busca, categorias/cidades, perfis publicados, segurança e institucionais. Não exigir conta para ler conteúdo público permitido.
2. **Conta** — host neutro recomendado `conta.eromodels.com.br` quando DNS/TLS/SSO forem aprovados. Até lá, a mesma aplicação oferece `/conta` e `/cliente` como rotas privadas verificáveis, com layout/navegação próprios e sem reutilizar o painel do titular.
3. **Administração** — `admin.eromodels.com.br` quando houver host e proteção aprovados. Até lá, `/admin` continua separado por guarda de backend, sem link automático que contorne RBAC.

Cada host futuro deverá ter allowlist de origem, CSRF/CORS explícito, canonical/robots próprios, callback de autenticação permitido e teste E2E. O cookie administrativo não será ampliado para todos os subdomínios por conveniência.

## Alternativas rejeitadas

- **Duplicar aplicações/repositórios:** aumentaria divergência de schema, build e autorização sem necessidade demonstrada.
- **Usar somente `/titular` para clientes:** mistura jornadas, expõe navegação inadequada e impede separar ownership de favoritos/denúncias.
- **Compartilhar cookie `Domain=.eromodels.com.br`:** amplia blast radius do cookie administrativo e não resolve SSO de forma segura.
- **Criar DNS/SSL agora:** seria uma mudança externa e potencialmente irreversível sem definição de host, callback, política de sessão e rollback.

## Consequências

- Positivas: rollout gradual, uma migração de código menor, superfícies privadas claras e possibilidade de manter admin isolado.
- Negativas: enquanto não houver subdomínios, a separação de host é apenas uma separação de rota; a configuração do Coolify continua de produção e não comprova homologação multi-host.
- O release não pode ser chamado de três domínios concluídos até que DNS, TLS, roteamento, callbacks e E2E de cada host estejam verificados.

## Critérios de evolução

Antes de configurar `conta` ou `admin`: aprovar convenção de host, origem canônica, estratégia SSO ou login separado, cookie/SameSite/CSRF, CORS, callbacks e plano de rollback. Depois: criar/validar DNS e certificados em homologação, testar isolamento, comparar SHA servido e só então avaliar produção.
