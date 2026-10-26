import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";

const topics = [
  ["support", "Suporte"],
  ["password", "Recuperar senha"],
  ["privacy", "Privacidade e dados pessoais"],
  ["report", "Denúncia ou remoção de conteúdo"],
  ["other", "Outro assunto"],
] as const;

export default function ContactForm({
  defaultTopic = "support",
}: {
  defaultTopic?: (typeof topics)[number][0];
}) {
  const [name, setName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [topic, setTopic] = useState<(typeof topics)[number][0]>(defaultTopic);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sent, setSent] = useState(false);
  const send = trpc.contact.send.useMutation({
    onSuccess: () => {
      setSent(true);
      setMessage("");
    },
  });

  if (sent) {
    return (
      <section className="ep-box" aria-live="polite">
        <h2>Mensagem enviada</h2>
        <p>
          Recebemos seu contato. Se você deixou um e-mail ou telefone para
          resposta, nossa equipe retorna por ele.
        </p>
        <button type="button" className="ep-btn ep-btn-ghost" onClick={() => setSent(false)}>
          Enviar outra mensagem
        </button>
      </section>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate({ name, replyTo, topic, message, website });
  };

  return (
    <section className="ep-box" aria-label="Fale conosco">
      <h2>Fale conosco</h2>
      <p className="ep-auth-intro">
        Não envie senhas, documentos ou códigos. Para receber a resposta,
        informe um e-mail ou telefone.
      </p>
      <form onSubmit={submit} className="ep-form">
        <label>
          Assunto
          <select
            value={topic}
            onChange={event => setTopic(event.target.value as typeof topic)}
          >
            {topics.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seu nome
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={120}
            required
            autoComplete="name"
          />
        </label>
        <label>
          E-mail ou telefone para resposta
          <input
            value={replyTo}
            onChange={event => setReplyTo(event.target.value)}
            maxLength={200}
            autoComplete="email"
          />
        </label>
        <label>
          Mensagem
          <textarea
            value={message}
            onChange={event => setMessage(event.target.value)}
            rows={6}
            maxLength={3000}
            required
          />
        </label>
        <label className="studio-contact-trap" aria-hidden="true">
          Não preencha este campo
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={event => setWebsite(event.target.value)}
          />
        </label>
        {send.error && (
          <p role="alert" className="ep-form-error">
            {send.error.message}
          </p>
        )}
        <button className="ep-btn ep-btn-primary" type="submit" disabled={send.isPending}>
          {send.isPending ? "Enviando…" : "Enviar mensagem"}
        </button>
      </form>
    </section>
  );
}
