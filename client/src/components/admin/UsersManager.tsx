import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  adminFunctionKeys,
  adminFunctions,
  isAdminFunction,
  type AdminFunction,
} from "@shared/admin-access";

type Group = "clients" | "owners" | "admins";
type Role = "user" | "admin" | "super_admin" | "dev";

const groups: { key: Group; label: string; hint: string; newLabel: string }[] = [
  {
    key: "clients",
    label: "Clientes",
    hint: "Contas de visitantes que ainda não têm anúncio",
    newLabel: "Nova conta de cliente",
  },
  {
    key: "owners",
    label: "Titulares",
    hint: "Quem tem anúncio na plataforma",
    newLabel: "Nova conta de titular",
  },
  {
    key: "admins",
    label: "Administradores",
    hint: "Equipe com acesso ao painel",
    newLabel: "Novo administrador",
  },
];

const accessLevels: Record<string, { label: string; text: string }> = {
  user: {
    label: "Conta comum",
    text: "Acessa apenas a própria conta. Titulares gerenciam os próprios anúncios.",
  },
  admin: {
    label: "Administrador",
    text: "Equipe do painel. O que a pessoa vê e pode fazer depende da função escolhida abaixo.",
  },
  super_admin: {
    label: "Super administrador",
    text: "Tudo do administrador, e também cria e gerencia administradores.",
  },
  dev: {
    label: "Desenvolvedor",
    text: "Acesso técnico total. Este nível não pode ser alterado pelo painel.",
  },
};

// Nome do nível mostrado nas listas e no detalhe (inclui a função da equipe).
function accessLabel(role: string, fn?: string | null) {
  if (role === "admin" && isAdminFunction(fn)) return adminFunctions[fn].label;
  if (role === "admin") return "Acesso completo";
  return accessLevels[role]?.label ?? role;
}

const dateTime = (value: unknown) =>
  value ? new Date(value as string).toLocaleString("pt-BR") : "—";

function relative(value: unknown) {
  if (!value) return "nunca";
  const diff = Date.now() - new Date(value as string).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} dia${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  return `há ${months} ${months === 1 ? "mês" : "meses"}`;
}

function initials(name?: string | null, email?: string | null) {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : base.slice(0, 2);
  return letters.toUpperCase();
}

function hue(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return hash;
}

function Avatar({ name, email, size = 40 }: { name?: string | null; email?: string | null; size?: number }) {
  const seed = `${name ?? ""}${email ?? ""}`;
  return (
    <span
      className="um-avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `hsl(${hue(seed)} 45% 38%)`,
      }}
    >
      {initials(name, email)}
    </span>
  );
}

const strongPasswordHint = "16 caracteres, com maiúscula, minúscula e número.";

