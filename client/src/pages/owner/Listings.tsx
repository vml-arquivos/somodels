import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import PortfolioEditor from "@/components/PortfolioEditor";
import { portfolioPublicationLabel } from "@shared/portfolio";
import { AvailabilityPanel, QualityPanel, StatsPanel } from "./ListingPanels";
import { LibraryPicker } from "./Library";
import {
  Badge,
  Card,
  Empty,
  ErrorBlock,
  LoadingBlock,
  OIcon,
  PageHead,
  fmtDate,
  listingTone,
} from "./ui";

function ListingList() {
  const overview = trpc.owner.overview.useQuery();
  const [, navigate] = useLocation();
  if (overview.isLoading) return <LoadingBlock />;
  if (overview.error || !overview.data)
    return (
      <ErrorBlock message={overview.error?.message || "Erro ao carregar"} />
    );
  const { listings } = overview.data;
  return (
    <>
      <PageHead
        title="Meus anúncios"
        subtitle="Crie, edite e acompanhe cada anúncio. O nome e a idade do anúncio são livres, seus dados reais ficam só na sua conta."
        actions={
          <Link className="od-btn is-primary" href="/titular/anuncios?novo=1">
            <OIcon name="plus" size={18} /> Novo anúncio
          </Link>
        }
      />
      {listings.length === 0 ? (
        <Card>
          <Empty
            icon="list"
            title="Nenhum anúncio ainda"
            text="Crie o primeiro agora. Se já guardou fotos na biblioteca, você escolhe quais usar."
            action={
              <Link
                className="od-btn is-primary"
                href="/titular/anuncios?novo=1"
              >
                Criar anúncio
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="od-listings">
          {listings.map(row => (
            <li key={row.id} className="od-listing">
              <button
                type="button"
                className="od-listing-main"
                onClick={() =>
                  navigate(`/titular/anuncios?profileId=${row.id}`)
                }
              >
                <span className="od-thumb is-lg">
                  {row.avatarUrl ? (
                    <img src={row.avatarUrl} alt="" loading="lazy" />
                  ) : (
                    <OIcon name="user" size={26} />
                  )}
                </span>
                <span className="od-listing-title">
                  <strong>{row.stageName}</strong>
                  <small>
                    {row.city}
                    {row.region ? ` · ${row.region}` : ""}
                  </small>
                  <Badge tone={listingTone(row)}>
                    {portfolioPublicationLabel({
                      status: row.status as any,
                      isPublished: row.isPublished,
                      portfolioReviewed: row.isPublished,
                    })}
                  </Badge>
                </span>
              </button>
              <dl className="od-listing-stats">
                <div>
                  <dt>Fotos</dt>
                  <dd>{row.photos}</dd>
                </div>
                <div>
                  <dt>Vídeos</dt>
                  <dd>{row.videos}</dd>
                </div>
                <div>
                  <dt>Visitas</dt>
                  <dd>{row.views}</dd>
                </div>
                <div>
                  <dt>Contatos</dt>
                  <dd>{row.contacts}</dd>
                </div>
              </dl>
              {row.rejectionReason && !row.isPublished && (
                <p className="od-listing-note">{row.rejectionReason}</p>
              )}
              <div className="od-listing-foot">
                <small>Atualizado em {fmtDate(row.updatedAt)}</small>
                <span>
                  {row.isPublished && (
                    <Link className="od-link" href={`/perfil/${row.slug}`}>
                      Ver página
                    </Link>
                  )}
                  <Link
                    className="od-link"
                    href={`/titular/anuncios?profileId=${row.id}`}
                  >
                    Gerenciar →
                  </Link>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ListingEditor({ profileId }: { profileId: number | null }) {
  const [, navigate] = useLocation();
  const [version, setVersion] = useState(0);
  const utils = trpc.useUtils();
  const detail = trpc.profiles.mineById.useQuery(
    { id: profileId || 0 },
    { enabled: !!profileId }
  );
  const readiness = trpc.profiles.publicationReadiness.useQuery(
    { id: profileId || 0 },
    { enabled: Boolean(profileId && detail.data?.profile) }
  );
  const identity = trpc.profiles.identity.useQuery();
  const archive = trpc.profiles.archiveMine.useMutation({
    onSuccess: async () => {
      toast.success("Anúncio arquivado");
      await utils.owner.overview.invalidate();
      await utils.profiles.mine.invalidate();
      navigate("/titular/anuncios");
    },
    onError: error => toast.error(error.message),
  });
  useEffect(() => {
    setVersion(v => v + 1);
  }, [profileId]);

  async function saved(next: number) {
    await Promise.all([
      utils.owner.overview.invalidate(),
      utils.profiles.mine.invalidate(),
      utils.profiles.mineById.invalidate(),
      utils.profiles.publicationReadiness.invalidate(),
    ]);
    if (next !== profileId) navigate(`/titular/anuncios?profileId=${next}`);
    else setVersion(v => v + 1);
  }

  const profile = detail.data?.profile;
  const notFound = profileId && !detail.isLoading && (detail.error || !profile);
  const r = readiness.data as any;

  return (
    <>
      <p className="od-back">
        <Link href="/titular/anuncios">← Todos os anúncios</Link>
      </p>
      <PageHead
        title={profile ? profile.stageName : "Novo anúncio"}
        subtitle={
          profile
            ? portfolioPublicationLabel(profile)
            : "O nome e a idade que aparecem no anúncio são livres. Seus dados reais ficam protegidos na sua conta."
        }
        actions={
          profile?.isPublished ? (
            <Link className="od-btn" href={`/perfil/${profile.slug}`}>
              <OIcon name="external" size={16} /> Abrir página pública
            </Link>
          ) : undefined
        }
      />
      {profileId && detail.isLoading ? (
        <LoadingBlock label="Carregando anúncio…" />
      ) : notFound ? (
        <Card>
          <Empty
            icon="alert"
            title="Anúncio não encontrado"
            text="Ele não pertence a esta conta, foi arquivado ou não está disponível. Nenhum cadastro novo foi criado."
            action={
              <Link className="od-btn" href="/titular/anuncios">
                Voltar para meus anúncios
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="od-editor">
          <div className="od-editor-main">
            <PortfolioEditor
              key={`${profileId ?? "new"}-${version}`}
              initial={profileId ? profile : undefined}
              media={profileId ? detail.data?.media : []}
              onSaved={saved}
            />
          </div>
          <aside className="od-editor-side">
            {!profileId && (
              <Card kicker="Dica" title="Depois de salvar">
                <p className="od-muted">
                  Você poderá escolher fotos e vídeos que já estão na sua
                  biblioteca, ver o desempenho e ligar o “disponível agora”.
                </p>
                <Link className="od-link" href="/titular/midia">
                  Abrir biblioteca →
                </Link>
              </Card>
            )}
            {profile && (
              <>
                <Card
                  kicker="Situação"
                  title={portfolioPublicationLabel(profile)}
                >
                  <p className="od-muted">
                    {profile.isPublished
                      ? "Seu anúncio está no ar."
                      : profile.rejectionReason || "Ainda não está no ar."}
                  </p>
                  {readiness.isLoading ? (
                    <p className="od-muted">Calculando checklist…</p>
                  ) : r ? (
                    <ul className="od-check">
                      {r.ownerData?.required && (
                        <li className={r.ownerData.complete ? "is-ok" : ""}>
                          {r.ownerData.complete ? (
                            "Dados pessoais preenchidos"
                          ) : (
                            <Link href="/titular/dados">
                              Preencha seus dados pessoais
                            </Link>
                          )}
                        </li>
                      )}
                      <li className={r.terms.current ? "is-ok" : ""}>
                        {r.terms.current ? (
                          "Termos da conta aceitos"
                        ) : (
                          <Link href="/titular/contrato">
                            Aceite os termos da conta
                          </Link>
                        )}
                      </li>
                      <li className={r.approvedMediaCount > 0 ? "is-ok" : ""}>
                        {r.approvedMediaCount > 0
                          ? "Tem foto no anúncio"
                          : "Adicione pelo menos uma foto"}
                      </li>
                      <li className={r.pendingMediaCount === 0 ? "is-ok" : ""}>
                        {r.pendingMediaCount === 0
                          ? "Nenhum arquivo em análise"
                          : `${r.pendingMediaCount} arquivo(s) em análise`}
                      </li>
                      {r.publicationBlockers.map((blocker: string) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  ) : null}
                  {!profile.deletedAt && (
                    <button
                      type="button"
                      className="od-btn is-danger"
                      disabled={archive.isPending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Arquivar este anúncio e tirá-lo da vitrine?"
                          )
                        )
                          return;
                        archive.mutate({
                          id: profile.id,
                          confirmation: "EXCLUIR",
                        });
                      }}
                    >
                      {archive.isPending ? "Arquivando…" : "Arquivar anúncio"}
                    </button>
                  )}
                </Card>
                <LibraryPicker profileId={profile.id} />
                {profile.isPublished && (
                  <AvailabilityPanel
                    profile={profile}
                    onChanged={() => void detail.refetch()}
                  />
                )}
                {profile.isPublished && <StatsPanel profileId={profile.id} />}
                <QualityPanel
                  profile={profile}
                  media={detail.data?.media ?? []}
                  identityVerified={identity.data?.status === "approved"}
                />
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

export default function Listings({
  profileId,
  isNew,
}: {
  profileId: number | null;
  isNew: boolean;
}) {
  if (profileId || isNew) return <ListingEditor profileId={profileId} />;
  return <ListingList />;
}
