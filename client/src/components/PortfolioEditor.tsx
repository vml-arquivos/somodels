import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  portfolioCategories,
  portfolioPolicy,
  contactLinks,
} from "@shared/portfolio";
import { toast } from "sonner";

type Props = {
  initial?: any;
  media?: any[];
  ownerId?: number;
  admin?: boolean;
  onSaved: (id: number) => void;
};
export default function PortfolioEditor({
  initial,
  media = [],
  ownerId,
  admin = false,
  onSaved,
}: Props) {
  const [form, setForm] = useState({
    stageName: initial?.stageName || "",
    slug: initial?.slug || "",
    description: initial?.description || "",
    city: initial?.city || "",
    region: initial?.region || "",
    locationNote: initial?.locationNote || "",
    phone: initial?.phone || "",
    whatsapp: initial?.whatsapp || "",
    categories: (initial?.categories || []).filter((v: string) =>
      (portfolioCategories as readonly string[]).includes(v)
    ),
    languages: (initial?.languages || []).join(", "),
    availabilityLabel: initial?.availabilityLabel || "",
    attributes: (initial?.attributes || []).join(", "),
  });
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const save = trpc.profiles.save.useMutation();
  const adminSave = trpc.management.saveProfile.useMutation();
  const add = trpc.media.add.useMutation();
  const cover = trpc.profiles.cover.useMutation();
  const hide = trpc.profiles.hideMedia.useMutation();
  const update = (key: string, value: any) =>
    setForm(f => ({ ...f, [key]: value }));
  const links = contactLinks(form.phone, form.whatsapp);
  async function submit(review: boolean) {
    if (!consent) {
      toast.error(
        "Confirme a autorização do conteúdo e a política de portfólios"
      );
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        id: initial?.id,
        slug:
          form.slug ||
          form.stageName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        categories: form.categories,
        attributes: form.attributes
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        languages: form.languages
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        preferences: [],
        contactOptions: [],
        isAvailableNow: false,
      };
      const id = admin
        ? await adminSave.mutateAsync({ ...payload, ownerId: ownerId! })
        : await save.mutateAsync({ ...payload, submitForReview: review });
      toast.success(
        review
          ? "Enviado para revisão"
          : "Rascunho salvo. A publicação exige revisão."
      );
      onSaved(Number(id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file || !initial?.id) return;
    const kind = file.type.startsWith("video/") ? "video" : "photo";
    if (file.size > (kind === "video" ? 100 : 12) * 1024 * 1024) {
      toast.error("Arquivo acima do limite: fotos 12 MB e vídeos 100 MB");
      return;
    }
    if (!consent) {
      toast.error("Confirme a autorização do conteúdo antes de enviar");
      return;
    }
    setBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/upload/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: initial.id,
          kind,
          filename: file.name,
          contentType: file.type,
          data,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Falha no envio");
      await add.mutateAsync({
        profileId: initial.id,
        kind,
        storageKey: result.key,
        url: result.url,
        mimeType: file.type,
        isPremium: false,
        sortOrder: media.length,
      });
      toast.success("Arquivo recebido para revisão");
      onSaved(initial.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="studio-editor">
      <div className="studio-fields">
        {[
          ["stageName", "Título / nome profissional"],
          ["slug", "Endereço do perfil"],
          ["city", "Cidade"],
          ["region", "Estado / região"],
          ["locationNote", "Localização aproximada (sem endereço privado)"],
          ["languages", "Idiomas, separados por vírgula"],
          ["phone", "Telefone — DDI e DDD"],
          ["whatsapp", "WhatsApp (opcional; usa o telefone quando vazio)"],
          ["availabilityLabel", "Disponibilidade para projetos"],
          ["attributes", "Especialidades, separadas por vírgula"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              maxLength={key === "stageName" ? 120 : 180}
              value={(form as any)[key]}
              onChange={e => update(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <label>
        Descrição profissional
        <textarea
          rows={5}
          maxLength={5000}
          value={form.description}
          onChange={e => update("description", e.target.value)}
        />
      </label>
      <fieldset>
        <legend>Áreas de atuação</legend>
        <div className="studio-actions">
          {portfolioCategories.map(c => (
            <label className="studio-check" key={c}>
              <input
                type="checkbox"
                checked={form.categories.includes(c)}
                onChange={e =>
                  update(
                    "categories",
                    e.target.checked
                      ? [...form.categories, c]
                      : form.categories.filter((v: string) => v !== c)
                  )
                }
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="studio-muted">
        Os contatos serão públicos apenas após aprovação e publicação.{" "}
        {links.tel
          ? "Telefone válido para ligação."
          : "Informe um telefone válido."}{" "}
        {links.whatsapp ? "Link de WhatsApp será gerado automaticamente." : ""}
      </p>
      <label className="studio-check">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
        />
        Confirmo que tenho autorização para os dados e arquivos.{" "}
        {portfolioPolicy}
      </label>
      <div className="studio-actions">
        <button disabled={busy} onClick={() => submit(false)}>
          Salvar rascunho
        </button>
        {!admin && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => submit(true)}
          >
            Enviar para revisão
          </button>
        )}
      </div>
      <section className="studio-panel">
        <h3>Fotos e vídeos</h3>
        {!initial?.id ? (
          <p>Salve o rascunho antes de enviar arquivos.</p>
        ) : (
          <>
            {!admin && (
              <label>
                Adicionar arquivo
                <input
                  disabled={busy}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
                  onChange={e => {
                    upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            <p className="studio-muted">
              Fotos até 12 MB. Vídeos até 100 MB. Arquivos novos ficam privados
              até a revisão.
            </p>
            <div className="studio-media">
              {media.map(m => (
                <article key={m.id}>
                  {m.kind === "photo" ? (
                    <img
                      src={`/api/media-preview/${m.id}`}
                      alt={m.title || "Foto do portfólio"}
                    />
                  ) : (
                    <video
                      src={`/api/media-preview/${m.id}`}
                      controls
                      preload="metadata"
                    />
                  )}
                  <p>
                    {m.status} · {m.kind === "photo" ? "Foto" : "Vídeo"}
                  </p>
                  {!admin && (
                    <div className="studio-actions">
                      {m.kind === "photo" && (
                        <button
                          disabled={busy || cover.isPending}
                          onClick={async () => {
                            try {
                              await cover.mutateAsync({ id: m.id });
                              toast.success("Capa atualizada");
                              onSaved(initial.id);
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }}
                        >
                          Usar como capa
                        </button>
                      )}
                      <button
                        disabled={busy || hide.isPending}
                        onClick={async () => {
                          try {
                            await hide.mutateAsync({ id: m.id });
                            onSaved(initial.id);
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        Ocultar arquivo
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
