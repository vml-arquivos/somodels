import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  portfolioCategories,
  portfolioPolicy,
  portfolioTermsClauses,
  portfolioTermsTitle,
  portfolioTermsVersion,
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
    age: initial?.age ? String(initial.age) : "",
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
    preferences: (initial?.preferences || []).join(", "),
    contactOptions: (initial?.contactOptions || []).join(", "),
    isAvailableNow: Boolean(initial?.isAvailableNow),
  });
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [termsChecks, setTermsChecks] = useState({
    adultConfirmed: false,
    rightsConfirmed: false,
    responsibilityConfirmed: false,
  });
  const save = trpc.profiles.save.useMutation();
  const adminSave = trpc.management.saveProfile.useMutation();
  const add = trpc.media.add.useMutation();
  const adminAdd = trpc.admin.addMedia.useMutation();
  const cover = trpc.profiles.cover.useMutation();
  const hide = trpc.profiles.hideMedia.useMutation();
  const ownerTerms = trpc.profiles.termsStatus.useQuery(
    { id: initial?.id || 0 },
    { enabled: Boolean(initial?.id) && !admin }
  );
  const acceptTerms = trpc.profiles.acceptTerms.useMutation();
  const update = (key: string, value: any) =>
    setForm(f => ({ ...f, [key]: value }));
  const links = contactLinks(form.phone, form.whatsapp);
  async function submit(review: boolean) {
    if (!consent) {
      toast.error(
        admin
          ? "Confirme que os dados foram fornecidos ou autorizados pelo titular"
          : "Confirme a maioridade, a responsabilidade pelo anúncio e a autorização do conteúdo"
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
        age: form.age ? Number(form.age) : undefined,
        attributes: form.attributes
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        languages: form.languages
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        preferences: form.preferences
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        contactOptions: form.contactOptions
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        isAvailableNow: form.isAvailableNow,
      };
      if (admin) {
        const id = await adminSave.mutateAsync({ ...payload, ownerId: ownerId! });
        toast.success("Anúncio salvo para revisão do titular e da moderação");
        onSaved(Number(id));
        return;
      }
      const id = await save.mutateAsync({ ...payload, submitForReview: false });
      if (review) {
        const status = initial?.id ? await ownerTerms.refetch() : null;
        if (!status?.data?.current) {
          toast.error(
            "Rascunho salvo. Aceite o termo de responsabilidade vigente para este conteúdo antes de enviar para revisão."
          );
          onSaved(Number(id));
          return;
        }
        await save.mutateAsync({ ...payload, id: Number(id), submitForReview: true });
        toast.success("Enviado para revisão");
      } else {
        toast.success("Rascunho salvo. A publicação exige revisão.");
      }
      onSaved(Number(id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file || !initial?.id) return;
    const kind: "photo" | "video" = file.type.startsWith("video/") ? "video" : "photo";
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
      const mediaInput = {
        profileId: initial.id,
        kind,
        storageKey: result.key,
        url: result.url,
        mimeType: file.type,
        isPremium: false as const,
        sortOrder: media.length,
      };
      if (admin) {
        await adminAdd.mutateAsync({ ...mediaInput, ownerId: ownerId! });
      } else {
        await add.mutateAsync(mediaInput);
      }
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
          ["stageName", "Nome artístico exibido", "Ex.: Marina Alves"],
          ["slug", "Slug do perfil (URL pública)", "Ex.: marina-alves"],
          ["city", "Cidade de atendimento", "Ex.: Brasília"],
          ["region", "Estado / região", "Ex.: Distrito Federal"],
          ["locationNote", "Localização aproximada", "Ex.: Asa Sul e região — nunca informe endereço privado"],
          ["age", "Idade pública", "Ex.: 28"],
          ["languages", "Idiomas", "Ex.: Português, Inglês"],
          ["phone", "Telefone para ligação — DDI e DDD", "Ex.: +55 61 99999-9999"],
          ["whatsapp", "WhatsApp (opcional)", "Se vazio, usa o telefone informado"],
          ["availabilityLabel", "Horários e disponibilidade", "Ex.: Todos os dias, das 10h às 22h"],
          ["attributes", "Características do anúncio", "Ex.: Com local, externo, discreta"],
          ["preferences", "Preferências / modalidades", "Ex.: Virtual, casal, viagens"],
          ["contactOptions", "Formas de contato autorizadas", "Ex.: WhatsApp, ligação"],
        ].map(([key, label, placeholder]) => (
          <label key={key}>
            {label}
            <input
              maxLength={key === "stageName" ? 120 : 180}
              type={key === "age" ? "number" : "text"}
              min={key === "age" ? 18 : undefined}
              max={key === "age" ? 99 : undefined}
              placeholder={placeholder}
              value={(form as any)[key]}
              onChange={e => update(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <label>
        Descrição do anúncio
        <textarea
          rows={5}
          maxLength={5000}
          placeholder="Escreva uma descrição objetiva do anúncio, atendimento, disponibilidade e diferenciais. Não inclua endereço privado, promessas indevidas ou informações que o titular não autorizou."
          value={form.description}
          onChange={e => update("description", e.target.value)}
        />
      </label>
      <fieldset>
        <legend>Tipo e categoria do anúncio</legend>
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
        Os contatos ficam protegidos durante o cadastro e só podem gerar ligação ou WhatsApp pelo fluxo autorizado após aprovação e publicação. {" "}
        {links.tel
          ? "Telefone válido para ligação."
          : "Informe um telefone válido."}{" "}
        {links.whatsapp ? "Link de WhatsApp será gerado automaticamente." : ""}
      </p>
      {(links.tel || links.whatsapp) && (
        <div className="studio-actions" aria-label="Prévia privada dos links de contato">
          {links.tel && <a className="studio-cta" href={links.tel}>Pré-visualizar ligação</a>}
          {links.whatsapp && <a className="studio-cta" href={links.whatsapp} target="_blank" rel="noreferrer">Pré-visualizar WhatsApp</a>}
        </div>
      )}
      <label className="studio-check">
        <input
          type="checkbox"
          checked={form.isAvailableNow}
          onChange={e => update("isAvailableNow", e.target.checked)}
        />
        Exibir o anúncio como disponível agora
      </label>
      <label className="studio-check">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
        />
        {admin
          ? "Confirmo que estas informações e arquivos foram fornecidos ou autorizados pelo titular para preparar este perfil. O titular ainda deverá revisar o conteúdo e registrar o aceite do termo."
          : "Confirmo que tenho 18 anos ou mais, sou responsável por este anúncio e tenho autorização para usar estas informações e arquivos."}{" "}
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
        <h3>{portfolioTermsTitle}</h3>
        {!initial?.id ? (
          <p className="studio-muted">
            Salve o rascunho primeiro. O aceite será vinculado ao conteúdo atual do perfil e às mídias cadastradas.
          </p>
        ) : admin ? (
          <p className="studio-muted">
            O administrador prepara o conteúdo, mas somente o titular pode confirmar maioridade, direitos, responsabilidade e aceite contratual.
          </p>
        ) : (
          <>
            <p className={ownerTerms.data?.current ? "studio-notice" : "studio-muted"}>
              {ownerTerms.data?.current
                ? `Aceite vigente registrado em ${new Date(ownerTerms.data.acceptedAt!).toLocaleString("pt-BR")}.`
                : "Leia e confirme o termo para o conteúdo atual deste anúncio."}
            </p>
            <ol className="studio-terms">
              {portfolioTermsClauses.map(clause => <li key={clause}>{clause}</li>)}
            </ol>
            <p className="studio-muted">Versão {portfolioTermsVersion}</p>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={termsChecks.adultConfirmed}
                onChange={e => setTermsChecks(v => ({ ...v, adultConfirmed: e.target.checked }))}
              />
              Confirmo que tenho 18 anos ou mais.
            </label>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={termsChecks.rightsConfirmed}
                onChange={e => setTermsChecks(v => ({ ...v, rightsConfirmed: e.target.checked }))}
              />
              Confirmo que possuo os direitos e autorizações necessários sobre os dados, fotos e vídeos.
            </label>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={termsChecks.responsibilityConfirmed}
                onChange={e => setTermsChecks(v => ({ ...v, responsibilityConfirmed: e.target.checked }))}
              />
              Assumo a responsabilidade pelo conteúdo que envio ou autorizo publicar.
            </label>
            <button
              className="primary"
              disabled={
                acceptTerms.isPending ||
                !termsChecks.adultConfirmed ||
                !termsChecks.rightsConfirmed ||
                !termsChecks.responsibilityConfirmed
              }
              onClick={async () => {
                try {
                  await acceptTerms.mutateAsync({
                    id: initial.id,
                    adultConfirmed: true,
                    rightsConfirmed: true,
                    responsibilityConfirmed: true,
                  });
                  await ownerTerms.refetch();
                  setTermsChecks({ adultConfirmed: false, rightsConfirmed: false, responsibilityConfirmed: false });
                  toast.success("Termo registrado para o conteúdo atual");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Aceitar termo e registrar
            </button>
          </>
        )}
      </section>
      <section className="studio-panel">
        <h3>Fotos e vídeos do anúncio</h3>
        {!initial?.id ? (
          <p>Salve o rascunho antes de enviar materiais autorizados.</p>
        ) : (
          <>
            <label>
              {admin ? "Adicionar arquivo em nome do titular" : "Adicionar arquivo"}
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
            <p className="studio-muted">
              Imagens até 12 MB e vídeos até 100 MB. Arquivos novos ficam
              privados até a revisão. {admin ? "O titular ainda precisa revisar o material e aceitar o termo." : ""}
            </p>
            <div className="studio-media">
              {media.map(m => (
                <article key={m.id}>
                  {m.kind === "photo" ? (
                    <img
                      src={`/api/media-preview/${m.id}`}
                        alt={m.title || "Foto do anúncio"}
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
