# ADR-0002 — Separação de vitrine, conta e administração

- **Status:** associação DNS/TLS e Coolify concluída em 22/10/2026; autenticação multi-host, callbacks específicos e E2E autenticado continuam como evolução futura.
- **Data:** 21/10/2026.
- **Contexto:** o Coolify de produção associa `https://eromodels.com.br`, `https://conta.eromodels.com.br` e `https://admin.eromodels.com.br` ao mesmo recurso `somodels-app`, com DNS correspondente, HTTPS obrigatório e porta 3000. A aplicação publica a branch `main` com source `HEAD` e entrega uma SPA por fallback. O cookie de sessão atual é host-only.

## Decisão

Manter um único código-base, API e banco enquanto a operação é estabilizada, mas separar explicitamente os contextos de navegação e autorização:

1. **Vitrine pública** — `eromodels.com.br`: home, busca, categorias/cidades, perfis publicados, segurança e institucionais. Não exigir conta para ler conteúdo público permitido.
2. **Conta** — `conta.eromodels.com.br` como host neutro. A mesma aplicação redireciona sua landing `/` para `/conta`, mantém `/cliente` como alias privado verificável e não reutiliza o painel do titular.
3. **Administração** — `admin.eromodels.com.br` como host protegido. A mesma aplicação redireciona sua landing `/` para `/admin`; a guarda de backend continua obrigatória e nenhum link contorna RBAC.

Cada host privado devolve `Disallow: /` em `robots.txt` e sitemap vazio. O cookie administrativo não é ampliado para todos os subdomínios por conveniência.

## Alternativas rejeitadas

- **Duplicar aplicações/repositórios:** aumentaria divergência de schema, build e autorização sem necessidade demonstrada.
- **Usar somente `/titular` para clientes:** mistura jornadas, expõe navegação inadequada e impede separar ownership de favoritos/denúncias.
- **Compartilhar cookie `Domain=.eromodels.com.br`:** amplia blast radius do cookie administrativo e não resolve SSO de forma segura.
- **Criar novos serviços ou variáveis para cada host:** os três hosts compartilham o recurso e a API existentes; a separação atual é de entrada, rota e autorização.

## Consequências

- Positivas: rollout gradual, uma migração de código menor, superfícies privadas claras e possibilidade de manter admin isolado.
- Negativas: o mesmo recurso Coolify atende os três hosts; isolamento de sessão e callbacks não deve ser presumido como SSO.
- O smoke de produção confirmou DNS, TLS, redirects, healthcheck, release alinhado e bloqueio de indexação nos hosts privados; E2E autenticado multi-host ainda é um item de evolução.

## Critérios de evolução

Antes de habilitar SSO ou callbacks específicos: aprovar origem canônica, estratégia de login, cookie/SameSite/CSRF, CORS, allowlist de origens e plano de rollback. Depois: testar isolamento por host com contas reais de cada papel, comparar SHA servido e manter smoke/E2E em CI.
