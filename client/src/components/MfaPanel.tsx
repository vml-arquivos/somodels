import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function MfaPanel() {
  const status = trpc.auth.mfaStatus.useQuery();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const begin = trpc.auth.mfaBegin.useMutation({
    onSuccess: data => setSetup(data),
    onError: error => toast.error(error.message),
  });
  const confirm = trpc.auth.mfaConfirm.useMutation({
    onSuccess: async () => {
      toast.success("Verificação em duas etapas ativada");
      setSetup(null);
      setCode("");
      await status.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const disable = trpc.auth.mfaDisable.useMutation({
    onSuccess: async () => {
      toast.success("Verificação em duas etapas desativada");
      setCode("");
      setPassword("");
      await status.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const data = status.data;
  return (
    <section className="studio-panel" aria-label="Verificação em duas etapas">
      <p className="studio-kicker">Segurança da conta</p>
      <h2>Verificação em duas etapas</h2>
      {status.isLoading ? (
        <p>Carregando…</p>
      ) : data?.enabled ? (
        <>
          <p>Ativa. O login passa a pedir o código do aplicativo autenticador.</p>
          {data.required ? (
            <p className="studio-muted">
              Obrigatória para administradores neste ambiente; não pode ser desativada.
            </p>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                disable.mutate({ password, code });
              }}
            >
              <label>
                Senha atual
                <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
              </label>
              <label>
                Código do aplicativo
                <input inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value)} />
              </label>
              <button className="danger" disabled={disable.isPending || !password || code.length < 6}>
                Desativar
              </button>
            </form>
          )}
        </>
      ) : setup ? (
        <>
          <p>
            No aplicativo autenticador (Google Authenticator, Microsoft Authenticator,
            Authy), escolha “inserir chave manualmente” e informe:
          </p>
          <p>
            <code style={{ wordBreak: "break-all", fontSize: "1.1rem" }}>{setup.secret}</code>
          </p>
          <p className="studio-muted">
            Em celulares, o link abaixo abre o aplicativo já configurado:{" "}
            <a href={setup.otpauthUrl}>abrir no autenticador</a>
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              confirm.mutate({ code });
            }}
          >
            <label>
              Código de 6 dígitos gerado
              <input inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} />
            </label>
            <button className="primary" disabled={confirm.isPending || code.length < 6}>
              Confirmar e ativar
            </button>
          </form>
        </>
      ) : (
        <>
          <p>
            {data?.required
              ? "A administração exige verificação em duas etapas. Ative para continuar."
              : "Proteja sua conta com um código extra gerado no celular."}
          </p>
          <button className="primary" disabled={begin.isPending} onClick={() => begin.mutate()}>
            Configurar agora
          </button>
        </>
      )}
    </section>
  );
}
