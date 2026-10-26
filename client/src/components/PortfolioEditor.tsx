import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  portfolioCategories,
  portfolioPolicy,
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
import {
  loadCitiesForState,
  neighborhoodOptionsFor,
  stateCodeByLabel,
  stateLabelByCode,
} from "@shared/locations";
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

type UploadQueueItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "uploaded" | "error" | "cancelled";
  progress: number;
  error?: string;
};

async function preparePhotoFile(file: File) {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const largestSide = Math.max(bitmap.width, bitmap.height);
    if (largestSide <= 2000) {
      bitmap.close();
      return file;
    }
    const ratio = 2000 / largestSide;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

export default function PortfolioEditor({
  initial,
  media = [],
  ownerId,
  admin = false,
  onSaved,
}: Props) {
  const initialRegion =
    initial?.region || (!initial ? stateLabelByCode.DF : "");
  const [form, setForm] = useState({
    stageName: initial?.stageName || "",
    slug: initial?.slug || "",
    description: initial?.description || "",
    age: initial?.age ? String(initial.age) : "",
    city: initial?.city || (!initial ? "Brasília" : ""),
    region: initialRegion,
    neighborhood: initial?.neighborhood || "",
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
  const [cityOptions, setCityOptions] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | undefined>(
    initial?.id
  );
  const uploadControllers = useRef<Record<string, XMLHttpRequest>>({});
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
  const update = (key: string, value: any) =>
    setForm(f => ({ ...f, [key]: value }));
  const links = contactLinks(form.phone, form.whatsapp);
  const stateCode = stateCodeByLabel[form.region];
  const neighborhoodOptions: readonly string[] = neighborhoodOptionsFor(
    stateCode,
    form.city
  );
  useEffect(() => {
    let cancelled = false;
    if (!stateCode) {
      setCityOptions([]);
      return () => {
        cancelled = true;
      };
    }
    void loadCitiesForState(stateCode).then(cities => {
      if (!cancelled) setCityOptions(cities);
    });
    return () => {
      cancelled = true;
    };
  }, [stateCode]);
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
          ? "Metadados salvos; publique novamente para atualizar a vitrine"
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
  function buildPayload(id = activeProfileId) {
    const { priceFrom, ...formFields } = form;
    const priceFromCents = reaisToCents(priceFrom);
    if (priceFrom.trim() && priceFromCents === null) {
      throw new Error("Informe um valor válido em reais (ex.: 250 ou 250,00)");
    }
    return {
      ...formFields,
      locationNote: form.neighborhood || form.locationNote,
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
      const profileId = Number(
        await adminSave.mutateAsync({
          ...payload,
          ownerId: ownerId!,
        })
      );
      setActiveProfileId(profileId);
      return profileId;
    }
    const profileId = Number(
      await save.mutateAsync({ ...payload, submitForReview: false })
    );
    setActiveProfileId(profileId);
    return profileId;
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
    setBusy(true);
    try {
      const id = await persistDraft();
      const result = await publishMine.mutateAsync({ id });
      toast.success(
        result.isPublished
          ? "Anúncio publicado na vitrine"
          : "Anúncio enviado para revisão"
      );
      onSaved(id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function updateUploadItem(id: string, patch: Partial<UploadQueueItem>) {
    setUploadQueue(current =>
      current.map(item => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  async function sendUploadItem(item: UploadQueueItem, profileId: number) {
    const kind: "photo" | "video" = item.file.type.startsWith("video/")
      ? "video"
      : "photo";
    const maxBytes = (kind === "video" ? 100 : 12) * 1024 * 1024;
    if (item.file.size > maxBytes) {
      updateUploadItem(item.id, {
        status: "error",
        progress: 0,
        error: `${item.file.name}: fotos até 12 MB e vídeos até 100 MB`,
      });
      return false;
    }
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ].includes(item.file.type)
    ) {
      updateUploadItem(item.id, {
        status: "error",
        progress: 0,
        error: `${item.file.name}: formato não permitido`,
      });
      return false;
    }

    updateUploadItem(item.id, {
      status: "uploading",
      progress: 1,
      error: undefined,
    });
    try {
      const file =
        kind === "photo" ? await preparePhotoFile(item.file) : item.file;
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = event => {
          if (event.lengthComputable) {
            updateUploadItem(item.id, {
              progress: Math.max(
                1,
                Math.round((event.loaded / event.total) * 20)
              ),
            });
          }
        };
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("Não foi possível ler o arquivo"));
        reader.onabort = () =>
          reject(new DOMException("Upload cancelado", "AbortError"));
        reader.readAsDataURL(file);
      });
      const xhr = new XMLHttpRequest();
      uploadControllers.current[item.id] = xhr;
      const result = await new Promise<{ ok: boolean; message?: string }>(
        (resolve, reject) => {
          xhr.open("POST", "/api/upload/media");
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.upload.onprogress = event => {
            if (event.lengthComputable) {
              updateUploadItem(item.id, {
                progress: 20 + Math.round((event.loaded / event.total) * 80),
              });
            }
          };
          xhr.onload = () => {
            let payload: { error?: string } = {};
            try {
              payload = JSON.parse(xhr.responseText) as { error?: string };
            } catch {
              // The status below still provides a useful failure state.
            }
            resolve({
              ok: xhr.status >= 200 && xhr.status < 300,
              message: payload.error,
            });
          };
          xhr.onerror = () =>
            reject(new Error("Falha de conexão durante o envio"));
          xhr.onabort = () =>
            reject(new DOMException("Upload cancelado", "AbortError"));
          xhr.send(
            JSON.stringify({
              profileId,
              kind,
              filename: file.name,
              contentType: file.type,
              ...(admin ? { consent: true } : {}),
              data,
            })
          );
        }
      );
      if (!result.ok) throw new Error(result.message || "Falha no envio");
      updateUploadItem(item.id, { status: "uploaded", progress: 100 });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no envio";
      if (message === "Upload cancelado") {
        updateUploadItem(item.id, { status: "cancelled", error: message });
      } else {
        updateUploadItem(item.id, { status: "error", error: message });
      }
      return false;
    } finally {
      delete uploadControllers.current[item.id];
    }
  }

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (admin && !consent) {
      toast.error("Confirme a autorização do titular antes de enviar");
      return;
    }
    setBusy(true);
    try {
      const profileId = activeProfileId || (await persistDraft());
      const queue = files.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
        file,
        status: "queued" as const,
        progress: 0,
      }));
      setUploadQueue(queue);
      let uploaded = 0;
      for (const item of queue) {
        if (await sendUploadItem(item, profileId)) uploaded += 1;
      }
      toast.success(
        uploaded === files.length
          ? `${uploaded} arquivo${uploaded === 1 ? "" : "s"} adicionado${uploaded === 1 ? "" : "s"} à galeria`
          : `${uploaded} de ${files.length} arquivos enviados; revise os itens com erro`
      );
      if (uploaded === files.length) onSaved(profileId);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function retryUpload(item: UploadQueueItem) {
    const profileId = activeProfileId;
    if (!profileId || busy) return;
    setBusy(true);
    try {
      const uploaded = await sendUploadItem(item, profileId);
      const hasRemainingErrors = uploadQueue.some(
        queued => queued.id !== item.id && queued.status === "error"
      );
      if (uploaded && !hasRemainingErrors) onSaved(profileId);
    } finally {
      setBusy(false);
    }
  }

  function cancelUpload(id: string) {
    uploadControllers.current[id]?.abort();
    updateUploadItem(id, { status: "cancelled", error: "Upload cancelado" });
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
          Estado / região
          <select
            value={form.region}
            onChange={e =>
              setForm(current => ({
                ...current,
                region: e.target.value,
                city: "",
                neighborhood: "",
                locationNote: "",
              }))
            }
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
          Cidade de atendimento
          <select
            value={form.city}
            disabled={!stateCode}
            onChange={e =>
              setForm(current => ({
                ...current,
                city: e.target.value,
                neighborhood: "",
                locationNote: "",
              }))
            }
          >
            <option value="">Selecione a cidade</option>
            {form.city && !cityOptions.includes(form.city) && (
              <option value={form.city}>{form.city} (legado)</option>
            )}
            {cityOptions.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bairro ou região aproximada
          <select
            value={form.neighborhood}
            disabled={!form.city}
            onChange={e => update("neighborhood", e.target.value)}
          >
            <option value="">Selecione uma opção</option>
            {form.neighborhood &&
              !neighborhoodOptions.includes(form.neighborhood) && (
                <option value={form.neighborhood}>
                  {form.neighborhood} (legado)
                </option>
              )}
            {neighborhoodOptions.map(neighborhood => (
              <option key={neighborhood} value={neighborhood}>
                {neighborhood}
              </option>
            ))}
          </select>
        </label>
        <div className="studio-location-summary" role="status">
          <strong>Região aproximada</strong>
          <span>
            {form.neighborhood ||
              form.locationNote ||
              "Escolha o bairro ou região"}
          </span>
          {!form.neighborhood && form.locationNote && (
            <small>
              Valor antigo preservado. Escolha uma opção para atualizar a
              localização.
            </small>
          )}
        </div>
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
          Telefone / WhatsApp (com DDD)
          <input
            maxLength={40}
            inputMode="tel"
            placeholder="(61) 99999-9999"
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
          className="studio-contact-preview"
          aria-label="Prévia privada dos links de contato"
        >
          {links.tel && <a href={links.tel}>testar ligação</a>}
          {links.whatsapp && (
            <a href={links.whatsapp} target="_blank" rel="noreferrer">
              testar WhatsApp
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
      {admin ? (
        <>
          <label className="studio-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
            />
            Confirmo que estas informações e arquivos foram fornecidos ou
            autorizados pelo titular para preparar este perfil.{" "}
            {portfolioPolicy}
          </label>
          <p className="studio-muted">
            Esta confirmação operacional é exigida apenas quando a equipe
            prepara um anúncio em nome do titular.
          </p>
        </>
      ) : (
        <p className="studio-muted">
          O aceite de maioridade, autorização e responsabilidade é único na
          conta. Ele não é repetido ao salvar, editar ou anexar mídia deste
          anúncio.
        </p>
      )}
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
      {!admin && (
        <p className="studio-notice">
          O aceite de maioridade, autorização e responsabilidade é feito uma
          única vez na conta. Se a conta ainda não estiver confirmada, abra
          <a href="/conta"> Minha conta</a> para concluir antes de publicar.
        </p>
      )}
      <section className="studio-panel">
        <h3>Fotos e vídeos do anúncio</h3>
        <>
          <label>
            {admin
              ? "Adicionar arquivo em nome do titular"
              : "Adicionar arquivo"}
            <input
              disabled={busy || (admin && !consent)}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
              onChange={e => {
                void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <p className="studio-muted">
            {admin && !consent
              ? "Marque a autorização operacional acima para liberar o envio."
              : "Imagens até 12 MB e vídeos até 100 MB. Você pode selecionar vários arquivos; o rascunho é salvo automaticamente quando necessário."}{" "}
            A galeria só fica pública quando o anúncio for publicado.
          </p>
          {uploadQueue.length > 0 && (
            <div className="studio-upload-queue" aria-live="polite">
              <strong>Fila de envio</strong>
              {uploadQueue.map(item => (
                <div className="studio-upload-row" key={item.id}>
                  <span className="studio-upload-name">{item.file.name}</span>
                  <progress max="100" value={item.progress} />
                  <span className={`studio-upload-status is-${item.status}`}>
                    {item.status === "queued" && "aguardando"}
                    {item.status === "uploading" && `${item.progress}%`}
                    {item.status === "uploaded" && "enviado"}
                    {item.status === "cancelled" && "cancelado"}
                    {item.status === "error" && (item.error || "erro")}
                  </span>
                  {item.status === "error" && (
                    <button
                      type="button"
                      onClick={() => void retryUpload(item)}
                      disabled={busy}
                    >
                      tentar de novo
                    </button>
                  )}
                  {(item.status === "queued" ||
                    item.status === "uploading") && (
                    <button
                      type="button"
                      onClick={() => cancelUpload(item.id)}
                      disabled={item.status === "queued"}
                    >
                      cancelar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
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
      </section>
    </div>
  );
}
