import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import StudioHeader from "@/components/StudioHeader";
export default function ResetPasswordPage() {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || ""
  );
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState("");
  const mutation = trpc.management.resetPassword.useMutation({
    onError: e => setError(e.message),
  });
  useEffect(() => {
    history.replaceState(null, "", window.location.pathname);
  }, []);
  return (
    <div className="studio">
      <StudioHeader />
      <main className="studio-main studio-narrow">
        <section className="studio-panel">
          <h1>Definir nova senha</h1>
          {mutation.isSuccess ? (
            <>
              <p>
                Senha atualizada. As sessões locais anteriores foram encerradas.
              </p>
              <Link href="/login">Voltar ao login</Link>
            </>
          ) : !token ? (
            <p>
              Abra o link completo de recuperação fornecido pelo administrador.
            </p>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                if (password !== confirm)
                  return setError("As senhas não coincidem");
                setError("");
                mutation.mutate({ token, password });
              }}
            >
              <p>
                Use pelo menos 16 caracteres, com letras maiúsculas, minúsculas
                e números.
              </p>
              <label>
                Nova senha
                <input
                  autoComplete="new-password"
                  type="password"
                  required
                  minLength={16}
                  maxLength={200}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </label>
              <label>
                Confirmar senha
                <input
                  autoComplete="new-password"
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </label>
              {error && (
                <p role="alert" className="studio-error">
                  {error}
                </p>
              )}
              <button className="primary" disabled={mutation.isPending}>
                Salvar nova senha
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
