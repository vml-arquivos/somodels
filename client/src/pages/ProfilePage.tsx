import { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Flag, Languages, Lock, MapPin, Share2, ShieldCheck } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Seo from "@/components/Seo";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function ProfilePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [activePhoto, setActivePhoto] = useState(0);
  const { data, isLoading } = trpc.profiles.bySlug.useQuery({ slug });
  const { user } = useAuth();
  const premiumIntent = trpc.premium.createIntent.useMutation({
    onError: error => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="min-h-screen bg-[#222222] p-8 text-white/60">Carregando perfil…</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#222222] p-8 text-white">
        <Link href="/">
          <Button variant="outline" className="border-white/15 bg-transparent text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <h1 className="mt-12 font-display text-4xl">Perfil não encontrado</h1>
        <p className="mt-3 text-white/50">O perfil pode estar em rascunho, aguardando moderação ou indisponível nesta homologação.</p>
      </div>
    );
  }

  const { profile, media, related = [] } = data;
  const photos = media.filter(item => item.kind === "photo");
  const videos = media.filter(item => item.kind === "video");
  const demoContactDisabled = Boolean(profile.demoContactDisabled);
  const share = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      toast.success("Link do perfil copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <div className="min-h-screen bg-[#222222] text-white">
      <Seo title={`${profile.stageName} — Só Models`} description={`${profile.stageName} em ${profile.city}. Perfil público no Só Models.`} path={`/perfil/${profile.slug}`} />
      <header className="border-b border-white/10">
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <span className="brand-mark">Só <i>Models</i></span>
          </Link>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={share} className="border-white/15 bg-transparent text-white">
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
            <Link href="/">
              <Button variant="outline" className="border-white/15 bg-transparent text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-10">
        {profile.isDemo ? (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-[#ff4764]/30 bg-[#ff4764]/10 p-5 text-sm leading-6 text-white/70">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#ff4764]" />
            <span><strong className="text-white">Perfil demonstrativo de homologação.</strong> As fotos, informações e contatos são fictícios; não use este conteúdo para decisões reais nem tente contatar terceiros.</span>
          </div>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            {photos.length ? (
              <div className="detail-cover" style={{ backgroundImage: `url(${photos[activePhoto]?.url})` }}>
                <span className="sr-only">Foto de {profile.stageName}</span>
              </div>
            ) : (
              <div className="detail-cover"><span>{profile.stageName.slice(0, 1)}</span></div>
            )}
            {photos.length > 1 ? (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {photos.map((photo, index) => (
                  <button type="button" key={photo.id} onClick={() => setActivePhoto(index)} className={`overflow-hidden rounded-lg border ${activePhoto === index ? "border-[#ff4764]" : "border-white/10"}`}>
                    <img src={photo.url} alt="Miniatura demonstrativa" className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.categories.map((value: string) => <Badge key={value} variant="outline" className="border-[#ff4764]/30 text-[#ff9a8e]">{value}</Badge>)}
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Perfil publicado</p>
                <h1 className="font-display text-5xl">{profile.stageName}{profile.age ? <span className="ml-3 text-xl font-normal text-white/45">{profile.age}</span> : null}</h1>
                <p className="mt-3 text-white/55"><MapPin className="mr-1 inline h-4 w-4 text-[#ff4764]" />{profile.city}{profile.region ? `, ${profile.region}` : ""}{profile.locationNote ? ` · ${profile.locationNote}` : ""}</p>
              </div>
              <ShieldCheck className="h-7 w-7 text-[#ff4764]" />
            </div>

            <p className="mt-8 whitespace-pre-wrap text-base leading-7 text-white/70">{profile.description || "Este perfil ainda não adicionou uma descrição pública."}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-white/40">Atributos</p>
                  <div className="mt-3 flex flex-wrap gap-2">{profile.attributes.length ? profile.attributes.map((value: string) => <Badge key={value} className="bg-white/10 text-white">{value}</Badge>) : <span className="text-sm text-white/45">Não informado</span>}</div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-white/40">Disponibilidade</p>
                  <p className="mt-3 text-sm text-[#ffb0a7]"><Clock3 className="mr-2 inline h-4 w-4" />{profile.isAvailableNow ? "Disponível agora" : profile.availabilityLabel || "Consulte disponibilidade"}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-white/40">Preferências</p>
                  <p className="mt-3 text-sm text-white/65">{profile.preferences.length ? profile.preferences.join(" · ") : "Não informado"}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-white/40">Idiomas</p>
                  <p className="mt-3 text-sm text-white/65"><Languages className="mr-2 inline h-4 w-4 text-[#ff4764]" />{profile.languages.length ? profile.languages.join(" · ") : "Não informado"}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-3 border-white/10 bg-white/5">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[.18em] text-white/40">Contato</p>
                {demoContactDisabled ? (
                  <p className="mt-3 text-sm leading-6 text-[#ffb0a7]">Contatos demonstrativos desativados na homologação. Nenhuma chamada ou mensagem será encaminhada.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">{profile.contactOptions.length ? profile.contactOptions.map((value: string) => <Button key={value} type="button" size="sm" variant="outline" className="border-white/15 bg-transparent text-white">{value}</Button>) : <span className="text-sm text-white/45">Contato não informado publicamente</span>}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="mt-14">
          <div className="flex items-end justify-between">
            <div><p className="eyebrow">Galeria</p><h2 className="font-display text-3xl">Fotos e vídeos</h2></div>
            <span className="text-sm text-white/40">{media.length} mídia(s) aprovada(s)</span>
          </div>
          {photos.length ? (
            <div className="media-grid mt-6">
              {photos.map(photo => (
                <button type="button" key={photo.id} onClick={() => setActivePhoto(Math.max(0, photos.findIndex(item => item.id === photo.id)))} className="media-photo overflow-hidden">
                  <img src={photo.url} alt={photo.title || `Foto demonstrativa de ${profile.stageName}`} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                </button>
              ))}
            </div>
          ) : <div className="empty-inline mt-6">Ainda não há fotos públicas aprovadas para este perfil.</div>}

          {videos.length ? (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {videos.map(video => (
                <Card key={video.id} className="border-white/10 bg-white/5">
                  <CardContent className="p-5">
                    {video.isPremium ? (
                      <div>
                        <div className="video-tile"><Lock className="h-6 w-6" /></div>
                        <Button size="sm" onClick={() => user ? premiumIntent.mutate({ mediaId: video.id }) : toast.error("Entre para solicitar acesso")} className="mt-3 w-full bg-[#ff4764] text-[#222222]">{user ? "Solicitar acesso premium" : "Entrar para solicitar acesso"}</Button>
                      </div>
                    ) : <video className="video-player" controls preload="metadata" src={video.url} aria-label={video.title || "Vídeo demonstrativo"} />}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-medium">{video.title || "Vídeo"}</span>
                      {video.isPremium ? <Badge className="bg-[#ff4764] text-[#222222]"><Lock className="mr-1 h-3 w-3" />Premium</Badge> : <CheckCircle2 className="h-4 w-4 text-[#ff4764]" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex justify-end">
            <Button type="button" variant="outline" onClick={() => toast.success("Obrigado. O fluxo de denúncia será conectado à moderação.")} className="border-white/15 bg-transparent text-white"><Flag className="mr-2 h-4 w-4" />Denunciar perfil</Button>
          </div>
        </section>

        {related.length ? (
          <section className="mt-16 border-t border-white/10 pt-12">
            <p className="eyebrow">Na mesma cidade</p>
            <h2 className="mt-2 font-display text-3xl">Perfis relacionados</h2>
            <div className="profile-grid mt-6">
              {related.map(item => (
                <Link key={item.id} href={`/perfil/${item.slug}`}>
                  <Card className="profile-card">
                    <div className="profile-image" style={item.avatarUrl ? { backgroundImage: `url(${item.avatarUrl})` } : undefined}>
                      <span className="profile-fallback">{item.stageName.slice(0, 1)}</span>
                    </div>
                    <CardContent className="p-4"><h3 className="font-semibold">{item.stageName}</h3><p className="mt-1 text-sm text-white/50">{item.city}</p></CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
