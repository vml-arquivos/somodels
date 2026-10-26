import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Seo from "@/components/Seo";
import { AuthCard } from "@/components/PublicShell";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acceptAccountTerms, setAcceptAccountTerms] = useState(false);
  const register = trpc.auth.registerPublic.useMutation({
    onSuccess: () => {
      navigate("/titular");
      window.location.reload();
    },
  });
  const mismatch = confirmation.length > 0 && password !== confirmation;

  return (
    <>
      <Seo
        title="Criar meu perfil — Ero Models"
        description="Crie sua conta na Ero Models e publique seu anúncio."
        noindex
      />
      <AuthCard
        eyebrow="Anuncie"
        title="Crie sua conta"
        intro="Leva um minuto. Depois você monta o perfil com as fotos que quiser e publica."
        footer={
          <p>
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        }
      >
        <form
          className="ep-form"
          onSubmit={event => {
            event.preventDefault();
            if (password !== confirmation) return;
            if (!acceptAccountTerms) return;
            register.mutate({
              name,
              email,
              password,
              acceptAccountTerms: true,
            });
          }}
        >
          <label>
            Seu nome
            <input
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </label>
          <label>
            E-mail
            <input
              required
              type="email"
              autoComplete="email"
              maxLength={320}
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={200}
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
            <small>Pelo menos 10 caracteres, com letras e números.</small>
          </label>
          <label>
            Repita a senha
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={200}
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
            />
          </label>
          <label className="ep-check">
            <input
              type="checkbox"
              checked={acceptAccountTerms}
              onChange={event => setAcceptAccountTerms(event.target.checked)}
            />
            <span>
              Tenho 18 anos ou mais e as fotos e dados que vou enviar são meus
              ou autorizados. Li os <Link href="/termos">Termos de Uso</Link> e
              as <Link href="/seguranca">regras de segurança</Link>.
            </span>
          </label>
          {mismatch && (
            <p role="alert" className="ep-form-error">
              As senhas não são iguais.
            </p>
          )}
          {register.error && (
            <p role="alert" className="ep-form-error">
              {register.error.message}
            </p>
          )}
          <button
            className="ep-btn ep-btn-primary"
            disabled={register.isPending || mismatch || !acceptAccountTerms}
          >
            {register.isPending ? "Criando conta…" : "Criar minha conta"}
          </button>
        </form>
      </AuthCard>
    </>
  );
}
