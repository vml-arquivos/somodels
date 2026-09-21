import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Seo from "@/components/Seo";
import StudioHeader from "@/components/StudioHeader";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const register = trpc.auth.registerPublic.useMutation({
    onSuccess: () => {
      navigate("/titular");
      window.location.reload();
    },
  });
  const mismatch = confirmation.length > 0 && password !== confirmation;

  return (
    <div className="studio">
      <Seo title="Criar conta de titular — Ero Models" description="Crie sua conta para preparar um portfólio profissional." noindex />
      <StudioHeader />
      <main className="studio-main studio-narrow">
        <section className="studio-panel">
          <p className="studio-kicker">Comece seu portfólio</p>
          <h1>Crie sua conta de titular.</h1>
          <p className="studio-muted">
            O cadastro cria uma conta comum. A publicação do portfólio exige revisão, aceite do termo aplicável e os demais gates de segurança.
          </p>
          <form
            onSubmit={event => {
              event.preventDefault();
              if (password !== confirmation) return;
              register.mutate({ name, email, password });
            }}
          >
            <label>
              Nome
              <input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} />
            </label>
            <label>
              E-mail
              <input required type="email" autoComplete="email" maxLength={320} value={email} onChange={event => setEmail(event.target.value)} />
            </label>
            <label>
              Senha
              <input required type="password" autoComplete="new-password" minLength={16} maxLength={200} value={password} onChange={event => setPassword(event.target.value)} />
              <small>Use pelo menos 16 caracteres, com maiúscula, minúscula e número.</small>
            </label>
            <label>
              Confirme a senha
              <input required type="password" autoComplete="new-password" minLength={16} maxLength={200} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
            </label>
            {mismatch && <p role="alert" className="studio-error">As senhas não coincidem.</p>}
            {register.error && <p role="alert" className="studio-error">{register.error.message}</p>}
            <button className="primary" disabled={register.isPending || mismatch}>
              {register.isPending ? "Criando conta…" : "Criar minha conta"}
            </button>
          </form>
          <p className="studio-muted">
            Já possui uma conta? <a href="/login">Entrar</a>
          </p>
        </section>
      </main>
    </div>
  );
}
