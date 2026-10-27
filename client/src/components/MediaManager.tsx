import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { frameStyle } from "@/lib/frame";

export type UploadQueueItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "uploaded" | "error" | "cancelled";
  progress: number;
  error?: string;
};

type MediaItem = {
  id: number;
  kind: "photo" | "video";
  status: string;
  url?: string | null;
  title?: string | null;
  description?: string | null;
};

type Props = {
  profileId?: number;
  media: MediaItem[];
  coverUrl?: string | null;
  admin: boolean;
  busy: boolean;
  uploadLocked: boolean;
  queue: UploadQueueItem[];
  onFiles: (files: FileList | File[] | null) => void;
  onRetry: (item: UploadQueueItem) => void;
  onCancel: (id: string) => void;
  onChanged: () => void;
};

const statusText: Record<string, string> = {
  pending: "Em análise",
  rejected: "Recusada",
  private: "Privada",
};

const icons = {
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  upload: "M12 16V5M7.5 9.5 12 5l4.5 4.5M5 19h14",
  video: "M3 7h11v10H3zM14 11l7-4v10l-7-4",
} as const;

function Icon({ name, size = 18 }: { name: keyof typeof icons; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[name]} />
    </svg>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger" | "on";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`mm-icon${tone ? ` is-${tone}` : ""}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function MediaManager({
  profileId,
  media,
  coverUrl,
  admin,
  busy,
  uploadLocked,
  queue,
  onFiles,
  onRetry,
  onCancel,
  onChanged,
}: Props) {
  const cover = trpc.profiles.cover.useMutation();
  const hide = trpc.profiles.hideMedia.useMutation();
  const updateMeta = trpc.profiles.updateMediaMetadata.useMutation();
  const reorder = trpc.profiles.reorderMedia.useMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [confirmHide, setConfirmHide] = useState<number | null>(null);
  const working =
    busy ||
    cover.isPending ||
    hide.isPending ||
    updateMeta.isPending ||
    reorder.isPending;

  useEffect(() => {
    if (!editing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const photos = media.filter(item => item.kind === "photo").length;
  const videos = media.length - photos;
  const pending = queue.filter(
    item => item.status === "queued" || item.status === "uploading"
  ).length;

  async function saveOrder(ids: number[]) {
    if (!profileId) return;
    try {
      await reorder.mutateAsync({ profileId, mediaIds: ids });
      onChanged();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  function move(index: number, to: number) {
    if (to < 0 || to >= media.length || to === index) return;
    const ids = media.map(item => item.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(to, 0, moved);
    void saveOrder(ids);
  }

  async function makeCover(item: MediaItem) {
    try {
      await cover.mutateAsync({ id: item.id });
      toast.success("Capa atualizada");
      onChanged();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function removeItem(item: MediaItem) {
    try {
      await hide.mutateAsync({ id: item.id });
      setConfirmHide(null);
      onChanged();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function saveDetails() {
    if (!editing) return;
    try {
      await updateMeta.mutateAsync({ id: editing.id, ...draft });
      toast.success(
        editing.status === "approved"
          ? "Salvo. Publique de novo para atualizar a vitrine"
          : "Salvo"
      );
      setEditing(null);
      onChanged();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <section className="studio-panel ep-photos mm" aria-labelledby="mm-title">
      <header className="mm-head">
        <div>
          <h3 id="mm-title">Fotos e vídeos</h3>
          <p>
            {media.length === 0
              ? "Nenhum arquivo ainda."
              : `${photos} foto${photos === 1 ? "" : "s"}${videos ? ` · ${videos} vídeo${videos === 1 ? "" : "s"}` : ""}`}
            {!admin && media.length > 1 && " · arraste para mudar a ordem"}
          </p>
        </div>
      </header>

      <div
        className={`mm-drop${over ? " is-over" : ""}${uploadLocked ? " is-locked" : ""}`}
        onDragOver={event => {
          if (uploadLocked || busy) return;
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={event => {
          setOver(false);
          if (uploadLocked || busy) return;
          if (!event.dataTransfer.files.length) return;
          event.preventDefault();
          onFiles(event.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={26} />
        <p>
          <strong>
            {admin
              ? "Adicionar arquivos em nome do titular"
              : "Arraste as fotos e vídeos aqui"}
          </strong>
          {!admin && " ou "}
          <button
            type="button"
            className="mm-pick"
            disabled={busy || uploadLocked}
            onClick={() => inputRef.current?.click()}
          >
            escolha do aparelho
          </button>
        </p>
        <small>
          {uploadLocked
            ? "Marque a autorização acima para liberar o envio."
            : "Pode marcar vários de uma vez. Fotos até 40 MB (reduzimos sozinhos, sem cortar) e vídeos até 100 MB."}
        </small>
        <input
          ref={inputRef}
          hidden
          type="file"
          multiple
          disabled={busy || uploadLocked}
          accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
          onChange={event => {
            onFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <ul className="mm-queue" aria-live="polite">
          {queue.map(item => (
            <li key={item.id} className={`is-${item.status}`}>
              <span className="mm-queue-name">{item.file.name}</span>
              {item.status === "uploading" || item.status === "queued" ? (
                <progress max="100" value={item.progress} />
              ) : null}
              <span className="mm-queue-state">
                {item.status === "queued" && "aguardando"}
                {item.status === "uploading" && `${item.progress}%`}
                {item.status === "uploaded" && "enviado"}
                {item.status === "cancelled" && "cancelado"}
                {item.status === "error" && (item.error || "erro")}
              </span>
              {item.status === "error" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRetry(item)}
                >
                  Tentar de novo
                </button>
              )}
              {(item.status === "queued" || item.status === "uploading") && (
                <button
                  type="button"
                  disabled={item.status === "queued"}
                  onClick={() => onCancel(item.id)}
                >
                  Cancelar
                </button>
              )}
            </li>
          ))}
          {pending === 0 && queue.every(item => item.status === "uploaded") && (
            <li className="mm-queue-done">Tudo enviado.</li>
          )}
        </ul>
      )}

      {media.length > 0 && (
        <ul className="mm-grid">
          {media.map((item, index) => {
            const src = `/api/media-preview/${item.id}`;
            const isCover =
              item.kind === "photo" && Boolean(coverUrl) && coverUrl === item.url;
            const canEdit = !admin;
            return (
              <li
                key={item.id}
                className={`mm-tile${dragIndex === index ? " is-drag" : ""}${dropIndex === index && dragIndex !== index ? " is-drop" : ""}`}
                draggable={canEdit && !working}
                onDragStart={event => {
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(item.id));
                }}
                onDragOver={event => {
                  if (dragIndex === null) return;
                  event.preventDefault();
                  setDropIndex(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                onDrop={event => {
                  if (dragIndex === null) return;
                  event.preventDefault();
                  const from = dragIndex;
                  setDragIndex(null);
                  setDropIndex(null);
                  move(from, index);
                }}
              >
                <div
                  className="mm-frame mf"
                  style={item.kind === "photo" ? frameStyle(src) : undefined}
                >
                  {item.kind === "photo" ? (
                    <img
                      src={src}
                      alt={item.title || "Foto do anúncio"}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <video
                      src={`${src}#t=0.1`}
                      preload="metadata"
                      muted
                      playsInline
                      controls
                    />
                  )}
                  <span className="mm-tags">
                    {isCover && <b className="is-cover">Capa</b>}
                    {item.kind === "video" && (
                      <b>
                        <Icon name="video" size={12} /> vídeo
                      </b>
                    )}
                    {statusText[item.status] && (
                      <b className={`is-${item.status}`}>
                        {statusText[item.status]}
                      </b>
                    )}
                  </span>
                  <span className="mm-order" aria-hidden="true">
                    {index + 1}
                  </span>
                </div>
                {canEdit && (
                  <div className="mm-actions">
                    {item.kind === "photo" && (
                      <IconButton
                        label={isCover ? "Esta é a capa" : "Usar como capa"}
                        tone={isCover ? "on" : undefined}
                        disabled={working || isCover}
                        onClick={() => void makeCover(item)}
                      >
                        <Icon name="star" />
                      </IconButton>
                    )}
                    <IconButton
                      label="Mover para antes"
                      disabled={working || index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <Icon name="left" />
                    </IconButton>
                    <IconButton
                      label="Mover para depois"
                      disabled={working || index === media.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <Icon name="right" />
                    </IconButton>
                    <IconButton
                      label="Título e descrição"
                      disabled={working}
                      onClick={() => {
                        setEditing(item);
                        setDraft({
                          title: item.title || "",
                          description: item.description || "",
                        });
                      }}
                    >
                      <Icon name="edit" />
                    </IconButton>
                    {confirmHide === item.id ? (
                      <button
                        type="button"
                        className="mm-confirm"
                        disabled={working}
                        onClick={() => void removeItem(item)}
                        onBlur={() => setConfirmHide(null)}
                        autoFocus
                      >
                        Remover?
                      </button>
                    ) : (
                      <IconButton
                        label="Remover do anúncio"
                        tone="danger"
                        disabled={working}
                        onClick={() => setConfirmHide(item.id)}
                      >
                        <Icon name="trash" />
                      </IconButton>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <div
          className="mm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mm-edit-title"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <div className="mm-modal-card">
            <h4 id="mm-edit-title">
              {editing.kind === "photo" ? "Sobre esta foto" : "Sobre este vídeo"}
            </h4>
            <label>
              Título (opcional)
              <input
                maxLength={160}
                value={draft.title}
                onChange={event =>
                  setDraft(current => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label>
              Descrição (opcional)
              <textarea
                rows={3}
                maxLength={2000}
                value={draft.description}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <div className="mm-modal-actions">
              <button type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                disabled={updateMeta.isPending}
                onClick={() => void saveDetails()}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
