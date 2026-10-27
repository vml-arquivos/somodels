import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  brazilianStates,
  formatCep,
  formatCpf,
  formatPhone,
  ownerPersonalSchema,
  ownerPersonalUpdateSchema,
} from "@shared/owner-account";
import VerificationCard from "./Verification";
import {
  Badge,
  Card,
  ErrorBlock,
  LoadingBlock,
  OIcon,
  PageHead,
  fmtDateTime,
} from "./ui";

function PersonalForm() {
  const utils = trpc.useUtils();
  const personal = trpc.owner.personal.useQuery();
  const save = trpc.owner.savePersonal.useMutation({
    onSuccess: async () => {
      toast.success("Dados pessoais salvos");
      setChangeCpf(false);
      await Promise.all([
        utils.owner.personal.invalidate(),
        utils.owner.overview.invalidate(),
        utils.owner.contract.invalidate(),
        utils.profiles.publicationReadiness.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const [form, setForm] = useState({
    fullName: "",
    cpf: "",
    birthDate: "",
    phone: "",
    zipCode: "",
    city: "",
    state: "",
  });
  const [changeCpf, setChangeCpf] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const data = personal.data?.data;
  const locked = Boolean(personal.data?.locked);

  useEffect(() => {
    if (!personal.data) return;
    const d = personal.data.data;
    if (d)
      setForm({
        fullName: d.fullName,
        cpf: "",
        birthDate: d.birthDate,
        phone: formatPhone(d.phone),
        zipCode: formatCep(d.zipCode),
        city: d.city,
        state: d.state,
      });
  }, [personal.data]);

  if (personal.isLoading) return <LoadingBlock />;
  if (personal.error) return <ErrorBlock message={personal.error.message} />;

  const set = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const schema = data ? ownerPersonalUpdateSchema : ownerPersonalSchema;
    const payload = {
      ...form,
      cpf: data && !changeCpf ? "" : form.cpf,
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        next[String(issue.path[0])] ||= issue.message;
      setErrors(next);
      toast.error("Confira os campos destacados");
      return;
    }
    save.mutate({
      fullName: form.fullName.trim(),
      cpf: data && !changeCpf ? undefined : form.cpf,
      birthDate: form.birthDate,
      phone: form.phone,
      zipCode: form.zipCode,
      city: form.city.trim(),
      state: form.state,
    });
  }

  const field = (key: keyof typeof errors) =>
    errors[key] ? (
      <small className="od-field-error" role="alert">
        {errors[key]}
      </small>
    ) : null;

  return (
    <Card
      kicker="Dados do titular"
      title="Seus dados pessoais"
      action={
        data ? (
          <Badge tone="ok">Preenchido</Badge>
        ) : (
          <Badge tone="warn">Pendente</Badge>
        )
      }
    >
      <div className="od-note">
        <OIcon name="lock" size={18} />
        <p>
          Estes são os seus dados reais, como constam no documento. Ficam
          guardados com segurança, <strong>nunca aparecem no anúncio</strong> e
          servem para o contrato e para a verificação. O nome e a idade do
          anúncio você escolhe livremente em cada anúncio.
        </p>
      </div>
      {locked && (
        <p className="od-muted">
          Sua identidade foi verificada, por isso nome, CPF e nascimento estão
          bloqueados. Para corrigir algo, fale com o suporte.
        </p>
      )}
      <form className="od-form" onSubmit={submit} noValidate>
        <label className="is-wide">
          Nome completo (igual ao documento)
          <input
            value={form.fullName}
            onChange={event => set("fullName", event.target.value)}
            autoComplete="name"
            disabled={locked}
            aria-invalid={Boolean(errors.fullName)}
          />
          {field("fullName")}
        </label>
        <label>
          CPF
          {data && !changeCpf ? (
            <span className="od-inline">
              <input value={data.cpfMasked} readOnly aria-readonly="true" />
              {!locked && (
                <button
                  type="button"
                  className="od-btn"
                  onClick={() => setChangeCpf(true)}
                >
                  Alterar
                </button>
              )}
            </span>
          ) : (
            <input
              value={form.cpf}
              onChange={event => set("cpf", formatCpf(event.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
              autoComplete="off"
              disabled={locked}
              aria-invalid={Boolean(errors.cpf)}
            />
          )}
          {field("cpf")}
        </label>
        <label>
          Data de nascimento
          <input
            type="date"
            value={form.birthDate}
            onChange={event => set("birthDate", event.target.value)}
            autoComplete="bday"
            disabled={locked}
            aria-invalid={Boolean(errors.birthDate)}
          />
          {field("birthDate")}
        </label>
        <label>
          Telefone (opcional)
          <input
            value={form.phone}
            onChange={event => set("phone", formatPhone(event.target.value))}
            inputMode="tel"
            placeholder="(61) 99999-9999"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
          />
          {field("phone")}
        </label>
        <label>
          CEP (opcional)
          <input
            value={form.zipCode}
            onChange={event => set("zipCode", formatCep(event.target.value))}
            inputMode="numeric"
            placeholder="00000-000"
            autoComplete="postal-code"
            aria-invalid={Boolean(errors.zipCode)}
          />
          {field("zipCode")}
        </label>
        <label>
          Cidade (opcional)
          <input
            value={form.city}
            onChange={event => set("city", event.target.value)}
            autoComplete="address-level2"
          />
        </label>
        <label>
          Estado (opcional)
          <select
            value={form.state}
            onChange={event => set("state", event.target.value)}
          >
            <option value="">Selecione</option>
            {brazilianStates.map(uf => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
        <div className="od-form-actions is-wide">
          <button
            type="submit"
            className="od-btn is-primary"
            disabled={save.isPending}
          >
            {save.isPending ? "Salvando…" : "Salvar dados pessoais"}
          </button>
          {data && (
            <small className="od-muted">
              Última atualização: {fmtDateTime(data.updatedAt)}
            </small>
          )}
        </div>
      </form>
    </Card>
  );
}

function AccountForm({ user }: { user: any }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(user?.name || "");
  useEffect(() => setName(user?.name || ""), [user?.name]);
  const update = trpc.auth.updateAccount.useMutation({
    onSuccess: async () => {
      toast.success("Dados da conta atualizados");
      await utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  return (
    <Card kicker="Acesso" title="Dados da conta">
      <form
        className="od-form"
        onSubmit={event => {
          event.preventDefault();
          update.mutate({ name });
        }}
      >
        <label>
          Nome de exibição
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            autoComplete="nickname"
          />
          <small className="od-muted">
            Só você vê este nome no painel. Não é o nome do anúncio.
          </small>
        </label>
        <label>
          E-mail de acesso
          <input value={user?.email || "—"} readOnly aria-readonly="true" />
        </label>
        <div className="od-form-actions is-wide">
          <button
            type="submit"
            className="od-btn is-primary"
            disabled={update.isPending || name.trim().length < 2}
          >
            {update.isPending ? "Salvando…" : "Salvar"}
          </button>
          <Link
            className="od-btn"
            href="/alterar-senha?returnTo=/titular/dados"
          >
            <OIcon name="lock" size={16} /> Alterar senha
          </Link>
        </div>
      </form>
    </Card>
  );
}

export default function Personal({ user }: { user: any }) {
  return (
    <>
      <PageHead
        title="Dados pessoais e conta"
        subtitle="Seus dados reais ficam aqui, separados dos anúncios. Nos anúncios você usa o nome e a idade que quiser."
      />
      <div className="od-stack">
        <PersonalForm />
        <AccountForm user={user} />
        <VerificationCard />
        <Card kicker="Privacidade" title="Dados e encerramento da conta">
          <p className="od-muted">
            Veja como tratamos seus dados, peça cópia ou encerre a conta.
          </p>
          <div className="od-form-actions">
            <Link className="od-btn" href="/privacidade">
              Privacidade e dados
            </Link>
            <Link className="od-btn" href="/conta">
              Encerrar conta
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
