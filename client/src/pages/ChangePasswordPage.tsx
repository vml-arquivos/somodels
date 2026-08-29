import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada. Faça login novamente.");
      navigate("/login");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (nextPassword !== confirmation) {
      toast.error("A confirmação não coincide com a nova senha.");
      return;
    }
    changePassword.mutate({ currentPassword, nextPassword });
  };

  return <div className="min-h-screen bg-[#100c12] px-4 py-8 text-white"><header className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/"><span className="brand-mark">Só <i>Models</i></span></Link><Link href="/admin"><Button variant="outline" className="border-white/15 bg-transparent text-white"><ArrowLeft className="mr-2 h-4 w-4"/>Painel</Button></Link></header><main className="mx-auto max-w-xl py-16"><Card className="border-white/10 bg-white/5"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><KeyRound className="h-5 w-5 text-[#f3b3d2]"/>Trocar senha temporária</CardTitle></CardHeader><CardContent><p className="mb-6 text-sm leading-6 text-white/55">Defina uma senha exclusiva com pelo menos 16 caracteres, incluindo letras maiúsculas, minúsculas e números.</p><form onSubmit={submit} className="space-y-5"><label className="block text-sm text-white/70">Senha atual<Input type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-2 border-white/10 bg-white/5 text-white"/></label><label className="block text-sm text-white/70">Nova senha<Input type="password" autoComplete="new-password" required minLength={16} value={nextPassword} onChange={event => setNextPassword(event.target.value)} className="mt-2 border-white/10 bg-white/5 text-white"/></label><label className="block text-sm text-white/70">Confirmar nova senha<Input type="password" autoComplete="new-password" required minLength={16} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 border-white/10 bg-white/5 text-white"/></label><Button type="submit" disabled={changePassword.isPending} className="w-full bg-[#f3b3d2] text-[#24131d]">{changePassword.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Salvando…</> : "Salvar nova senha"}</Button></form></CardContent></Card></main></div>;
}
