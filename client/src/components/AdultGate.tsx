import { useEffect, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type AdultAccess = {
  ready: boolean;
  status: "loading" | "approved" | "pending" | "unavailable";
  accepting: boolean;
  message: string;
  error: string;
  accept: () => Promise<void>;
};

const CONSENT_KEY = "ero-models-adult-consent-v1";

export function useAdultAccess(): AdultAccess {
  const ageStatus = trpc.age.status.useQuery();
  const start = trpc.age.start.useMutation();
  const [localConsent, setLocalConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setLocalConsent(localStorage.getItem(CONSENT_KEY) === "approved");
    } catch {
      setLocalConsent(false);
    }
  }, []);

  const accept = async () => {
    setMessage("");
    setError("");
    if (ageStatus.data?.status === "unavailable") {
      setError(
        "A verificação de idade real ainda não está disponível neste ambiente. O conteúdo adulto permanece bloqueado."
      );
      return;
    }
    try {
      const result = await start.mutateAsync();
      await ageStatus.refetch();
      if (result.status === "approved") {
        try {
          localStorage.setItem(CONSENT_KEY, "approved");
        } catch {
          // A sessão do backend continua sendo a fonte de autorização.
        }
        setLocalConsent(true);
      } else {
        setMessage(
          "Sua confirmação foi registrada, mas a verificação de idade ainda precisa ser concluída pelo provedor configurado."
        );
      }
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const status = ageStatus.isLoading
    ? "loading"
    : ageStatus.data?.status ?? "unavailable";

  return {
    ready: localConsent && status === "approved",
    status,
    accepting: start.isPending,
    message,
    error,
    accept,
  };
}

export default function AdultGate({
  access,
  children,
}: {
  access: AdultAccess;
  children: ReactNode;
}) {
  if (access.ready) return <>{children}</>;

  return (
    <div className="studio studio-adult-gate-screen">
      <main className="studio-adult-gate" aria-labelledby="adult-gate-title">
        <img
          src="/brand/logo-light.svg"
          alt="Ero Models"
          className="studio-adult-gate-logo"
          width="180"
          height="56"
        />
        <div className="studio-adult-gate-mark" aria-hidden="true">
          +18
        </div>
        <p className="studio-kicker">Confirmação de idade</p>
        <h1 id="adult-gate-title">Conteúdo adulto</h1>
        <p>
          Esta plataforma exibe anúncios e conteúdos destinados exclusivamente
          a pessoas maiores de 18 anos.
        </p>
        <p>
          Ao continuar, você confirma que tem 18 anos ou mais e está ciente da
          natureza adulta da Ero Models.
        </p>
        {access.status === "unavailable" && (
          <p className="studio-adult-gate-warning" role="status">
            A abertura pública depende da configuração de uma verificação de
            idade real. Nenhum anúncio adulto é liberado sem esse controle.
          </p>
        )}
        {access.message && (
          <p className="studio-notice" role="status">
            {access.message}
          </p>
        )}
        {access.error && (
          <p className="studio-error" role="alert">
            {access.error}
          </p>
        )}
        <div className="studio-actions studio-adult-gate-actions">
          <button
            className="primary"
            disabled={access.accepting || access.status === "loading"}
            onClick={() => void access.accept()}
          >
            {access.accepting ? "Verificando…" : "Tenho 18 anos ou mais"}
          </button>
          <a href="https://www.google.com/" rel="noreferrer">
            Sair
          </a>
        </div>
        <small>
          A confirmação visual não substitui a verificação de idade real exigida
          para a abertura pública e para o acesso a contatos controlados.
        </small>
      </main>
    </div>
  );
}
