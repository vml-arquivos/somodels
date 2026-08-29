import { useState } from "react";
import { Link } from "wouter";
import {
  Check,
  EyeOff,
  Flag,
  LogIn,
  ShieldAlert,
  Star,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const tabs = ["overview", "users", "profiles", "moderation"] as const;
type Tab = (typeof tabs)[number];

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const rolePrivileged = ["admin", "super_admin", "dev"].includes(
    user?.role ?? ""
  );
  const users = trpc.admin.users.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const privileged = rolePrivileged || users.isSuccess;
  const pendingProfiles = trpc.admin.pendingProfiles.useQuery(undefined, {
    enabled: privileged,
  });
  const pendingMedia = trpc.admin.pendingMedia.useQuery(undefined, {
    enabled: privileged,
  });
  const profiles = trpc.admin.profiles.useQuery(undefined, {
    enabled: privileged,
  });
  const detail = trpc.admin.profileDetail.useQuery(
    { id: selectedProfileId ?? 0 },
    { enabled: privileged && Boolean(selectedProfileId) }
  );
  const moderateProfile = trpc.admin.moderateProfile.useMutation({
    onSuccess: () => {
      pendingProfiles.refetch();
      profiles.refetch();
      detail.refetch();
      toast.success("Perfil atualizado e a vitrine foi sincronizada.");
    },
    onError: error => toast.error(error.message),
  });
  const moderateMedia = trpc.admin.moderateMedia.useMutation({
    onSuccess: () => {
      pendingMedia.refetch();
      detail.refetch();
      toast.success("Mídia atualizada.");
    },
    onError: error => toast.error(error.message),
  });

  if (loading)
    return (
      <div className="min-h-screen bg-[#222222] p-8 text-white/60">
        Verificando acesso…
      </div>
    );
  if (!user)
    return (
      <div className="min-h-screen bg-[#222222] p-8 text-white">
        <Link href="/">
          <span className="brand-mark">
            Só <i>Models</i>
          </span>
        </Link>
        <div className="mx-auto mt-24 max-w-lg text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#ff4764]" />
          <h1 className="mt-5 font-display text-4xl">
            Entre na área administrativa
          </h1>
          <p className="mt-3 text-white/55">
            Use sua conta developer autorizada para acessar o painel.
          </p>
          <Link href="/login?returnTo=/admin">
            <Button className="mt-6 bg-[#ff4764] text-[#222222]">
              <LogIn className="mr-2 h-4 w-4" />
              Entrar como administrador
            </Button>
          </Link>
        </div>
      </div>
    );
  if (!privileged)
    return (
      <div className="min-h-screen bg-[#222222] p-8 text-white">
        <Link href="/">
          <span className="brand-mark">
            Só <i>Models</i>
          </span>
        </Link>
        <div className="mx-auto mt-24 max-w-lg text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#ff4764]" />
          <h1 className="mt-5 font-display text-4xl">
            Esta conta não possui acesso administrativo
          </h1>
          <p className="mt-3 text-white/55">
            Entre com a conta developer autorizada para revisar usuários, perfis
            e mídias.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login?returnTo=/admin">
              <Button className="bg-[#ff4764] text-[#222222]">
                Entrar com outra conta
              </Button>
            </Link>
            <Link href="/titular">
              <Button
                variant="outline"
                className="border-white/15 bg-transparent text-white"
              >
                Ir para meu painel
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );

  const moderate = (
    id: number,
    status: "approved" | "rejected" | "suspended" | "pending",
    isFeatured = false
  ) =>
    moderateProfile.mutate({
      id,
      status,
      isFeatured,
      rejectionReason: status === "rejected" ? rejectionReason : undefined,
    });
  return (
    <div className="min-h-screen bg-[#222222] text-white">
      <header className="border-b border-white/10">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/">
            <span className="brand-mark">
              Só <i>Models</i>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge className="bg-[#ff4764] text-[#222222]">Administração</Badge>
            <span className="hidden text-sm text-white/50 md:inline">
              {user.email} · {user.role}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => logout()}
              className="border-white/15 bg-transparent text-white"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Painel developer</p>
            <h1 className="font-display text-5xl">Operação e moderação.</h1>
            <p className="mt-4 max-w-2xl text-white/55">
              Gerencie contas, anunciantes, perfis e mídia. Toda alteração é
              validada no backend e registrada para auditoria.
            </p>
          </div>
          <Link href="/">
            <Button
              variant="outline"
              className="border-white/15 bg-transparent text-white"
            >
              Ver vitrine
            </Button>
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {tabs.map(value => (
            <Button
              type="button"
              key={value}
              onClick={() => setTab(value)}
              variant={tab === value ? "default" : "outline"}
              className={
                tab === value
                  ? "bg-[#ff4764] text-[#222222]"
                  : "border-white/15 bg-transparent text-white"
              }
            >
              {value === "overview"
                ? "Visão geral"
                : value === "users"
                  ? "Usuários"
                  : value === "profiles"
                    ? "Perfis"
                    : "Moderação"}
            </Button>
          ))}
        </div>
        {tab === "overview" ? (
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[.16em] text-white/45">
                  Usuários
                </p>
                <p className="mt-3 font-display text-4xl">
                  {users.data?.length ?? 0}
                </p>
                <p className="mt-2 text-sm text-white/45">contas cadastradas</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[.16em] text-white/45">
                  Perfis
                </p>
                <p className="mt-3 font-display text-4xl">
                  {profiles.data?.length ?? 0}
                </p>
                <p className="mt-2 text-sm text-white/45">
                  rascunhos e publicados
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[.16em] text-white/45">
                  Fila de perfis
                </p>
                <p className="mt-3 font-display text-4xl">
                  {pendingProfiles.data?.length ?? 0}
                </p>
                <p className="mt-2 text-sm text-white/45">aguardando decisão</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[.16em] text-white/45">
                  Fila de mídia
                </p>
                <p className="mt-3 font-display text-4xl">
                  {pendingMedia.data?.length ?? 0}
                </p>
                <p className="mt-2 text-sm text-white/45">fotos e vídeos</p>
              </CardContent>
            </Card>
            <Card className="mt-3 border-[#ff4764]/20 bg-[#ff4764]/10 md:col-span-4">
              <CardContent className="flex items-start gap-3 p-5">
                <Flag className="mt-1 h-5 w-5 text-[#ff4764]" />
                <div>
                  <h2 className="font-semibold">Moderação ativa</h2>
                  <p className="mt-1 text-sm leading-6 text-white/60">
                    Revise cuidadosamente perfis e mídias antes da publicação.
                    Ações administrativas permanecem registradas para auditoria.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
        {tab === "users" ? (
          <Card className="mt-8 border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-[#ff4764]" />
                Usuários e contas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {users.data?.length ? (
                users.data.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-4"
                  >
                    <div>
                      <p className="font-medium">{item.name || "Sem nome"}</p>
                      <p className="text-sm text-white/45">
                        {item.email || "E-mail não informado"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="border-white/15 text-white/65"
                      >
                        {item.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-white/15 text-white/65"
                      >
                        {item.accountStatus}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-inline">Nenhum usuário encontrado.</p>
              )}
            </CardContent>
          </Card>
        ) : null}
        {tab === "profiles" ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-white">Todos os perfis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {profiles.data?.length ? (
                  profiles.data.map(profile => (
                    <button
                      type="button"
                      key={profile.id}
                      onClick={() => setSelectedProfileId(profile.id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${selectedProfileId === profile.id ? "border-[#ff4764] bg-[#ff4764]/10" : "border-white/10 bg-black/10"}`}
                    >
                      <div>
                        <p className="font-medium">{profile.stageName}</p>
                        <p className="text-sm text-white/45">
                          {profile.city} · {profile.status}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-white/15 text-white/65"
                      >
                        {profile.status}
                      </Badge>
                    </button>
                  ))
                ) : (
                  <p className="empty-inline">Nenhum perfil encontrado.</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-white">Detalhes do perfil</CardTitle>
              </CardHeader>
              <CardContent>
                {detail.data ? (
                  <div>
                    <p className="font-display text-3xl">
                      {detail.data.profile.stageName}
                    </p>
                    <p className="mt-2 text-sm text-white/50">
                      {detail.data.profile.city} · {detail.data.profile.slug}
                    </p>
                    <p className="mt-4 text-sm leading-6 text-white/65">
                      {detail.data.profile.description || "Sem bio"}
                    </p>
                    <p className="mt-4 text-xs uppercase tracking-[.14em] text-white/40">
                      Mídias: {detail.data.media.length}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          moderate(detail.data!.profile.id, "approved")
                        }
                        className="bg-[#ff4764] text-[#222222]"
                      >
                        Publicar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          moderate(detail.data!.profile.id, "suspended")
                        }
                        className="border-white/15 bg-transparent text-white"
                      >
                        Suspender
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="empty-inline">
                    Selecione um perfil para abrir os detalhes.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
        {tab === "moderation" ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  Perfis pendentes{" "}
                  <Badge
                    variant="outline"
                    className="border-white/15 text-white/60"
                  >
                    {pendingProfiles.data?.length ?? 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingProfiles.data?.length ? (
                  pendingProfiles.data.map(profile => (
                    <div
                      key={profile.id}
                      className="rounded-xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{profile.stageName}</h3>
                          <p className="text-sm text-white/45">
                            {profile.city} · /perfil/{profile.slug}
                          </p>
                        </div>
                        <Flag className="h-4 w-4 text-[#ff4764]" />
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-white/60">
                        {profile.description || "Sem descrição"}
                      </p>
                      <Input
                        value={rejectionReason}
                        onChange={event =>
                          setRejectionReason(event.target.value)
                        }
                        placeholder="Motivo de rejeição (se necessário)"
                        className="mt-4 border-white/10 bg-white/5 text-white"
                      />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => moderate(profile.id, "approved")}
                          className="bg-[#ff4764] text-[#222222]"
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(profile.id, "rejected")}
                          className="border-white/15 bg-transparent text-white"
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(profile.id, "suspended")}
                          className="border-white/15 bg-transparent text-white"
                        >
                          <EyeOff className="mr-1 h-3.5 w-3.5" />
                          Suspender
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(profile.id, "approved", true)}
                          className="border-[#ff4764]/30 bg-transparent text-[#ff9a8e]"
                        >
                          <Star className="mr-1 h-3.5 w-3.5" />
                          Destacar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-inline">
                    Nenhum perfil pendente de revisão.
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  Mídias pendentes{" "}
                  <Badge
                    variant="outline"
                    className="border-white/15 text-white/60"
                  >
                    {pendingMedia.data?.length ?? 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingMedia.data?.length ? (
                  pendingMedia.data.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {item.title || item.kind}
                          </h3>
                          <p className="text-sm text-white/45">
                            {item.mimeType} ·{" "}
                            {item.isPremium ? "premium" : "público"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-white/15 text-white/60"
                        >
                          {item.kind}
                        </Badge>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            moderateMedia.mutate({
                              id: item.id,
                              status: "approved",
                            })
                          }
                          className="bg-[#ff4764] text-[#222222]"
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            moderateMedia.mutate({
                              id: item.id,
                              status: "rejected",
                            })
                          }
                          className="border-white/15 bg-transparent text-white"
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-inline">
                    Nenhuma mídia pendente de revisão.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}
