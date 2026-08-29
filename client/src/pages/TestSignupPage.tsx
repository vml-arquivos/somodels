import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { FlaskConical, ArrowRight, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function TestSignupPage() {
  const [, navigate] = useLocation();
  const config = trpc.system.config.useQuery();
  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta de teste criada. Você já pode acessar o painel.");
      navigate("/titular");
    },
    onError: (error) => toast.error(error.message),
  });
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmation: "" });

  if (config.data && !config.data.testMode) {
    return <div className="min-h-screen bg-[#222222] px-6 py-16 text-white"><div className="mx-auto max-w-xl"><p className="eyebrow">Área restrita</p><h1 className="mt-3 font-display text-4xl">Cadastro de teste indisponível</h1><p className="mt-4 text-white/60">Este ambiente não está sinalizado como teste. O cadastro público permanece fechado por padrão.</p><Link href="/"><Button className="mt-7 bg-[#ff4764] text-[#222222]">Voltar para a home</Button></Link></div></div>;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (form.password !== form.confirmation) {
      toast.error("As senhas não coincidem.");
      return;
    }
    register.mutate({ name: form.name, email: form.email, password: form.password });
  };

  return <div className="min-h-screen bg-[#222222] px-6 py-10 text-white md:py-16"><div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><section><Link href="/" className="brand-mark">Só <i>Models</i></Link><p className="eyebrow mt-20">Ambiente de testes</p><h1 className="mt-3 font-display text-5xl leading-[.95]">Crie uma conta fictícia e teste o fluxo.</h1><p className="mt-5 max-w-xl text-lg text-white/60">Este cadastro existe somente para validar telas, perfis, moderação e permissões antes da abertura pública.</p><div className="mt-8 rounded-2xl border border-[#ff4764]/30 bg-[#ff4764]/10 p-5 text-sm leading-6 text-white/70"><ShieldAlert className="mb-3 h-6 w-6 text-[#ff4764]"/><strong className="text-white">Não envie documentos reais.</strong> Use nome, e-mail e senha fictícios. O modo de teste não comprova idade, identidade ou elegibilidade para uso público.</div></section><Card className="border-white/10 bg-white/[.04] shadow-2xl shadow-black/30"><CardHeader><div className="flex items-center gap-3"><div className="rounded-full border border-[#ff4764]/30 bg-[#ff4764]/10 p-3"><FlaskConical className="h-5 w-5 text-[#ff4764]"/></div><div><CardTitle className="text-white">Nova conta de teste</CardTitle><p className="mt-1 text-sm text-white/45">Acesso comum, sem papel administrativo.</p></div></div></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4"><label>Nome de teste<Input required minLength={2} maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Pessoa Teste" className="mt-2 border-white/10 bg-white/5 text-white"/></label><label>E-mail de teste<Input required type="email" maxLength={320} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="teste@exemplo.invalid" className="mt-2 border-white/10 bg-white/5 text-white"/></label><label>Senha<Input required type="password" minLength={16} maxLength={200} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Mínimo de 16 caracteres" className="mt-2 border-white/10 bg-white/5 text-white"/></label><label>Confirmar senha<Input required type="password" minLength={16} maxLength={200} value={form.confirmation} onChange={event => setForm({ ...form, confirmation: event.target.value })} placeholder="Repita a senha" className="mt-2 border-white/10 bg-white/5 text-white"/></label><Button disabled={register.isPending} type="submit" className="mt-2 bg-[#ff4764] text-[#222222] hover:bg-[#ff765f]">{register.isPending ? "Criando…" : "Criar conta de teste"}<ArrowRight className="ml-2 h-4 w-4"/></Button></form><p className="mt-5 text-xs leading-5 text-white/40">Ao criar esta conta, você confirma que está usando dados fictícios para teste técnico. O administrador pode apagar os registros de teste antes da produção.</p></CardContent></Card></div></div>;
}


export default TestSignupPage;
