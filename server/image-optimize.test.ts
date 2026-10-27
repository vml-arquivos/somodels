import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { optimizePhoto, photoLimits } from "./image-optimize";

async function noisyJpeg(width: number, height: number) {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919 + (i >> 5)) & 255;
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe("redução de fotos no envio", () => {
  it("vira WebP, limita o maior lado e não corta a foto", async () => {
    const source = await noisyJpeg(4000, 3000);
    const result = await optimizePhoto(source, "image/jpeg");
    expect(result.optimized).toBe(true);
    expect(result.contentType).toBe("image/webp");
    expect(result.extension).toBe(".webp");
    expect(result.width).toBe(photoLimits.maxSide);
    // 4000x3000 -> 2400x1800: mesma proporção, sem corte
    expect(result.height).toBe(1800);
    expect(result.buffer.byteLength).toBeLessThan(source.byteLength);
  });

  it("não amplia foto pequena e mantém a proporção vertical", async () => {
    const source = await noisyJpeg(600, 900);
    const result = await optimizePhoto(source, "image/jpeg");
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([600, 900]);
  });

  it("gira pela orientação do celular e descarta os metadados", async () => {
    const source = await sharp({
      create: { width: 800, height: 400, channels: 3, background: "#c33" },
    })
      .jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "x" } } })
      .toBuffer();
    const result = await optimizePhoto(source, "image/jpeg");
    const meta = await sharp(result.buffer).metadata();
    expect([meta.width, meta.height]).toEqual([400, 800]);
    expect(meta.exif).toBeUndefined();
  });

  it("devolve o original quando o arquivo não pode ser lido", async () => {
    const broken = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.from("isto não é uma foto"),
    ]);
    const result = await optimizePhoto(broken, "image/jpeg");
    expect(result.optimized).toBe(false);
    expect(result.buffer).toBe(broken);
    expect(result.contentType).toBe("image/jpeg");
  });
});
