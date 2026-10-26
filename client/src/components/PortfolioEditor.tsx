import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  portfolioCategories,
  portfolioPolicy,
  portfolioTermsClauses,
  portfolioTermsTitle,
  portfolioTermsVersion,
  contactLinks,
} from "@shared/portfolio";
import {
  attendancePlaceOptions,
  brazilianStateOptions,
  contactMethodOptions,
  centsToReais,
  languageOptions,
  paymentMethodOptions,
  profileAttributeOptions,
  profilePreferenceOptions,
  reaisToCents,
  serviceOptions,
  type AttendancePlace,
  type ServiceOption,
} from "@shared/discovery-options";
import { toast } from "sonner";
import MultiSelectField from "@/components/MultiSelectField";

type Props = {
  initial?: any;
  media?: any[];
  ownerId?: number;
  admin?: boolean;
  onSaved: (id: number) => void;
};

function withLegacyValues(options: readonly string[], current: string[]) {
  return Array.from(new Set([...options, ...current]));
}

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
    languages: (initial?.languages || []).filter(
      (v: unknown): v is string => typeof v === "string" && Boolean(v.trim())
    ),
    availabilityLabel: initial?.availabilityLabel || "",
    attributes: (initial?.attributes || []).filter(
      (v: unknown): v is string => typeof v === "string" && Boolean(v.trim())
    ),
    preferences: (initial?.preferences || []).filter(
      (v: unknown): v is string => typeof v === "string" && Boolean(v.trim())
    ),
    contactOptions: (initial?.contactOptions || []).filter(
      (v: unknown): v is string => typeof v === "string" && Boolean(v.trim())
    ),
    paymentMethods: (initial?.paymentMethods || []).filter((v: string) =>
      (paymentMethodOptions as readonly string[]).includes(v)
    ),
    isAvailableNow: Boolean(initial?.isAvailableNow),
    priceFrom: centsToReais(initial?.priceFromCents),
    services: ((initial?.services || []) as string[]).filter(
      (v): v is ServiceOption =>
        (serviceOptions as readonly string[]).includes(v)
    ),
    attendancePlaces: ((initial?.attendancePlaces || []) as string[]).filter(
      (v): v is AttendancePlace =>
        (attendancePlaceOptions as readonly string[]).includes(v)
    ),
  });
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [termsChecks, setTermsChecks] = useState({
    adultConfirmed: false,
    rightsConfirmed: false,
    responsibilityConfirmed: false,
  });
  const [mediaEdits, setMediaEdits] = useState<
    Record<number, { title: string; description: string }>
  >({});
  const save = trpc.profiles.save.useMutation();
  const publishMine = trpc.profiles.publishMine.useMutation();
  const adminSave = trpc.management.saveProfile.useMutation();
  const cover = trpc.profiles.cover.useMutation();
  const hide = trpc.profiles.hideMedia.useMutation();
  const updateMediaMetadata = trpc.profiles.updateMediaMetadata.useMutation();
  const reorderMedia = trpc.profiles.reorderMedia.useMutation();
  const ownerTerms = trpc.profiles.termsStatus.useQuery(
    { id: initial?.id || 0 },
    { enabled: Boolean(initial?.id) && !admin }
  );
  const acceptTerms = trpc.profiles.acceptTerms.useMutation();
  const update = (key: string, value: any) =>
    setForm(f => ({ ...f, [key]: value }));
  const links = contactLinks(form.phone, form.whatsapp);
  useEffect(() => {
    setMediaEdits(
      Object.fromEntries(
        media.map(item => [
          item.id,
          { title: item.title || "", description: item.description || "" },
        ])
      )
    );
  }, [media]);
  async function saveMediaMetadata(item: any) {
    const draft = mediaEdits[item.id] || { title: "", description: "" };
    setBusy(true);
    try {
      await updateMediaMetadata.mutateAsync({ id: item.id, ...draft });
      toast.success(
        item.status === "approved"
          ? "Metadados salvos e enviados para nova revisão"
          : "Metadados salvos"
      );
      onSaved(initial.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function moveMedia(index: number, direction: -1 | 1) {
    if (!initial?.id) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= media.length) return;
    const ordered = media.map(item => item.id);
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    setBusy(true);
    try {
      await reorderMedia.mutateAsync({
        profileId: initial.id,
        mediaIds: ordered,
      });
      toast.success("Ordem da galeria salva");
      onSaved(initial.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function buildPayload(id = initial?.id) {
    const { priceFrom, ...formFields } = form;
    const priceFromCents = reaisToCents(priceFrom);
    if (priceFrom.trim() && priceFromCents === null) {
      throw new Error("Informe um valor válido em reais (ex.: 250 ou 250,00)");
    }
    return {
      ...formFields,
      priceFromCents,
      id,
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
      attributes: form.attributes,
      languages: form.languages,
      preferences: form.preferences,
      contactOptions: form.contactOptions,
      paymentMethods: form.paymentMethods,
      isAvailableNow: form.isAvailableNow,
    };
  }

  async function persistDraft() {
    const payload = buildPayload();
    if (admin) {
      return Number(
        await adminSave.mutateAsync({
          ...payload,
          ownerId: ownerId!,
        })
      );
    }
    return Number(
      await save.mutateAsync({ ...payload, submitForReview: false })
    );
  }

  async function saveDraft() {
    setBusy(true);
    try {
      const id = await persistDraft();
      toast.success(
        "Rascunho salvo. Você pode continuar depois sem recomeçar."
      );
      onSaved(id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (admin) return;
    if (!consent) {
      toast.error(
        "Confirme a responsabilidade e a autorização do conteúdo antes de publicar"
      );
      return;
    }
    setBusy(true);
    try {
      const id = await persistDraft();
      await publishMine.mutateAsync({ id });
      toast.success("Anúncio publicado na vitrine");
      onSaved(id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (!initial?.id) {
      toast.error("Salve o rascunho antes de adicionar fotos ou vídeos");
      return;
    }
    const kind: "photo" | "video" = file.type.startsWith("video/")
      ? "video"
      : "photo";
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
          consent: true,
          data,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Falha no envio");
      toast.success(
        result.autoApproved
          ? "Arquivo adicionado à galeria"
          : "Arquivo recebido e aguardando revisão específica"
      );
      onSaved(initial.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="studio-editor">
      {!initial?.id && (
        <div className="studio-notice" role="status">
          Comece preenchendo o que já souber e salve o rascunho. Os campos
          restantes, o termo e as fotos/vídeos poderão ser adicionados depois,
          retomando este mesmo anúncio na lista ao lado.
        </div>
      )}
      <div className="studio-fields">
        <label>
          Nome artístico exibido
          <input
            maxLength={120}
            placeholder="Ex.: Marina Alves"
            value={form.stageName}
            onChange={e => update("stageName", e.target.value)}
          />
        </label>
        <label>
          Slug do perfil (URL pública)
          <input
            maxLength={160}
            placeholder="Ex.: marina-alves"
            value={form.slug}
            onChange={e => update("slug", e.target.value)}
          />
        </label>
        <label>
          Cidade de atendimento
          <input
            maxLength={120}
            placeholder="Ex.: Brasília"
            value={form.city}
            onChange={e => update("city", e.target.value)}
          />
        </label>
        <label>
          Estado / região
          <select
            value={form.region}
            onChange={e => update("region", e.target.value)}
          >
            <option value="">Selecione o estado</option>
            {brazilianStateOptions.map(([code, label]) => (
              <option key={code} value={label}>
                {label}
              </option>
            ))}
            {form.region &&
              !(
                brazilianStateOptions as readonly (readonly [string, string])[]
              ).some(([, label]) => label === form.region) && (
                <option value={form.region}>{form.region} (legado)</option>
              )}
          </select>
        </label>
        <label>
          Localização aproximada
          <input
            maxLength={180}
            placeholder="Ex.: Asa Sul e região — nunca informe endereço privado"
            value={form.locationNote}
            onChange={e => update("locationNote", e.target.value)}
          />
        </label>
        <label>
          Idade pública
          <input
            type="number"
            min={18}
            max={99}
            placeholder="Ex.: 28"
            value={form.age}
            onChange={e => update("age", e.target.value)}
          />
        </label>
        <MultiSelectField
          label="Idiomas"
          options={withLegacyValues(languageOptions, form.languages)}
          value={form.languages}
          onChange={value => update("languages", value)}
          help="Clique para escolher vários idiomas."
        />
        <label>
          Telefone para ligação — DDI e DDD
          <input
            maxLength={40}
            placeholder="Ex.: +55 61 99999-9999"
            value={form.phone}
            onChange={e => update("phone", e.target.value)}
          />
        </label>
        <label>
          WhatsApp (opcional)
          <input
            maxLength={40}
            placeholder="Se vazio, usa o telefone informado"
            value={form.whatsapp}
            onChange={e => update("whatsapp", e.target.value)}
          />
        </label>
        <label>
          Horários e disponibilidade
          <input
            maxLength={160}
            placeholder="Ex.: Todos os dias, das 10h às 22h"
            value={form.availabilityLabel}
            onChange={e => update("availabilityLabel", e.target.value)}
          />
        </label>
        <MultiSelectField
          label="Características do anúncio"
          options={withLegacyValues(profileAttributeOptions, form.attributes)}
          value={form.attributes}
          onChange={value => update("attributes", value)}
        />
        <MultiSelectField
          label="Preferências / modalidades"
          options={withLegacyValues(profilePreferenceOptions, form.preferences)}
          value={form.preferences}
          onChange={value => update("preferences", value)}
        />
        <MultiSelectField
          label="Formas de contato autorizadas"
          options={withLegacyValues(contactMethodOptions, form.contactOptions)}
          value={form.contactOptions}
          onChange={value => update("contactOptions", value)}
        />
        <MultiSelectField
          label="Formas de pagamento aceitas"
          options={withLegacyValues(paymentMethodOptions, form.paymentMethods)}
          value={form.paymentMethods}
          onChange={value => update("paymentMethods", value)}
        />
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
      <MultiSelectField
        label="Tipo e categoria do anúncio"
        options={portfolioCategories}
        value={form.categories}
        onChange={value => update("categories", value)}
        help="Escolha todas as categorias que descrevem o anúncio."
      />
      <label>
        Valor a partir de (R$ por hora)
        <input
          inputMode="decimal"
          maxLength={12}
          placeholder="Ex.: 250"
          value={form.priceFrom}
          onChange={e => update("priceFrom", e.target.value)}
        />
      </label>
      <MultiSelectField
        label="Local de atendimento"
        options={attendancePlaceOptions}
        value={form.attendancePlaces}
        onChange={value => update("attendancePlaces", value)}
      />
      <MultiSelectField
        label="Serviços oferecidos"
        options={serviceOptions}
        value={form.services}
        onChange={value => update("services", value)}
      />
      <p className="studio-muted">
        Os contatos ficam protegidos durante o cadastro e só podem gerar ligação
        ou WhatsApp pelo fluxo autorizado após aprovação e publicação.{" "}
        {links.tel
          ? "Telefone válido para ligação."
          : "Informe um telefone válido."}{" "}
        {links.whatsapp ? "Link de WhatsApp será gerado automaticamente." : ""}
      </p>
      {(links.tel || links.whatsapp) && (
        <div
          className="studio-actions"
          aria-label="Prévia privada dos links de contato"
        >
          {links.tel && (
            <a className="studio-cta" href={links.tel}>
              Pré-visualizar ligação
            </a>
          )}
          {links.whatsapp && (
            <a
              className="studio-cta"
              href={links.whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              Pré-visualizar WhatsApp
            </a>
          )}
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
      <p className="studio-muted">
        O aceite é necessário para enviar fotos, vídeos e publicar. Você pode
        salvar o rascunho a qualquer momento. A revisão manual só é acionada em
        casos específicos ou quando o ambiente estiver configurado para isso.
      </p>
      <div className="studio-actions">
        <button disabled={busy} onClick={() => void saveDraft()}>
          Salvar rascunho
        </button>
        {!admin && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void publish()}
          >
            Publicar anúncio
          </button>
        )}
      </div>
      <section className="studio-panel">
        <h3>{portfolioTermsTitle}</h3>
        {!initial?.id ? (
          <p className="studio-muted">
            Salve o rascunho primeiro. O aceite será vinculado ao conteúdo atual
            do perfil e às mídias cadastradas.
          </p>
        ) : admin ? (
          <p className="studio-muted">
            O administrador prepara o conteúdo, mas somente o titular pode
            confirmar maioridade, direitos, responsabilidade e aceite
            contratual.
          </p>
        ) : (
          <>
            <p
              className={
                ownerTerms.data?.current ? "studio-notice" : "studio-muted"
              }
            >
              {ownerTerms.data?.current
                ? `Aceite vigente registrado em ${new Date(ownerTerms.data.acceptedAt!).toLocaleString("pt-BR")}.`
                : "Leia e confirme o termo para o conteúdo atual deste anúncio."}
            </p>
            <ol className="studio-terms">
              {portfolioTermsClauses.map(clause => (
                <li key={clause}>{clause}</li>
              ))}
            </ol>
            <p className="studio-muted">Versão {portfolioTermsVersion}</p>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={termsChecks.adultConfirmed}
                onChange={e =>
                  setTermsChecks(v => ({
                    ...v,
                    adultConfirmed: e.target.checked,
                  }))
                }
              />
              Confirmo que tenho 18 anos ou mais.
            </label>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={termsChecks.rightsConfirmed}
                onChange={e =>
                  setTermsChecks(v => ({
                    ...v,
                    rightsConfirmed: e.target.checked,
                  }))
                }
              />
              Confirmo que possuo os direitos e autorizações necessários sobre
              os dados, fotos e vídeos.
            </label>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={termsChecks.responsibilityConfirmed}
                onChange={e =>
                  setTermsChecks(v => ({
                    ...v,
                    responsibilityConfirmed: e.target.checked,
                  }))
                }
              />
              Assumo a responsabilidade pelo conteúdo que envio ou autorizo
              publicar.
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
                  setTermsChecks({
                    adultConfirmed: false,
                    rightsConfirmed: false,
                    responsibilityConfirmed: false,
                  });
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
              {admin
                ? "Adicionar arquivo em nome do titular"
                : "Adicionar arquivo"}
              <input
                disabled={busy || !consent}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
                onChange={e => {
                  upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="studio-muted">
              {consent
                ? "Imagens até 12 MB e vídeos até 100 MB. A galeria só fica pública quando o anúncio for publicado."
                : "Marque a autorização do conteúdo acima para liberar o envio de fotos e vídeos."}{" "}
              {admin
                ? "O titular ainda precisa revisar o material e aceitar o termo."
                : "Casos específicos podem passar por revisão manual."}
            </p>
            <div className="studio-media">
              {media.map((m, index) => {
                const draft = mediaEdits[m.id] || {
                  title: m.title || "",
                  description: m.description || "",
                };
                return (
                  <article key={m.id}>
                    {m.kind === "photo" ? (
                      <img
                        src={`/api/media-preview/${m.id}`}
                        alt={draft.title || "Foto do anúncio"}
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
                      <div className="studio-fields">
                        <label>
                          Título da mídia
                          <input
                            maxLength={160}
                            value={draft.title}
                            onChange={e =>
                              setMediaEdits(current => ({
                                ...current,
                                [m.id]: { ...draft, title: e.target.value },
                              }))
                            }
                          />
                        </label>
                        <label>
                          Descrição da mídia
                          <textarea
                            rows={3}
                            maxLength={2000}
                            value={draft.description}
                            onChange={e =>
                              setMediaEdits(current => ({
                                ...current,
                                [m.id]: {
                                  ...draft,
                                  description: e.target.value,
                                },
                              }))
                            }
                          />
                        </label>
                        <div className="studio-actions">
                          <button
                            disabled={busy || updateMediaMetadata.isPending}
                            onClick={() => void saveMediaMetadata(m)}
                          >
                            Salvar metadados
                          </button>
                          <button
                            disabled={
                              busy || reorderMedia.isPending || index === 0
                            }
                            onClick={() => void moveMedia(index, -1)}
                          >
                            Subir
                          </button>
                          <button
                            disabled={
                              busy ||
                              reorderMedia.isPending ||
                              index === media.length - 1
                            }
                            onClick={() => void moveMedia(index, 1)}
                          >
                            Descer
                          </button>
                        </div>
                      </div>
                    )}
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
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
