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
        setMessage("Sua confirmação foi registrada. Conclua as etapas indicadas para continuar.");
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
            {access.accepting ? "Continuando…" : "Eu afirmo ter mais de 18 anos, estou ciente."}
          </button>
          <a href="https://www.google.com/" rel="noreferrer">
            Sair
          </a>
        </div>
      </main>
    </div>
  );
}
