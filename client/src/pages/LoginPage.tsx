import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AuthCard } from "@/components/PublicShell";
import Seo from "@/components/Seo";
export default function LoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [totpCode, setTotpCode] = useState("");
  const requested = new URLSearchParams(window.location.search).get("returnTo");
  const safeReturn =
    requested && /^\/(admin|titular|conta|cliente)(\?|$)/.test(requested)
      ? requested
      : null;
  const login = trpc.auth.login.useMutation({
    onSuccess: ({ user, mustChangePassword }) => {
      const target =
        safeReturn ||
        (user.isAdmin
          ? "/admin"
          : "/titular");
      navigate(
        mustChangePassword
          ? `/alterar-senha?returnTo=${encodeURIComponent(target)}`
          : target
      );
      window.location.reload();
    },
  });
  const needsCode =
    Boolean(login.error?.message.includes("duas etapas")) || totpCode.length > 0;
  return (
    <>
      <Seo title="Entrar — Ero Models" description="Acesse sua conta na Ero Models." noindex />
      <AuthCard
        eyebrow="Entrar"
        title="Acesse sua conta"
        footer={
          <>
            <p>
              Ainda não tem conta? <Link href="/cadastro">Criar meu perfil</Link>
            </p>
            <p>
              Esqueceu a senha? <Link href="/contato">Fale com a gente</Link> e
              escolha &ldquo;Recuperar senha&rdquo;.
            </p>
          </>
        }
      >
        <form
          className="ep-form"
          onSubmit={e => {
            e.preventDefault();
            login.mutate({ email, password, totpCode: totpCode || undefined });
          }}
        >
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>
          {needsCode && (
            <label>
              Código do aplicativo autenticador
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          )}
          {login.error && (
            <p role="alert" className="ep-form-error">
              {login.error.message}
            </p>
          )}
          <button className="ep-btn ep-btn-primary" disabled={login.isPending}>
            {login.isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </AuthCard>
    </>
  );
}
