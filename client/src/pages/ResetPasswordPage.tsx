import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AuthCard } from "@/components/PublicShell";
import Seo from "@/components/Seo";
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
    <>
      <Seo title="Nova senha — Ero Models" description="Defina uma nova senha." noindex />
      <AuthCard title="Definir nova senha">
        {mutation.isSuccess ? (
          <>
            <p className="ep-auth-intro">
              Senha atualizada. Entre de novo com a nova senha.
            </p>
            <Link className="ep-btn ep-btn-primary" href="/login">
              Ir para o login
            </Link>
          </>
        ) : !token ? (
          <p className="ep-auth-intro">
            Abra o link completo de recuperação que a equipe enviou.
          </p>
        ) : (
          <form
            className="ep-form"
            onSubmit={e => {
              e.preventDefault();
              if (password !== confirm)
                return setError("As senhas não são iguais");
              setError("");
              mutation.mutate({ token, password });
            }}
          >
            <p className="ep-auth-intro">
              Use pelo menos 10 caracteres, com letras e números.
            </p>
            <label>
              Nova senha
              <input
                autoComplete="new-password"
                type="password"
                required
                minLength={10}
                maxLength={200}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </label>
            <label>
              Repita a senha
              <input
                autoComplete="new-password"
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="ep-form-error">
                {error}
              </p>
            )}
            <button className="ep-btn ep-btn-primary" disabled={mutation.isPending}>
              Salvar nova senha
            </button>
          </form>
        )}
      </AuthCard>
    </>
  );
}
