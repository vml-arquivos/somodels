import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const assetsDir = path.resolve("dist/public/assets");
const budgetBytes = 650 * 1024;
const files = await readdir(assetsDir);
const javascript = files.filter(file => file.endsWith(".js"));
if (!javascript.length) throw new Error("Nenhum bundle JavaScript foi encontrado em dist/public/assets");

const sizes = await Promise.all(
  javascript.map(async file => ({ file, bytes: (await stat(path.join(assetsDir, file))).size }))
);
const largest = sizes.sort((a, b) => b.bytes - a.bytes)[0];
console.log(`[bundle] maior chunk: ${largest.file} ${(largest.bytes / 1024).toFixed(1)} KiB; limite ${(budgetBytes / 1024).toFixed(0)} KiB`);
if (largest.bytes > budgetBytes) {
  throw new Error(`Budget de bundle excedido: ${largest.file} tem ${largest.bytes} bytes`);
}
