import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ getApprovedAgeVerification: vi.fn(), getMediaByStorageKey: vi.fn(), hasPremiumAccess: vi.fn(), isMediaProfilePublic: vi.fn() }));
vi.mock("./db", () => db);
vi.mock("./_core/context", () => ({ createContext: vi.fn() }));
vi.mock("./_core/env", () => ({ ENV: { publicAccessEnabled: true }, runtimeConfigStatus: () => ({ ageVerification: true }) }));
import { registerStorageProxy } from "./_core/storageProxy";
let handler: any;
beforeEach(() => {
  vi.clearAllMocks();
  registerStorageProxy({ get: (_path: string, fn: unknown) => { handler = fn; } } as any);
});
async function request() {
  const res: any = { status: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() };
  await handler({ params: { 0: "known-key" }, headers: {} }, res);
  return res;
}
describe("media withdrawal", () => {
  it("denies approved media when its profile or owner is no longer public", async () => {
    db.getMediaByStorageKey.mockResolvedValue({ status: "approved", profileId: 42 });
    db.isMediaProfilePublic.mockResolvedValue(false);
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.isMediaProfilePublic).toHaveBeenCalledWith(42);
    expect(db.getApprovedAgeVerification).not.toHaveBeenCalled();
  });
  it("still requires age verification for media on an eligible profile", async () => {
    db.getMediaByStorageKey.mockResolvedValue({ status: "approved", profileId: 42 });
    db.isMediaProfilePublic.mockResolvedValue(true);
    expect((await request()).status).toHaveBeenCalledWith(403);
  });
  it("denies unapproved media before checking the profile", async () => {
    db.getMediaByStorageKey.mockResolvedValue({ status: "pending", profileId: 42 });
    expect((await request()).status).toHaveBeenCalledWith(404);
    expect(db.isMediaProfilePublic).not.toHaveBeenCalled();
  });
});
