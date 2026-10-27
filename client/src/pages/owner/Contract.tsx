import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Badge,
  Card,
  ErrorBlock,
  LoadingBlock,
  OIcon,
  PageHead,
  fmtBirth,
  fmtDateTime,
} from "./ui";

export default function Contract() {
  const utils = trpc.useUtils();
  const contract = trpc.owner.contract.useQuery();
  const [confirmed, setConfirmed] = useState(false);
  const accept = trpc.auth.acceptAccountTerms.useMutation({
    onSuccess: async () => {
      toast.success("Aceite registrado");
      setConfirmed(false);
      await Promise.all([
        utils.owner.contract.invalidate(),
        utils.owner.overview.invalidate(),
        utils.auth.accountTermsStatus.invalidate(),
        utils.profiles.publicationReadiness.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  if (contract.isLoading) return <LoadingBlock />;
  if (contract.error || !contract.data)
    return (
      <ErrorBlock message={contract.error?.message || "Erro ao carregar"} />
    );
  const { holder, terms } = contract.data;

  return (
    <>
      <PageHead
        title="Contrato"
        subtitle="Termo de adesão e responsabilidade da sua conta de anunciante."
        actions={
          <button
            type="button"
            className="od-btn"
            onClick={() => window.print()}
          >
            <OIcon name="print" size={16} /> Imprimir / salvar PDF
          </button>
        }
      />
      <div className="od-contract-status">
        {terms.current ? (
          <Badge tone="ok">Aceito em {fmtDateTime(terms.acceptedAt)}</Badge>
        ) : (
          <Badge tone="warn">Aceite pendente</Badge>
        )}
        <span className="od-muted">Versão {terms.version}</span>
      </div>

      {!holder && (
        <div className="od-alert is-warn">
          <OIcon name="alert" />
          <p>
            Preencha seus dados pessoais para que o contrato saia com o seu nome
            e CPF.
          </p>
          <Link href="/titular/dados">Preencher dados</Link>
        </div>
      )}

      <article className="od-contract" aria-label="Termo de adesão">
        <h2>Termo de adesão e responsabilidade do anunciante</h2>

        <h3>1. Partes</h3>
        <p>
          <strong>Plataforma:</strong> Ero Models (eromodels.com.br), que
          disponibiliza o espaço de divulgação de anúncios.
        </p>
        <p>
          <strong>Titular:</strong>{" "}
          {holder ? (
            <>
              {holder.fullName}, CPF {holder.cpf}, nascido(a) em{" "}
              {fmtBirth(holder.birthDate)}
              {holder.city
                ? `, ${holder.city}${holder.state ? "/" + holder.state : ""}`
                : ""}
              .
            </>
          ) : (
            <em>dados pessoais ainda não informados</em>
          )}
        </p>

        <h3>2. Objeto</h3>
        <p>
          A plataforma oferece ao titular uma área para criar, publicar e
          gerenciar anúncios, guardar arquivos de mídia em uma biblioteca
          privada e acompanhar o desempenho. A plataforma não é parte dos
          encontros ou serviços combinados entre o titular e terceiros.
        </p>

        <h3>3. Nome do anúncio e dados reais</h3>
        <p>
          O titular informa à plataforma seus dados reais, que são mantidos em
          sigilo e nunca exibidos no anúncio. No anúncio, o titular pode usar
          nome artístico e a idade que desejar, desde que seja maior de 18 anos,
          não use o nome, a imagem ou os documentos de outra pessoa e respeite
          as regras de conteúdo permitido.
        </p>

        <h3>4. Declarações e obrigações do titular</h3>
        <ol>
          {terms.clauses.map(clause => (
            <li key={clause}>{clause}</li>
          ))}
        </ol>

        <h3>5. Valores</h3>
        <p>
          No momento o uso da plataforma não tem cobrança. Havendo cobrança no
          futuro, o titular será avisado com antecedência e poderá escolher se
          deseja continuar. Pagamentos e faturas ficam disponíveis na área
          “Plano e pagamentos”.
        </p>

        <h3>6. Conteúdo e moderação</h3>
        <p>
          A plataforma pode remover ou suspender anúncios e mídias que violem
          estas regras ou a lei, informando o motivo ao titular sempre que
          possível.
        </p>

        <h3>7. Dados pessoais</h3>
        <p>
          Os dados do titular são tratados conforme a política de privacidade e
          a LGPD, e usados para identificação, segurança, cumprimento deste
          termo e obrigações legais.
        </p>

        <h3>8. Aceite</h3>
        <p>
          {terms.current
            ? `Aceito eletronicamente em ${fmtDateTime(terms.acceptedAt)}, versão ${terms.version}, com a conta e o e-mail de acesso do titular.`
            : "O aceite será registrado eletronicamente com a data, a hora e a conta do titular."}
        </p>
        <div className="od-signature">
          <span>{holder?.fullName || "Titular"}</span>
          <small>
            {terms.current
              ? `Assinado eletronicamente · ${fmtDateTime(terms.acceptedAt)}`
              : "Aguardando aceite"}
          </small>
        </div>
      </article>

      {!terms.current && (
        <Card
          kicker="Aceite"
          title="Confirmar o contrato"
          className="od-no-print"
        >
          <label className="od-check-row">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={event => setConfirmed(event.target.checked)}
            />
            <span>Li o termo e confirmo as declarações acima.</span>
          </label>
          <button
            type="button"
            className="od-btn is-primary"
            disabled={!confirmed || accept.isPending}
            onClick={() => accept.mutate()}
          >
            {accept.isPending ? "Registrando…" : "Aceitar e continuar"}
          </button>
        </Card>
      )}
      <p className="od-muted od-no-print">
        Dúvidas sobre o contrato? Fale com a gente em{" "}
        <Link className="od-link" href="/contato">
          Contato
        </Link>
        .
      </p>
    </>
  );
}
