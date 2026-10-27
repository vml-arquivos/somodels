import type { CSSProperties } from "react";

/**
 * Quadro padrão das fotos: todas ficam do mesmo tamanho e a foto inteira
 * aparece, sem corte. O fundo usa a própria foto desfocada para não sobrar
 * barra vazia quando a foto é mais larga ou mais alta que o quadro.
 */
export function frameStyle(src?: string | null): CSSProperties | undefined {
  if (!src) return undefined;
  const safe = src.replace(/["\\\n\r()]/g, encodeURIComponent);
  return { ["--mf-src" as string]: `url("${safe}")` } as CSSProperties;
}
