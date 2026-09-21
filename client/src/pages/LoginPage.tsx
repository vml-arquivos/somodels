import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import StudioHeader from "@/components/StudioHeader";
import Seo from "@/components/Seo";
export default function LoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const requested = new URLSearchParams(window.location.search).get("returnTo");
  const safeReturn =
    requested && /^\/(admin|titular)(\?|$)/.test(requested) ? requested : null;
  const login = trpc.auth.login.useMutation({
    onSuccess: ({ user, mustChangePassword }) => {
      const target =
        safeReturn ||
        (["dev", "admin", "super_admin"].includes(user.role)
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
  return (
    <div className="studio">
      <Seo title="Entrar — Ero Models" description="Acesso privado à conta Ero Models." noindex />
      <StudioHeader />
      <main className="studio-main studio-narrow">
        <section className="studio-panel">
          <p className="studio-kicker">Acesso à sua conta</p>
          <h1>Bem-vindo de volta.</h1>
          <form
            onSubmit={e => {
              e.preventDefault();
              login.mutate({ email, password });
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
            {login.error && (
              <p role="alert" className="studio-error">
                {login.error.message}
              </p>
            )}
            <button className="primary" disabled={login.isPending}>
              {login.isPending ? "Entrando…" : "Entrar"}
            </button>
          </form>
          <p className="studio-muted">
            Esqueceu a senha? Solicite à administração um link temporário de
            recuperação. Não compartilhe sua senha.
          </p>
        </section>
      </main>
    </div>
  );
}
