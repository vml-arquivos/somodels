import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { preparePhotoFile } from "@/components/PortfolioEditor";
import {
  Badge,
  Card,
  Empty,
  ErrorBlock,
  LoadingBlock,
  OIcon,
  PageHead,
  fmtBytes,
  fmtDate,
} from "./ui";

const photoTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];
const LIMIT = 300;

type QueueItem = {
  key: string;
  name: string;
  status: "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

function sendToLibrary(
  payload: Record<string, unknown>,
  onProgress: (pct: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/library");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.upload.onprogress = event => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = "Falha no envio";
      try {
        message = JSON.parse(xhr.responseText).error || message;
      } catch {
        // mantém a mensagem padrão
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão durante o envio"));
    xhr.send(JSON.stringify(payload));
  });
}

export function LibraryThumb({
  id,
  kind,
  alt,
}: {
  id: number;
  kind: "photo" | "video";
  alt: string;
}) {
  const src = `/api/library-preview/${id}`;
  return kind === "photo" ? (
    <img src={src} alt={alt} loading="lazy" decoding="async" />
  ) : (
    <video
      src={`${src}#t=0.1`}
      preload="metadata"
      muted
      playsInline
      aria-label={alt}
    />
  );
}

export function AttachBar({
  selected,
  onDone,
  onClear,
  fixedProfileId,
}: {
  selected: number[];
  onDone: () => void;
  onClear: () => void;
  fixedProfileId?: number;
}) {
  const utils = trpc.useUtils();
  const mine = trpc.profiles.mine.useQuery(undefined, {
    enabled: !fixedProfileId,
  });
  const [target, setTarget] = useState<number | "">(fixedProfileId ?? "");
  const attach = trpc.owner.attachLibrary.useMutation({
    onSuccess: async result => {
      toast.success(
        result.added
          ? `${result.added} arquivo${result.added === 1 ? "" : "s"} adicionado${result.added === 1 ? "" : "s"} ao anúncio` +
              (result.skipped
                ? ` (${result.skipped} já estava${result.skipped === 1 ? "" : "m"} lá)`
                : "")
          : "Esses arquivos já estão no anúncio"
      );
      if (result.added && !result.autoApproved)
        toast.message("As novas mídias vão para análise antes de aparecer.");
      await Promise.all([
        utils.owner.library.invalidate(),
        utils.owner.overview.invalidate(),
        utils.profiles.mineById.invalidate(),
        utils.profiles.publicationReadiness.invalidate(),
      ]);
      onDone();
    },
    onError: error => toast.error(error.message),
  });
  const options = (mine.data ?? []) as any[];
  return (
    <div className="od-selbar" role="region" aria-label="Arquivos selecionados">
      <strong>
        {selected.length} selecionado{selected.length === 1 ? "" : "s"}
      </strong>
      {!fixedProfileId && (
        <select
          value={target}
          onChange={event =>
            setTarget(event.target.value ? Number(event.target.value) : "")
          }
          aria-label="Escolha o anúncio"
        >
          <option value="">Escolha o anúncio…</option>
          {options.map(p => (
            <option key={p.id} value={p.id}>
              {p.stageName} — {p.city}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="od-btn is-primary"
        disabled={!target || attach.isPending}
        onClick={() =>
          target &&
          attach.mutate({ profileId: Number(target), libraryIds: selected })
        }
      >
        {attach.isPending ? "Adicionando…" : "Usar no anúncio"}
      </button>
      <button type="button" className="od-btn" onClick={onClear}>
        Limpar seleção
      </button>
    </div>
  );
}

export function LibraryGrid({
  selectable,
  selected,
  setSelected,
  filterProfileId,
}: {
  selectable: boolean;
  selected: number[];
  setSelected: (next: number[]) => void;
  filterProfileId?: number;
}) {
  const utils = trpc.useUtils();
  const library = trpc.owner.library.useQuery();
  const [filter, setFilter] = useState<"all" | "photo" | "video" | "unused">(
    "all"
  );
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const rename = trpc.owner.renameLibraryItem.useMutation({
    onSuccess: async () => {
      setEditing(null);
      await utils.owner.library.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.owner.deleteLibraryItem.useMutation({
    onSuccess: async (_r, vars) => {
      toast.success("Arquivo removido da biblioteca");
      setSelected(selected.filter(id => id !== vars.id));
      await Promise.all([
        utils.owner.library.invalidate(),
        utils.owner.overview.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const items = library.data ?? [];
  const visible = useMemo(
    () =>
      items.filter(item =>
        filter === "all"
          ? true
          : filter === "unused"
            ? item.usedIn.length === 0
            : item.kind === filter
      ),
    [items, filter]
  );
  if (library.isLoading) return <LoadingBlock />;
  if (library.error) return <ErrorBlock message={library.error.message} />;
  if (!items.length)
    return (
      <Empty
        icon="image"
        title="Sua biblioteca está vazia"
        text="Envie fotos e vídeos uma vez e use onde quiser. Os arquivos ficam privados até você colocá-los em um anúncio."
      />
    );
  const counts = {
    all: items.length,
    photo: items.filter(i => i.kind === "photo").length,
    video: items.filter(i => i.kind === "video").length,
    unused: items.filter(i => i.usedIn.length === 0).length,
  };
  const labels: Record<typeof filter, string> = {
    all: "Todos",
    photo: "Fotos",
    video: "Vídeos",
    unused: "Sem uso",
  };
  return (
    <>
      <div
        className="od-filters"
        role="tablist"
        aria-label="Filtrar biblioteca"
      >
        {(Object.keys(labels) as (keyof typeof labels)[]).map(key => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? "is-active" : ""}
            onClick={() => setFilter(key)}
          >
            {labels[key]} <span>{counts[key]}</span>
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="od-muted">Nenhum arquivo neste filtro.</p>
      ) : (
        <ul className="od-media-grid">
          {visible.map(item => {
            const checked = selected.includes(item.id);
            const inCurrent =
              filterProfileId !== undefined &&
              item.usedIn.some(u => u.profileId === filterProfileId);
            return (
              <li key={item.id} className={checked ? "is-selected" : ""}>
                <div className="od-media-thumb">
                  <LibraryThumb
                    id={item.id}
                    kind={item.kind as "photo" | "video"}
                    alt={item.title || "Arquivo da biblioteca"}
                  />
                  {item.kind === "video" && (
                    <span className="od-media-tag">
                      <OIcon name="video" size={14} /> vídeo
                    </span>
                  )}
                  {selectable && (
                    <label className="od-media-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={inCurrent}
                        onChange={() =>
                          setSelected(
                            checked
                              ? selected.filter(id => id !== item.id)
                              : [...selected, item.id]
                          )
                        }
                      />
                      <span className="ep-sr">Selecionar</span>
                    </label>
                  )}
                </div>
                <div className="od-media-meta">
                  {editing === item.id ? (
                    <form
                      onSubmit={event => {
                        event.preventDefault();
                        rename.mutate({ id: item.id, title: draft });
                      }}
                    >
                      <input
                        autoFocus
                        value={draft}
                        maxLength={160}
                        onChange={event => setDraft(event.target.value)}
                        onBlur={() => setEditing(null)}
                        aria-label="Nome do arquivo"
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="od-media-title"
                      title="Clique para renomear"
                      onClick={() => {
                        setEditing(item.id);
                        setDraft(item.title || "");
                      }}
                    >
                      {item.title || "Sem nome"}
                    </button>
                  )}
                  <small>
                    {fmtBytes(item.sizeBytes)} · {fmtDate(item.createdAt)}
                  </small>
                  <div className="od-media-foot">
                    {inCurrent ? (
                      <Badge tone="ok">Já está neste anúncio</Badge>
                    ) : item.usedIn.length ? (
                      <Badge tone="info">
                        Em {item.usedIn.length} anúncio
                        {item.usedIn.length === 1 ? "" : "s"}
                      </Badge>
                    ) : (
                      <Badge>Sem uso</Badge>
                    )}
                    <button
                      type="button"
                      className="od-icon-btn"
                      aria-label="Remover da biblioteca"
                      title="Remover da biblioteca"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            item.usedIn.length
                              ? "Remover da biblioteca? O arquivo continua nos anúncios que já o usam."
                              : "Remover este arquivo da biblioteca?"
                          )
                        )
                          remove.mutate({ id: item.id });
                      }}
                    >
                      <OIcon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function Library() {
  const utils = trpc.useUtils();
  const library = trpc.owner.library.useQuery();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const busy = queue.some(item => item.status === "uploading");
  const total = library.data?.length ?? 0;

  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function patch(key: string, change: Partial<QueueItem>) {
    setQueue(list =>
      list.map(item => (item.key === key ? { ...item, ...change } : item))
    );
  }

  async function upload(files: File[]) {
    if (!files.length) return;
    if (total + files.length > LIMIT) {
      toast.error(
        `A biblioteca aceita até ${LIMIT} arquivos. Remova alguns para enviar mais.`
      );
      return;
    }
    const items = files.map((file, index) => ({
      file,
      key: `${Date.now()}-${index}-${file.name}`,
    }));
    setQueue(list => [
      ...items.map(
        ({ file, key }): QueueItem => ({
          key,
          name: file.name,
          status: "uploading",
          progress: 0,
        })
      ),
      ...list.filter(item => item.status === "uploading"),
    ]);
    let ok = 0;
    for (const { file, key } of items) {
      const kind = photoTypes.includes(file.type)
        ? "photo"
        : videoTypes.includes(file.type)
          ? "video"
          : null;
      try {
        if (!kind)
          throw new Error(
            "Formato não permitido (use JPG, PNG, WebP, AVIF, MP4, WebM ou MOV)"
          );
        const limit = kind === "video" ? 100 : 12;
        if (file.size > limit * 1024 * 1024)
          throw new Error(`Arquivo acima de ${limit} MB`);
        const prepared = kind === "photo" ? await preparePhotoFile(file) : file;
        const data = await readAsDataUrl(prepared);
        await sendToLibrary(
          {
            kind,
            filename: prepared.name,
            contentType: prepared.type,
            title: file.name.replace(/\.[^.]+$/, "").slice(0, 160),
            data,
          },
          pct => patch(key, { progress: pct })
        );
        patch(key, { status: "done", progress: 100 });
        ok += 1;
      } catch (error) {
        patch(key, {
          status: "error",
          error: error instanceof Error ? error.message : "Falha no envio",
        });
      }
    }
    await Promise.all([
      utils.owner.library.invalidate(),
      utils.owner.overview.invalidate(),
    ]);
    if (ok)
      toast.success(
        `${ok} arquivo${ok === 1 ? "" : "s"} guardado${ok === 1 ? "" : "s"} na biblioteca`
      );
  }

  return (
    <>
      <PageHead
        title="Biblioteca de mídia"
        subtitle="Guarde suas fotos e vídeos em um só lugar e escolha depois quais vão para cada anúncio. Nada aqui fica público até você usar em um anúncio."
        actions={
          <button
            type="button"
            className="od-btn is-primary"
            onClick={() => inputRef.current?.click()}
          >
            <OIcon name="upload" size={18} /> Enviar arquivos
          </button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept={[...photoTypes, ...videoTypes].join(",")}
        onChange={event => {
          void upload(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
      <div
        className={`od-drop ${dragging ? "is-over" : ""}`}
        onDragOver={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault();
          setDragging(false);
          void upload(Array.from(event.dataTransfer.files));
        }}
      >
        <OIcon name="upload" size={28} />
        <p>
          <strong>Arraste os arquivos aqui</strong> ou{" "}
          <button type="button" onClick={() => inputRef.current?.click()}>
            escolha do aparelho
          </button>
        </p>
        <small>
          Fotos até 12 MB (JPG, PNG, WebP, AVIF) e vídeos até 100 MB (MP4, WebM,
          MOV). {total} de {LIMIT} usados.
        </small>
      </div>

      {queue.length > 0 && (
        <Card title="Envios" className="od-queue-card">
          <ul className="od-queue" aria-live="polite">
            {queue.slice(0, 12).map(item => (
              <li key={item.key} className={`is-${item.status}`}>
                <span className="od-queue-name">{item.name}</span>
                {item.status === "uploading" && (
                  <span
                    className="od-progress is-small"
                    aria-label={`${item.progress}%`}
                  >
                    <span style={{ width: `${item.progress}%` }} />
                  </span>
                )}
                <span className="od-queue-state">
                  {item.status === "uploading" && `${item.progress}%`}
                  {item.status === "done" && "Guardado"}
                  {item.status === "error" && item.error}
                </span>
              </li>
            ))}
          </ul>
          {!busy && (
            <button
              type="button"
              className="od-btn"
              onClick={() => setQueue([])}
            >
              Limpar lista
            </button>
          )}
        </Card>
      )}

      {selected.length > 0 && (
        <AttachBar
          selected={selected}
          onClear={() => setSelected([])}
          onDone={() => setSelected([])}
        />
      )}
      <LibraryGrid selectable selected={selected} setSelected={setSelected} />
    </>
  );
}

/** Painel para usar a biblioteca dentro da edição de um anúncio. */
export function LibraryPicker({ profileId }: { profileId: number }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  return (
    <section className="od-card" aria-label="Fotos da biblioteca">
      <div className="od-card-head">
        <div>
          <p className="od-kicker">Biblioteca</p>
          <h2>Usar fotos da biblioteca</h2>
        </div>
      </div>
      <p className="od-muted">
        Escolha arquivos que você já guardou, sem precisar enviar de novo.
      </p>
      <button
        type="button"
        className="od-btn"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {open ? "Fechar biblioteca" : "Abrir biblioteca"}
      </button>
      {open && (
        <div className="od-picker">
          {selected.length > 0 && (
            <AttachBar
              fixedProfileId={profileId}
              selected={selected}
              onClear={() => setSelected([])}
              onDone={() => {
                setSelected([]);
                setOpen(false);
              }}
            />
          )}
          <LibraryGrid
            selectable
            selected={selected}
            setSelected={setSelected}
            filterProfileId={profileId}
          />
        </div>
      )}
    </section>
  );
}
