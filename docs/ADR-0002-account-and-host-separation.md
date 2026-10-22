# ADR-0002 — Separação de vitrine, conta e administração

- **Status:** aceito para implementação incremental; DNS/TLS público confirmado em 22/10/2026, associação no Coolify e validação multi-host ainda pendentes.
- **Data:** 21/10/2026.
- **Contexto:** o Coolify de produção hoje associa somente `https://eromodels.com.br`, embora `conta.eromodels.com.br` e `admin.eromodels.com.br` já resolvam no DNS; a aplicação publica a branch `main` com source `HEAD` e entrega uma SPA por fallback. A auditoria confirmou que `/cliente` não tinha jornada de negócio. O cookie de sessão atual é host-only.

## Decisão

Manter um único código-base, API e banco enquanto a operação é estabilizada, mas separar explicitamente os contextos de navegação e autorização:

1. **Vitrine pública** — `eromodels.com.br`: home, busca, categorias/cidades, perfis publicados, segurança e institucionais. Não exigir conta para ler conteúdo público permitido.
2. **Conta** — `conta.eromodels.com.br` como host neutro. A mesma aplicação redireciona sua landing `/` para `/conta`, mantém `/cliente` como alias privado verificável e não reutiliza o painel do titular.
3. **Administração** — `admin.eromodels.com.br` como host protegido. A mesma aplicação redireciona sua landing `/` para `/admin`; a guarda de backend continua obrigatória e nenhum link contorna RBAC.

Cada host deverá ter allowlist de origem, CSRF/CORS explícito, canonical/robots próprios, callback de autenticação permitido e teste E2E. O cookie administrativo não será ampliado para todos os subdomínios por conveniência.

## Alternativas rejeitadas

- **Duplicar aplicações/repositórios:** aumentaria divergência de schema, build e autorização sem necessidade demonstrada.
- **Usar somente `/titular` para clientes:** mistura jornadas, expõe navegação inadequada e impede separar ownership de favoritos/denúncias.
- **Compartilhar cookie `Domain=.eromodels.com.br`:** amplia blast radius do cookie administrativo e não resolve SSO de forma segura.
- **Criar DNS/SSL agora:** não se aplica mais ao DNS já existente; a associação no Coolify continua condicionada à validação de host, callback, política de sessão e rollback.

## Consequências

- Positivas: rollout gradual, uma migração de código menor, superfícies privadas claras e possibilidade de manter admin isolado.
- Negativas: enquanto os dois domínios não forem associados no Coolify, a separação de host é apenas uma regra de roteamento testada no código; o Coolify ainda não comprova homologação multi-host.
- O release não pode ser chamado de três domínios concluídos até que DNS, TLS, roteamento, callbacks e E2E de cada host estejam verificados.

## Critérios de evolução

Antes de associar `conta` ou `admin` no Coolify: validar certificados, origem canônica, estratégia SSO ou login separado, cookie/SameSite/CSRF, CORS, callbacks e plano de rollback. Depois: testar isolamento por host, comparar SHA servido e validar smoke/E2E em produção.
