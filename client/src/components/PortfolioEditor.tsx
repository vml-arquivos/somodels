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
import MediaManager, { type UploadQueueItem } from "@/components/MediaManager";
import { preparePhotoFile } from "@/lib/photo";

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

export { preparePhotoFile };

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
  const save = trpc.profiles.save.useMutation();
  const publishMine = trpc.profiles.publishMine.useMutation();
  const adminSave = trpc.management.saveProfile.useMutation();
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
          : "Anúncio salvo. Falta pouco para publicar"
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
    const maxBytes = (kind === "video" ? 100 : 40) * 1024 * 1024;
    if (item.file.size > maxBytes) {
      updateUploadItem(item.id, {
        status: "error",
        progress: 0,
        error: `${item.file.name}: fotos até 40 MB e vídeos até 100 MB`,
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

  async function uploadFiles(fileList: FileList | File[] | null) {
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
          Preencha o que souber e salve. Dá para voltar depois e terminar. Envie
          as fotos e toque em &ldquo;Publicar anúncio&rdquo; para entrar no ar.
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
          Endereço do perfil (opcional)
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
        Seu número só aparece quando alguém toca em &ldquo;WhatsApp&rdquo; ou
        &ldquo;Ligar&rdquo; no seu anúncio. Ele não fica escrito na página.{" "}
        {links.tel
          ? "Telefone válido para ligação."
          : "Informe um telefone válido."}{" "}
        {links.whatsapp ? "Link de WhatsApp será gerado automaticamente." : ""}
      </p>
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
      ) : null}
      <MediaManager
        profileId={activeProfileId}
        media={media}
        coverUrl={initial?.avatarUrl}
        admin={admin}
        busy={busy}
        uploadLocked={admin && !consent}
        queue={uploadQueue}
        onFiles={files => void uploadFiles(files)}
        onRetry={item => void retryUpload(item)}
        onCancel={cancelUpload}
        onChanged={() => {
          if (activeProfileId) onSaved(activeProfileId);
        }}
      />
      <div className="studio-actions ep-publish-bar">
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
    </div>
  );
}
