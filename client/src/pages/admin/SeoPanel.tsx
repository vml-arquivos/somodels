import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { seoLimits, seoTips, type SeoPageOverride } from "@shared/admin-seo";
import { ErrorNote, Head, Loading, Panel, Pill } from "./kit";

const defaults: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Ero Models — Anúncios de acompanhantes adultos",
    description:
      "Anúncios de acompanhantes por cidade e bairro. Veja fotos e valores e fale direto pelo WhatsApp. Só para maiores de 18 anos.",
  },
  "/planos": {
    title: "Planos para anunciantes — Ero Models",
    description: "Compare os planos de destaque e escolha como aparecer na vitrine.",
  },
  "/como-anunciar": {
    title: "Como anunciar — Ero Models",
    description:
      "Passo a passo para criar, verificar e publicar seu anúncio com segurança.",
  },
  "/calculadora-de-ganhos": {
    title: "Calculadora de ganhos — Ero Models",
    description:
      "Simule uma estimativa mensal de ganhos a partir do seu valor por hora e da sua rotina.",
  },
  "/ajuda": {
    title: "Ajuda — Ero Models",
    description: "Orientações para titulares, visitantes e publicação.",
  },
  "/contato": {
    title: "Contato — Ero Models",
    description: "Orientações para contato com a plataforma.",
  },
  "/termos": {
    title: "Termos da plataforma — Ero Models",
    description: "Regras de uso, publicação e moderação da plataforma.",
  },
  "/privacidade": {
    title: "Privacidade — Ero Models",
    description: "Como a plataforma minimiza, protege e utiliza dados.",
  },
  "/seguranca": {
    title: "Segurança e confiança — Ero Models",
    description: "Orientações de segurança, consentimento e contato responsável.",
  },
  "/denuncia": {
    title: "Denúncias e remoção — Ero Models",
    description: "Como denunciar perfil, mídia ou comportamento irregular.",
  },
};

const fmtMb = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

