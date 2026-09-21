import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import StudioHeader from "@/components/StudioHeader";
import Seo from "@/components/Seo";
export default function TestSignupPage() {
  const [, navigate] = useLocation();
  const config = trpc.system.config.useQuery();
  const [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      confirmation: "",
    }),
    [error, setError] = useState("");
  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      navigate("/titular");
      window.location.reload();
    },
    onError: e => setError(e.message),
  });
  const available = !!config.data?.testMode && !!config.data?.allowTestSignup;
  return (
    <div className="studio">
      <Seo title="Cadastro de homologação — Só Models" description="Cadastro privado de ambiente de testes." noindex />
      <StudioHeader />
      <main className="studio-main studio-narrow">
        <section className="studio-panel">
          <h1>
            {available ? "Cadastro de homologação" : "Cadastro indisponível"}
          </h1>
          {config.isLoading ? (
            <p>Verificando disponibilidade…</p>
          ) : !available ? (
            <>
              <p>Solicite uma conta à administração da plataforma.</p>
              <Link href="/login">Já tenho uma conta</Link>
            </>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                if (form.password !== form.confirmation)
                  return setError("As senhas não coincidem");
                setError("");
                register.mutate(form);
              }}
            >
              <p>Este formulário é restrito ao ambiente de testes.</p>
              {(
                [
                  ["name", "Nome", "text"],
                  ["email", "E-mail", "email"],
                  ["password", "Senha", "password"],
                  ["confirmation", "Confirmar senha", "password"],
                ] as const
              ).map(([key, label, type]) => (
                <label key={key}>
                  {label}
                  <input
                    type={type}
                    required
                    minLength={type === "password" ? 16 : 2}
                    maxLength={key === "email" ? 320 : 200}
                    autoComplete={
                      type === "password" ? "new-password" : undefined
                    }
                    value={form[key]}
                    onChange={e =>
                      setForm(f => ({ ...f, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
              {error && (
                <p role="alert" className="studio-error">
                  {error}
                </p>
              )}
              <button className="primary" disabled={register.isPending}>
                Criar conta de teste
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
