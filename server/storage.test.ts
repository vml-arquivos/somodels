import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(path.join(os.tmpdir(), "ero-storage-"));
let storage: typeof import("./storage");

beforeAll(async () => {
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = dir;
  storage = await import("./storage");
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("armazenamento local", () => {
  it("grava o arquivo com sufixo único e devolve a rota pública", async () => {
    const result = await storage.storagePut("profiles/1/2/photo/a.jpg", Buffer.from("abc"), "image/jpeg");
    expect(result.key).toMatch(/^profiles\/1\/2\/photo\/a_[0-9a-f]{8}\.jpg$/);
    expect(result.url).toBe(`/manus-storage/${result.key}`);
    expect(readFileSync(path.join(dir, result.key), "utf8")).toBe("abc");
  });

  it("não deixa sair da pasta de mídias", () => {
    expect(() => storage.resolveLocalPath("../fora.txt")).toThrow();
    expect(() => storage.resolveLocalPath("a/../../fora.txt")).toThrow();
    expect(storage.resolveLocalPath("/a/b.jpg")).toBe(path.join(dir, "a", "b.jpg"));
  });

  it("dois envios do mesmo nome não se sobrescrevem", async () => {
    const a = await storage.storagePut("x/y.png", Buffer.from("1"), "image/png");
    const b = await storage.storagePut("x/y.png", Buffer.from("2"), "image/png");
    expect(a.key).not.toBe(b.key);
  });
});
