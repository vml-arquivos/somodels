import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: ({ mustChangePassword }) => {
      toast.success(mustChangePassword ? "Acesso autorizado. Altere sua senha temporária." : "Login realizado.");
      navigate(mustChangePassword ? "/alterar-senha" : "/admin");
      window.location.reload();
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return <div className="min-h-screen bg-[#222222] px-4 py-8 text-white"><header className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/"><span className="brand-mark">Só <i>Models</i></span></Link><Link href="/"><Button variant="outline" className="border-white/15 bg-transparent text-white"><ArrowLeft className="mr-2 h-4 w-4"/>Voltar</Button></Link></header><main className="mx-auto grid max-w-5xl gap-8 py-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><section><p className="eyebrow">Acesso protegido</p><h1 className="font-display text-5xl leading-tight">Entre no painel com segurança.</h1><p className="mt-5 max-w-lg text-white/55">Use o acesso temporário fornecido pelo administrador do ambiente. No primeiro acesso, a troca de senha é obrigatória.</p><div className="mt-8 flex gap-3 text-sm text-white/60"><ShieldCheck className="h-5 w-5 text-[#ff4764]"/>Sessão protegida por cookie HttpOnly e expiração controlada.</div></section><Card className="border-white/10 bg-white/5"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><KeyRound className="h-5 w-5 text-[#ff4764]"/>Login administrativo</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-5"><label className="block text-sm text-white/70">E-mail<Input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} className="mt-2 border-white/10 bg-white/5 text-white"/></label><label className="block text-sm text-white/70">Senha<Input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="mt-2 border-white/10 bg-white/5 text-white"/></label><Button type="submit" disabled={login.isPending} className="w-full bg-[#ff4764] text-[#222222]">{login.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Validando…</> : "Entrar"}</Button></form></CardContent></Card></main></div>;
}
