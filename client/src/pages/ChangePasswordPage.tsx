import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AuthCard } from "@/components/PublicShell";
import Seo from "@/components/Seo";
export default function ChangePasswordPage() {
  const [, navigate] = useLocation();
  const requested = new URLSearchParams(window.location.search).get("returnTo");
  const safeReturn =
    requested && /^\/(admin|titular|conta|cliente)(\?|$)/.test(requested)
      ? requested
      : "/titular";
  const [currentPassword, setCurrentPassword] = useState(""),
    [nextPassword, setNextPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState("");
  const change = trpc.auth.changePassword.useMutation({
    onSuccess: () =>
      navigate(`/login?returnTo=${encodeURIComponent(safeReturn)}`),
    onError: e => setError(e.message),
  });
  return (
    <>
      <Seo
        title="Alterar senha — Ero Models"
        description="Troque a senha da sua conta."
        noindex
      />
      <AuthCard
        title="Alterar senha"
        intro="Use pelo menos 10 caracteres, com letras e números."
      >
        <form
          className="ep-form"
          onSubmit={e => {
            e.preventDefault();
            if (nextPassword !== confirmation)
              return setError("As senhas não são iguais");
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
              minLength={10}
              maxLength={200}
              value={nextPassword}
              onChange={e => setNextPassword(e.target.value)}
            />
          </label>
          <label>
            Repita a nova senha
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
            />
          </label>
          {error && (
            <p className="ep-form-error" role="alert">
              {error}
            </p>
          )}
          <button className="ep-btn ep-btn-primary" disabled={change.isPending}>
            Salvar e entrar de novo
          </button>
        </form>
      </AuthCard>
    </>
  );
}