export default function UsersManager({
  actor,
  onOpenProfile,
  canWrite = true,
  canDelete = true,
  lockGroup,
}: {
  actor: { id: number; role: string };
  onOpenProfile: (profileId: number) => void;
  canWrite?: boolean;
  canDelete?: boolean;
  /** Mostra só um tipo de conta (Clientes ou Equipe), sem as abas de troca. */
  lockGroup?: Group;
}) {
  const utils = trpc.useUtils();
  const canManageAdmins = canWrite && ["dev", "super_admin"].includes(actor.role);
  const [group, setGroup] = useState<Group>(lockGroup ?? "owners");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as Role,
    adminFunction: "" as "" | AdminFunction,
    accountStatus: "active" as "active" | "suspended",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const summary = trpc.management.userSummary.useQuery();
  const list = trpc.management.users.useQuery({
    page,
    search: debounced,
    status,
    kind: group,
  });
  const detail = trpc.management.userDetail.useQuery(
    { id: selected || 0 },
    { enabled: !!selected }
  );

  useEffect(() => {
    if (detail.data) {
      const user = detail.data.user;
      setForm({
        name: user.name || "",
        email: user.email || "",
        password: "",
        role: user.role as Role,
        adminFunction: isAdminFunction(user.adminFunction) ? user.adminFunction : "",
        accountStatus: user.accountStatus,
      });
      setConfirmText("");
      setResetUrl("");
    }
  }, [detail.data]);

  const refresh = async () => {
    await Promise.all([
      utils.management.users.invalidate(),
      utils.management.userSummary.invalidate(),
      utils.management.userDetail.invalidate(),
    ]);
  };
  const fail = (error: { message: string }) => toast.error(error.message);

  const update = trpc.management.updateUser.useMutation({
    onSuccess: async () => {
      toast.success("Conta atualizada. As sessões dela foram encerradas.");
      await refresh();
    },
    onError: fail,
  });
  const create = trpc.management.createUser.useMutation({
    onSuccess: async result => {
      toast.success("Conta criada. A pessoa precisará trocar a senha no primeiro acesso.");
      setCreating(false);
      setSelected(result.id);
      await refresh();
    },
    onError: fail,
  });
  const reset = trpc.management.resetLink.useMutation({
    onSuccess: result => {
      setResetUrl(result.url);
      toast.success("Link de uso único gerado, válido por 30 minutos.");
    },
    onError: fail,
  });
  const remove = trpc.management.anonymizeUser.useMutation({
    onSuccess: async () => {
      toast.success("Conta anonimizada e acesso encerrado.");
      setSelected(null);
      await refresh();
    },
    onError: fail,
  });

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));
  const currentGroup = groups.find(item => item.key === group)!;
  const user = detail.data?.user;
  const editable = canWrite && Boolean(detail.data?.editable);
  const showDetail = creating || Boolean(selected);

  const counts: Record<Group, number | undefined> = {
    clients: summary.data?.clients,
    owners: summary.data?.owners,
    admins: summary.data?.admins,
  };

  const roleOptions = useMemo(() => {
    if (group !== "admins") return ["user"] as Role[];
    const options: Role[] = ["admin"];
    if (actor.role === "dev") options.push("super_admin");
    return options;
  }, [group, actor.role]);

  function pickGroup(next: Group) {
    setGroup(next);
    setPage(0);
    setSelected(null);
    setCreating(false);
  }

  function startCreate() {
    setCreating(true);
    setSelected(null);
    setResetUrl("");
    setForm({
      name: "",
      email: "",
      password: "",
      role: group === "admins" ? "admin" : "user",
      adminFunction: "",
      accountStatus: "active",
    });
  }

  function save() {
    if (creating) {
      create.mutate({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role as "user" | "admin" | "super_admin",
        adminFunction: form.role === "admin" && form.adminFunction ? form.adminFunction : null,
      });
    } else if (selected) {
      update.mutate({
        id: selected,
        name: form.name,
        email: form.email,
        role: form.role as "user" | "admin" | "super_admin",
        adminFunction: form.role === "admin" && form.adminFunction ? form.adminFunction : null,
        accountStatus: form.accountStatus,
      });
    }
  }

  function toggleSuspension() {
    if (!selected || !user) return;
    update.mutate({
      id: selected,
      name: user.name || form.name,
      email: user.email || form.email,
      role: user.role as "user" | "admin" | "super_admin",
      // undefined = o servidor mantém a função atual
      adminFunction: undefined,
      accountStatus: user.accountStatus === "active" ? "suspended" : "active",
    });
  }

  const roleInfo = user ? accessLevels[user.role] : undefined;

  return (
    <div className="um">
      <header className="um-head">
        <div>
          <p className="studio-kicker">
            {lockGroup === "admins"
              ? "Equipe"
              : lockGroup === "clients"
                ? "Clientes"
                : "Pessoas e acessos"}
          </p>
          <h2>
            {lockGroup === "admins"
              ? "Equipe administrativa"
              : lockGroup === "clients"
                ? "Contas de clientes"
                : "Contas da plataforma"}
          </h2>
          <p className="studio-muted">
            {lockGroup === "admins"
              ? "Quem administra a plataforma e o que cada função pode fazer."
              : lockGroup === "clients"
                ? "Pessoas que só navegam. Anunciantes ficam na área Anunciantes."
                : "Clientes, titulares e administradores ficam em áreas separadas."}
          </p>
        </div>
        {summary.data && summary.data.suspended > 0 && (
          <button
            type="button"
            className="um-chip um-chip-warn"
            onClick={() => {
              setStatus("suspended");
              setPage(0);
            }}
          >
            {summary.data.suspended} conta(s) suspensa(s)
          </button>
        )}
      </header>

      {!lockGroup && (
      <div
        className="um-groups"
        role="tablist"
        aria-label="Tipo de conta"
      >
        {groups.map(item => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={group === item.key}
            className={`um-group ${group === item.key ? "is-active" : ""}`}
            onClick={() => pickGroup(item.key)}
          >
            <span className="um-group-count">
              {counts[item.key] === undefined ? "…" : counts[item.key]}
            </span>
            <span className="um-group-label">{item.label}</span>
            <span className="um-group-hint">{item.hint}</span>
          </button>
        ))}
      </div>
      )}

      <div className={`um-body ${showDetail ? "has-detail" : ""}`}>
        <section className="um-list" aria-label={currentGroup.label}>
          <div className="um-toolbar">
            <input
              type="search"
              aria-label="Buscar por nome ou e-mail"
              placeholder="Buscar nome ou e-mail"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            <select
              aria-label="Situação da conta"
              value={status}
              onChange={event => {
                setStatus(event.target.value as typeof status);
                setPage(0);
              }}
            >
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="suspended">Suspensas</option>
            </select>
          </div>
          {canWrite && (group !== "admins" || canManageAdmins) && (
            <button type="button" className="primary um-new" onClick={startCreate}>
              + {currentGroup.newLabel}
            </button>
          )}

          {list.error && (
            <p role="alert" className="studio-error">
              {list.error.message}
            </p>
          )}
          {list.isLoading ? (
            <div className="um-skeleton" aria-busy="true">
              {[0, 1, 2, 3].map(index => (
                <span key={index} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="um-empty">
              <strong>Nenhuma conta encontrada</strong>
              <p>
                {debounced || status !== "all"
                  ? "Tente outra busca ou limpe os filtros."
                  : group === "clients"
                    ? "Os clientes aparecem aqui quando criarem uma conta no site."
                    : group === "owners"
                      ? "Os titulares aparecem aqui quando criarem um anúncio."
                      : "Nenhum administrador além de você."}
              </p>
              {(debounced || status !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatus("all");
                  }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <ul className="um-rows">
              {items.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`um-row ${selected === item.id ? "is-selected" : ""}`}
                    aria-current={selected === item.id ? "true" : undefined}
                    onClick={() => {
                      setSelected(item.id);
                      setCreating(false);
                    }}
                  >
                    <Avatar name={item.name} email={item.email} />
                    <span className="um-row-main">
                      <strong>{item.name || "Sem nome"}</strong>
                      <small>{item.email || "Sem e-mail"}</small>
                    </span>
                    <span className="um-row-side">
                      {item.accountStatus === "suspended" && (
                        <span className="um-badge um-badge-warn">Suspensa</span>
                      )}
                      {group === "owners" && (
                        <span className="um-badge">
                          {item.profilesCount} anúncio{item.profilesCount === 1 ? "" : "s"}
                        </span>
                      )}
                      {group === "admins" && (
                        <span className="um-badge um-badge-accent">
                          {accessLabel(item.role, item.adminFunction)}
                        </span>
                      )}
                      <small>{relative(item.lastSignedIn)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {total > 25 && (
            <div className="um-pager">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Anterior
              </button>
              <span>
                Página {page + 1} de {pages} · {total} contas
              </span>
              <button
                type="button"
                disabled={page + 1 >= pages}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </button>
            </div>
          )}
          {total > 0 && total <= 25 && (
            <p className="um-count">
              {total} conta{total === 1 ? "" : "s"}
            </p>
          )}
        </section>

        <section className="um-detail" aria-live="polite">
          {!showDetail ? (
            <div className="um-placeholder">
              <strong>Selecione uma conta</strong>
              <p>Clique em alguém da lista para ver os dados, suspender, gerar link de senha ou ver os anúncios.</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="um-back"
                onClick={() => {
                  setSelected(null);
                  setCreating(false);
                }}
              >
                ← Voltar à lista
              </button>

              {creating ? (
                <header className="um-person">
                  <h3>{currentGroup.newLabel}</h3>
                </header>
              ) : detail.isLoading || !user ? (
                <div className="um-skeleton" aria-busy="true">
                  <span />
                  <span />
                </div>
              ) : (
                <>
                  <header className="um-person">
                    <Avatar name={user.name} email={user.email} size={56} />
                    <div>
                      <h3>{user.name || "Sem nome"}</h3>
                      <p>{user.email || "Sem e-mail"}</p>
                      <div className="um-badges">
                        <span className="um-badge um-badge-accent">
                          {accessLabel(user.role, user.adminFunction)}
                        </span>
                        <span
                          className={`um-badge ${user.accountStatus === "active" ? "um-badge-ok" : "um-badge-warn"}`}
                        >
                          {user.accountStatus === "active" ? "Ativa" : "Suspensa"}
                        </span>
                        {user.emailVerifiedAt ? (
                          <span className="um-badge">E-mail confirmado</span>
                        ) : (
                          <span className="um-badge">E-mail não confirmado</span>
                        )}
                      </div>
                    </div>
                  </header>

                  <dl className="um-stats">
                    <div>
                      <dt>Cadastro</dt>
                      <dd>{dateTime(user.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Último acesso</dt>
                      <dd>{relative(user.lastSignedIn)}</dd>
                    </div>
                    <div>
                      <dt>Anúncios</dt>
                      <dd>{detail.data?.profiles.length ?? 0}</dd>
                    </div>
                  </dl>

                  {!editable && (
                    <p className="um-note">
                      Você pode ver esta conta, mas não alterá-la com o seu nível de acesso.
                    </p>
                  )}

                  <div className="um-actions">
                    <button
                      type="button"
                      disabled={!editable || update.isPending}
                      onClick={toggleSuspension}
                    >
                      {user.accountStatus === "active" ? "Suspender conta" : "Reativar conta"}
                    </button>
                    <button
                      type="button"
                      disabled={!editable || reset.isPending || user.accountStatus !== "active"}
                      onClick={() => reset.mutate({ id: user.id })}
                    >
                      Gerar link de senha
                    </button>
                  </div>

                  {resetUrl && (
                    <div className="um-reset">
                      <p>
                        Link de uso único, válido por 30 minutos. O sistema não envia e-mail:
                        passe o link para a pessoa por um canal seguro.
                      </p>
                      <div>
                        <input aria-label="Link temporário" readOnly value={resetUrl} />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(resetUrl);
                              toast.success("Link copiado");
                            } catch {
                              toast.error("Selecione e copie o link manualmente");
                            }
                          }}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {(creating || user) && (
                <form
                  className="um-form"
                  onSubmit={event => {
                    event.preventDefault();
                    save();
                  }}
                >
                  <h4>Dados da conta</h4>
                  <label>
                    Nome
                    <input
                      value={form.name}
                      onChange={event => setForm(f => ({ ...f, name: event.target.value }))}
                      disabled={!creating && !editable}
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    E-mail
                    <input
                      type="email"
                      value={form.email}
                      onChange={event => setForm(f => ({ ...f, email: event.target.value }))}
                      disabled={!creating && !editable}
                      required
                    />
                  </label>
                  {creating && (
                    <label>
                      Senha temporária
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={16}
                        value={form.password}
                        onChange={event => setForm(f => ({ ...f, password: event.target.value }))}
                        required
                      />
                      <small>{strongPasswordHint} A troca é obrigatória no primeiro acesso.</small>
                    </label>
                  )}

                  {(group === "admins" || (user && user.role !== "user")) && (
                    <fieldset className="um-levels" disabled={!creating && !editable}>
                      <legend>Nível de acesso</legend>
                      {(user?.role === "dev"
                        ? (["dev"] as Role[])
                        : creating
                          ? roleOptions
                          : (["admin", "super_admin"] as Role[]).filter(
                              role => role === "admin" || actor.role === "dev" || form.role === "super_admin"
                            )
                      ).map(role => (
                        <label key={role} className={`um-level ${form.role === role ? "is-on" : ""}`}>
                          <input
                            type="radio"
                            name="role"
                            checked={form.role === role}
                            onChange={() => setForm(f => ({ ...f, role }))}
                          />
                          <span>
                            <strong>{accessLevels[role].label}</strong>
                            <small>{accessLevels[role].text}</small>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  )}

                  {form.role === "admin" &&
                    (group === "admins" || (user && user.role !== "user")) && (
                      <fieldset
                        className="um-levels"
                        disabled={!creating && !(editable && canManageAdmins)}
                      >
                        <legend>Função na equipe</legend>
                        {(["", ...adminFunctionKeys] as const).map(key => (
                          <label
                            key={key || "full"}
                            className={`um-level ${form.adminFunction === key ? "is-on" : ""}`}
                          >
                            <input
                              type="radio"
                              name="adminFunction"
                              checked={form.adminFunction === key}
                              onChange={() => setForm(f => ({ ...f, adminFunction: key }))}
                            />
                            <span>
                              <strong>
                                {key ? adminFunctions[key].label : "Acesso completo"}
                              </strong>
                              <small>
                                {key
                                  ? adminFunctions[key].text
                                  : "Todas as áreas do painel, exceto criar administradores."}
                              </small>
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    )}

                  <div className="um-actions">
                    <button
                      type="submit"
                      className="primary"
                      disabled={
                        create.isPending ||
                        update.isPending ||
                        (!creating && !editable)
                      }
                    >
                      {creating ? "Criar conta" : "Salvar alterações"}
                    </button>
                  </div>
                </form>
              )}

              {!creating && user && detail.data && detail.data.profiles.length > 0 && (
                <div className="um-profiles">
                  <h4>Anúncios vinculados</h4>
                  <ul>
                    {detail.data.profiles.map(profile => (
                      <li key={profile.id}>
                        <button type="button" onClick={() => onOpenProfile(profile.id)}>
                          <strong>{profile.stageName}</strong>
                          <small>
                            {profile.city} · {profile.status}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!creating && user && editable && canDelete && user.role === "user" && (
                <details className="um-danger">
                  <summary>Zona de risco</summary>
                  <p>
                    Remove nome, e-mail e acesso da conta. Os anúncios ficam suspensos; arquivos e
                    histórico são preservados. Não dá para desfazer.
                  </p>
                  <label>
                    Digite EXCLUIR para confirmar
                    <input
                      value={confirmText}
                      onChange={event => setConfirmText(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="danger"
                    disabled={confirmText !== "EXCLUIR" || remove.isPending}
                    onClick={() => remove.mutate({ id: user.id, confirmation: "EXCLUIR" })}
                  >
                    Anonimizar conta e encerrar acesso
                  </button>
                </details>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
