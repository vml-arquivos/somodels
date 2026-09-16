import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import StudioHeader from "@/components/StudioHeader";
export default function ChangePasswordPage() {
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState(""),
    [nextPassword, setNextPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState("");
  const change = trpc.auth.changePassword.useMutation({
    onSuccess: () => navigate("/login"),
    onError: e => setError(e.message),
  });
  return (
    <div className="studio">
      <StudioHeader />
      <main className="studio-main studio-narrow">
        <section className="studio-panel">
          <h1>Alterar senha</h1>
          <p>
            Use pelo menos 16 caracteres, com letras maiúsculas, minúsculas e
            números.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (nextPassword !== confirmation)
                return setError("As senhas não coincidem");
              setError("");
              change.mutate({ currentPassword, nextPassword });
            }}
          >
            <label>
              Senha atual
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={200}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </label>
            <label>
              Nova senha
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={16}
                maxLength={200}
                value={nextPassword}
                onChange={e => setNextPassword(e.target.value)}
              />
            </label>
            <label>
              Confirmar nova senha
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={e => setConfirmation(e.target.value)}
              />
            </label>
            {error && (
              <p className="studio-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={change.isPending}>
              Salvar e entrar novamente
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
