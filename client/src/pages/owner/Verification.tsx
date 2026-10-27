import { useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { preparePhotoFile } from "@/components/PortfolioEditor";
import {
  verificationDocLabels,
  verificationLimits,
  type VerificationDocKind,
} from "@shared/admin-crm";
import { Badge, Card, OIcon, fmtBytes, fmtDate, type Tone } from "./ui";

const statusInfo: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Em análise", tone: "warn" },
  approved: { label: "Identidade verificada", tone: "ok" },
  rejected: { label: "Verificação recusada", tone: "bad" },
  expired: { label: "Verificação vencida", tone: "bad" },
  error: { label: "Erro na verificação", tone: "bad" },
  none: { label: "Não enviada", tone: "mute" },
};

const slots: {
  kind: VerificationDocKind;
  help: string;
  accept: string;
  required: string;
}[] = [
  {
    kind: "doc_front",
    help: "RG ou CNH, frente, bem iluminada e sem cortar as bordas.",
    accept: "image/jpeg,image/png,image/webp",
    required: "Obrigatório",
  },
  {
    kind: "doc_back",
    help: "Verso do documento (se tiver).",
    accept: "image/jpeg,image/png,image/webp",
    required: "Opcional",
  },
  {
    kind: "selfie",
    help: "Seu rosto segurando o documento ao lado.",
    accept: "image/jpeg,image/png,image/webp",
    required: "Selfie ou vídeo",
  },
  {
    kind: "video",
    help: "Vídeo curto (até 15 s) mostrando o rosto e o documento. Pode ser no lugar da selfie.",
    accept: "video/mp4,video/webm,video/quicktime",
    required: "Selfie ou vídeo",
  },
];

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

function send(payload: Record<string, unknown>, onProgress: (n: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/verification");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
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

export default function VerificationCard() {
  const utils = trpc.useUtils();
  const q = trpc.owner.verification.useQuery();
  const [busy, setBusy] = useState<VerificationDocKind | null>(null);
  const [progress, setProgress] = useState(0);
  const inputs = useRef<Partial<Record<VerificationDocKind, HTMLInputElement | null>>>({});

  const refresh = () =>
    Promise.all([
      utils.owner.verification.invalidate(),
      utils.owner.overview.invalidate(),
      utils.profiles.identity.invalidate(),
    ]);
  const remove = trpc.owner.deleteVerificationDoc.useMutation({
    onSuccess: refresh,
    onError: e => toast.error(e.message),
  });
  const submit = trpc.owner.submitVerification.useMutation({
    onSuccess: async () => {
      toast.success("Enviado para análise. Avisamos aqui no painel quando houver resposta.");
      await refresh();
    },
    onError: e => toast.error(e.message),
  });

  async function pick(kind: VerificationDocKind, file: File | undefined) {
    if (!file) return;
    const isVideo = kind === "video";
    const limit = isVideo ? verificationLimits.videoBytes : verificationLimits.imageBytes;
    try {
      if (isVideo ? !file.type.startsWith("video/") : !file.type.startsWith("image/"))
        throw new Error(isVideo ? "Envie um vídeo MP4, MOV ou WebM" : "Envie uma foto JPG, PNG ou WebP");
      setBusy(kind);
      setProgress(0);
      const prepared = isVideo ? file : await preparePhotoFile(file);
      if (prepared.size > limit)
        throw new Error(`O arquivo passa do limite de ${Math.round(limit / 1024 / 1024)} MB`);
      const data = await readAsDataUrl(prepared);
      await send({ kind, contentType: prepared.type, data }, setProgress);
      toast.success(`${verificationDocLabels[kind]} enviado`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no envio");
    } finally {
      setBusy(null);
      const input = inputs.current[kind];
      if (input) input.value = "";
    }
  }

  const d = q.data;
  const info = statusInfo[d?.status ?? "none"] ?? statusInfo.none;
  const byKind = new Map((d?.docs ?? []).map(x => [x.kind, x]));

  return (
    <Card
      kicker="Segurança"
      title="Verificação de identidade"
      action={<Badge tone={info.tone}>{info.label}</Badge>}
    >
      {!d ? (
        <p className="od-muted">Carregando…</p>
      ) : d.status === "approved" ? (
        <p className="od-muted">
          Sua identidade está verificada
          {d.expiresAt ? ` até ${fmtDate(d.expiresAt)}` : ""}. Os arquivos enviados são apagados
          depois da análise.
        </p>
      ) : (
        <>
          <p className="od-muted">
            Enviamos para a equipe conferir seu nome, CPF e data de nascimento com o documento. Os
            arquivos ficam em área privada, são vistos só por quem faz a verificação e nunca
            aparecem no site.
          </p>
          {d.status === "rejected" && d.reason && (
            <p className="od-error" role="alert">
              Motivo da recusa: {d.reason}. Corrija e envie de novo.
            </p>
          )}
          {!d.personalComplete && (
            <p className="od-note">
              Antes de enviar, <Link href="/titular/dados">complete seus dados pessoais</Link> acima.
            </p>
          )}
          <div className="od-verify-grid">
            {slots.map(slot => {
              const doc = byKind.get(slot.kind);
              const uploading = busy === slot.kind;
              return (
                <div className={`od-verify-slot ${doc ? "is-done" : ""}`} key={slot.kind}>
                  <div>
                    <strong>{verificationDocLabels[slot.kind]}</strong>
                    <small className="od-muted">{slot.required}</small>
                  </div>
                  <p className="od-muted">{slot.help}</p>
                  {doc && (
                    <p className="od-muted">
                      <OIcon name="check" size={14} /> {fmtBytes(doc.sizeBytes)} enviado
                    </p>
                  )}
                  {uploading && (
                    <progress value={progress} max={100} aria-label="Enviando" />
                  )}
                  {!d.locked && (
                    <div className="od-form-actions">
                      <input
                        ref={el => {
                          inputs.current[slot.kind] = el;
                        }}
                        type="file"
                        accept={slot.accept}
                        hidden
                        onChange={e => void pick(slot.kind, e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        className="od-btn"
                        disabled={busy !== null}
                        onClick={() => inputs.current[slot.kind]?.click()}
                      >
                        <OIcon name="upload" size={16} />{" "}
                        {uploading ? "Enviando…" : doc ? "Trocar" : "Escolher arquivo"}
                      </button>
                      {doc && (
                        <button
                          type="button"
                          className="od-btn"
                          disabled={remove.isPending || busy !== null}
                          onClick={() => remove.mutate({ id: doc.id })}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {d.status === "pending" ? (
            <p className="od-note">
              Em análise desde {fmtDate(d.submittedAt)}. Enquanto isso os arquivos não podem ser
              trocados.
            </p>
          ) : (
            <div className="od-form-actions">
              <button
                type="button"
                className="od-btn is-primary"
                disabled={!d.canSubmit || submit.isPending || busy !== null}
                onClick={() => submit.mutate()}
              >
                <OIcon name="shield" size={16} />{" "}
                {submit.isPending ? "Enviando…" : "Enviar para análise"}
              </button>
              {!d.canSubmit && d.missing.length > 0 && (
                <small className="od-muted">
                  Falta: {d.missing.map(m => m.label).join(", ")}
                </small>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
