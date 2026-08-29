import { Link, useParams } from "wouter";
import { MapPin, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function CityPage() {
  const { city = "" } = useParams<{ city: string }>(); const label = city.split("-").map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(" "); const { data = [], isLoading } = trpc.profiles.list.useQuery({ city: label });
  return <div className="min-h-screen bg-[#100c12] text-white"><header className="border-b border-white/10"><div className="container flex items-center justify-between py-4"><Link href="/"><span className="brand-mark">Só <i>Models</i></span></Link><Link href="/"><Button variant="outline" className="border-white/15 bg-transparent text-white"><ArrowLeft className="mr-2 h-4 w-4"/>Voltar</Button></Link></div></header><main className="container py-12"><p className="eyebrow">Só Models em {label}</p><h1 className="font-display text-5xl">Acompanhantes em {label}</h1><p className="mt-4 text-white/55">Perfis publicados e revisados para descoberta local.</p>{!isLoading && !data.length ? <div className="empty-state mt-10"><h3>Nenhum perfil publicado em {label}</h3><p>Quando houver perfis aprovados nesta cidade, eles aparecerão nesta página.</p></div> : <div className="profile-grid mt-10">{data.map(profile => <Link key={profile.id} href={`/perfil/${profile.slug}`}><Card className="profile-card"><div className="profile-image" style={profile.avatarUrl ? { backgroundImage: `url(${profile.avatarUrl})` } : undefined}><span className="profile-fallback">{profile.stageName.slice(0,1)}</span></div><CardContent className="p-4"><h2 className="text-lg font-semibold">{profile.stageName}</h2><p className="mt-1 text-sm text-white/50"><MapPin className="mr-1 inline h-3.5 w-3.5"/>{profile.city}</p><div className="mt-3 flex gap-1.5">{profile.categories.slice(0,2).map((tag: string) => <Badge key={tag} variant="outline" className="border-white/15 text-white/60">{tag}</Badge>)}</div></CardContent></Card></Link>)}</div>}</main></div>;
}
