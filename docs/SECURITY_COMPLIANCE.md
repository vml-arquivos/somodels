# Segurança e conformidade operacional

> **Aviso:** sou uma IA, não um advogado. Este documento é uma análise técnica operacional, não aconselhamento jurídico formal; a operação deve ser revisada por advogado qualificado antes do lançamento e das decisões comerciais.

A aplicação foi configurada para priorizar segurança e conformidade operacional. A vitrine pública permanece fechada por padrão (`PUBLIC_ACCESS_ENABLED=false`) e somente pode ser aberta quando um provedor real de verificação de idade estiver configurado com chave e segredo de webhook. A mera autodeclaração no navegador ou um timestamp no `localStorage` não é considerado prova de idade.

O backend mantém sessões de verificação com estado, referência opaca, validade, jurisdição e eventos. O proxy de mídia não entrega o objeto sem sessão de idade aprovada, mídia aprovada e perfil publicado; mídia premium exige também entitlement pago. As URLs internas de storage não são aceitas diretamente pelo endpoint de cadastro de mídia e os objetos são armazenados com chaves aleatórias.

A publicação de perfil e o upload de mídia exigem uma verificação de identidade do anunciante com estado `approved` quando `KYC_REQUIRED=true`. A aplicação não foi autorizada a guardar documentos brutos ou biometria; a integração deve receber somente referências opacas e estados fornecidos pelo provedor aprovado. O selo de verificação deve ser implementado com escopo e data, sem sugerir garantia de preço, serviço ou conduta.

Pagamentos permanecem desligados. Nenhum checkout, crédito, assinatura ou webhook de cobrança pode ser ativado sem aprovação formal do provedor para entidade jurídica, jurisdição brasileira, marketplace de anúncios adultos, recorrência, chargebacks, créditos e descritor de fatura. A camada de dados é preparada para ledger e idempotência, mas não simula cobrança nem cria transação fictícia.

As mutações exigem origem permitida, cookies locais usam `HttpOnly`, `Secure` atrás de proxy e `SameSite=Lax`, tentativas de login são limitadas por IP e sessões locais são opacas, armazenadas apenas por hash e revogáveis server-side. Operações administrativas e decisões de moderação geram registros de auditoria. Uploads têm limite, lista de MIME permitidos, validação de assinatura binária e nomes aleatórios.

O operador deve habilitar backup consistente antes de qualquer migration de produção, manter procedimento de restauração testado, ativar notificações de incidente e confirmar que o armazenamento de mídia é persistente ou compatível com object storage. O texto legal, política de privacidade, termos, tratamento de denúncias e retenção de evidências ainda exigem revisão jurídica e operacional específica.