// Fotos leves ajudam no Google: novas fotos já entram reduzidas; aqui dá para
// reduzir as que foram enviadas antes, em pequenos lotes.
function PhotoWeight() {
  const stats = trpc.panel.mediaStats.useQuery();
  const utils = trpc.useUtils();
  const run = trpc.panel.mediaOptimize.useMutation({
    onSuccess: async result => {
      toast.success(
        result.converted
          ? `${result.converted} foto(s) reduzida(s), ${fmtMb(result.savedBytes)} a menos`
          : "Nenhuma foto foi reduzida neste lote"
      );
      await utils.panel.mediaStats.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const pending = stats.data?.pending ?? 0;
  return (
    <Panel title="Fotos leves (WebP)">
      <p className="adm-muted">
        Fotos novas já entram reduzidas, inteiras e sem os dados de localização
        do celular. {stats.data ? `${stats.data.done} já estão leves.` : ""}
      </p>
      <div className="adm-review-actions">
        <button
          type="button"
          className="adm-btn is-primary"
          disabled={run.isPending || pending === 0}
          onClick={() => run.mutate()}
        >
          {run.isPending
            ? "Reduzindo…"
            : pending === 0
              ? "Tudo em dia"
              : `Reduzir fotos antigas (${pending} faltam)`}
        </button>
        {pending > 0 && (
          <span className="adm-muted">
            Cada clique reduz até 10 fotos. Pode repetir até acabar.
          </span>
        )}
      </div>
    </Panel>
  );
}

export default function SeoPanel() {
  const utils = trpc.useUtils();
  const q = trpc.panel.seoGet.useQuery();
  const [pages, setPages] = useState<Record<string, SeoPageOverride>>({});
  const [image, setImage] = useState("");
  const [open, setOpen] = useState<string>("/");
  const save = trpc.panel.seoSave.useMutation({
    onSuccess: async () => {
      toast.success("SEO salvo. As páginas usam os novos textos em até 1 minuto.");
      await utils.panel.seoGet.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  useEffect(() => {
    if (q.data) {
      setPages(q.data.overrides.pages);
      setImage(q.data.overrides.image);
    }
  }, [q.data]);

  const patch = (path: string, value: Partial<SeoPageOverride>) =>
    setPages(p => ({ ...p, [path]: { ...p[path], ...value } }));

  if (q.isLoading) return <Loading />;
  const list = q.data?.pages ?? [];
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="adm">
      <Head
        title="SEO"
        subtitle="Como cada página aparece no Google e ao compartilhar. Deixe em branco para usar o texto padrão."
        actions={
          <button
            type="button"
            className="adm-btn is-primary"
            disabled={save.isPending}
            onClick={() => save.mutate({ image, pages })}
          >
            Salvar alterações
          </button>
        }
      />
      <ErrorNote error={q.error} />

      <PhotoWeight />

      <Panel title="Imagem ao compartilhar a página inicial">
        <label className="adm-field">
          Endereço da imagem (começa com / ou https://)
          <input
            className="adm-input"
            value={image}
            maxLength={seoLimits.image}
            onChange={e => setImage(e.target.value)}
            placeholder="/brand/social-card.png"
          />
          <em>Tamanho ideal: 1200×630 px.</em>
        </label>
      </Panel>

      <div className="adm-grid">
        {list.map(page => {
          const base = defaults[page.path] ?? { title: "", description: "" };
          const value = pages[page.path] ?? {};
          const title = value.title ?? "";
          const description = value.description ?? "";
          const shownTitle = title || base.title;
          const shownDescription = description || base.description;
          const tips = seoTips(shownTitle, shownDescription);
          const expanded = open === page.path;
          const custom = Boolean(title || description || value.noindex);
          return (
            <section className="adm-panel" key={page.path}>
              <div className="adm-panel-head">
                <h3>
                  {page.label} <span className="adm-muted">{page.path}</span>
                </h3>
                <span className="adm-chips">
                  {custom && <Pill tone="info">Personalizada</Pill>}
                  {value.noindex && <Pill tone="warn">Fora do Google</Pill>}
                  <button
                    type="button"
                    className="adm-btn is-sm"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? "" : page.path)}
                  >
                    {expanded ? "Fechar" : "Editar"}
                  </button>
                </span>
              </div>
              <div className="adm-seo-preview">
                <cite>{origin}{page.path}</cite>
                <strong>{shownTitle || "Sem título"}</strong>
                <span>{shownDescription}</span>
              </div>
              {expanded && (
                <div className="adm-grid" style={{ marginTop: 14 }}>
                  <label className="adm-field">
                    Título
                    <input
                      className="adm-input"
                      value={title}
                      maxLength={seoLimits.title}
                      placeholder={base.title}
                      onChange={e => patch(page.path, { title: e.target.value })}
                    />
                    <span className={`adm-count ${shownTitle.length > 65 ? "is-over" : ""}`}>
                      {shownTitle.length}/65
                    </span>
                  </label>
                  <label className="adm-field">
                    Descrição
                    <textarea
                      className="adm-textarea"
                      value={description}
                      maxLength={seoLimits.description}
                      placeholder={base.description}
                      onChange={e => patch(page.path, { description: e.target.value })}
                    />
                    <span className={`adm-count ${shownDescription.length > 160 ? "is-over" : ""}`}>
                      {shownDescription.length}/160
                    </span>
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.9rem" }}>
                    <input
                      type="checkbox"
                      checked={value.noindex === true}
                      onChange={e => patch(page.path, { noindex: e.target.checked })}
                    />
                    Não mostrar esta página no Google
                  </label>
                  {tips.length > 0 && (
                    <ul className="adm-muted" style={{ margin: 0, paddingLeft: 18 }}>
                      {tips.map(t => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Panel title="Mapa do site e robôs">
        <div className="adm-row">
          <span>Mapa do site</span>
          <a className="adm-btn is-sm" href="/sitemap.xml" target="_blank" rel="noreferrer">
            Abrir sitemap.xml
          </a>
        </div>
        <div className="adm-row">
          <span>Regras para robôs</span>
          <a className="adm-btn is-sm" href="/robots.txt" target="_blank" rel="noreferrer">
            Abrir robots.txt
          </a>
        </div>
        <p className="adm-muted" style={{ marginTop: 10 }}>
          Cidades, categorias e anúncios publicados entram no mapa automaticamente. As páginas
          privadas (painel, conta, login) nunca são indexadas. Se o Google não mostrar o site,
          confira a aba Prontidão: a indexação só liga quando o lançamento público está ativo.
        </p>
      </Panel>
    </div>
  );
}
