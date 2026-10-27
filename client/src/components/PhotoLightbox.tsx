import { useEffect, useRef } from "react";

// Visualizador de fotos em tela cheia: setas do teclado, Esc para fechar,
// deslizar no celular. A foto aparece inteira, sem corte.
export default function PhotoLightbox({
  urls,
  index,
  name,
  onIndex,
  onClose,
}: {
  urls: string[];
  index: number;
  name: string;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = urls.length;
  const go = (step: number) => onIndex((index + step + count) % count);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className="lb"
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${name}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={event => {
        touchX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={event => {
        const start = touchX.current;
        touchX.current = null;
        if (start === null || count < 2) return;
        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
      }}
    >
      <button
        ref={closeRef}
        type="button"
        className="lb-close"
        aria-label="Fechar"
        onClick={onClose}
      >
        ×
      </button>
      {count > 1 && (
        <button
          type="button"
          className="lb-nav is-prev"
          aria-label="Foto anterior"
          onClick={() => go(-1)}
        >
          ‹
        </button>
      )}
      <img src={urls[index]} alt={`Foto ${index + 1} de ${name}`} />
      {count > 1 && (
        <button
          type="button"
          className="lb-nav is-next"
          aria-label="Próxima foto"
          onClick={() => go(1)}
        >
          ›
        </button>
      )}
      <p className="lb-count" aria-live="polite">
        {index + 1} / {count}
      </p>
    </div>
  );
}
