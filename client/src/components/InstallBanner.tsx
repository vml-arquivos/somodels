import { useEffect, useState } from "react";
import { useInstall } from "@/lib/install";

const KEY = "ero-install-hidden-until";

function hiddenNow() {
  try {
    return Number(localStorage.getItem(KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

/** Convite para instalar o aplicativo (só no celular, só no navegador). */
export default function InstallBanner() {
  const { canPrompt, standalone, ios, install } = useInstall();
  const [visible, setVisible] = useState(false);
  const [help, setHelp] = useState(false);
  const available = !standalone && (canPrompt || ios);

  useEffect(() => {
    if (!available || hiddenNow()) return;
    const timer = window.setTimeout(() => setVisible(true), 7000);
    return () => window.clearTimeout(timer);
  }, [available]);

  if (!visible || !available) return null;

  const hide = (days: number) => {
    try {
      localStorage.setItem(KEY, String(Date.now() + days * 86400000));
    } catch {
      /* sem armazenamento: o aviso volta na próxima visita */
    }
    setVisible(false);
  };

  return (
    <aside className="ep-install" aria-label="Instalar aplicativo">
      <img src="/brand/icon-192.png" alt="" width="44" height="44" />
      <div className="ep-install-text">
        <strong>Instale o app</strong>
        <span>
          {help
            ? "Toque em Compartilhar e depois em Adicionar à Tela de Início."
            : "Abra direto da tela inicial, em tela cheia."}
        </span>
      </div>
      {canPrompt ? (
        <button
          type="button"
          className="ep-install-go"
          onClick={() => void install().then(done => done && setVisible(false))}
        >
          Instalar
        </button>
      ) : (
        <button
          type="button"
          className="ep-install-go"
          onClick={() => setHelp(value => !value)}
        >
          Como
        </button>
      )}
      <button
        type="button"
        className="ep-install-close"
        aria-label="Agora não"
        onClick={() => hide(14)}
      >
        ×
      </button>
    </aside>
  );
}
