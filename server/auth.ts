import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";
import * as db from "./db";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./auth-crypto";
import { ENV } from "./_core/env";

export const LOCAL_SESSION_COOKIE = "so_models_session";

export async function authenticateLocalUser(email: string, password: string) {
  const user = await db.getUserByEmail(email.trim().toLowerCase());
  if (!user || !user.passwordHash || user.accountStatus !== "active") return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return user;
}

export async function createLocalSession(user: User) {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + ENV.sessionDurationHours * 60 * 60 * 1000);
  await db.createAuthSession(user.id, hashToken(token), expiresAt);
  return { token, expiresAt };
}

export async function authenticateLocalSession(token: string | undefined) {
  if (!token) return undefined;
  return db.getUserBySessionTokenHash(hashToken(token));
}

export async function revokeLocalSession(token: string | undefined) {
  if (!token) return;
  await db.revokeAuthSession(hashToken(token));
}

export async function registerTestUser(input: { email: string; password: string; name: string }) {
  if (!(ENV.testMode && ENV.testAccessEnabled && ENV.allowTestSignup)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "O cadastro de teste está desativado" });
  }
  assertPasswordPolicy(input.password);
  const email = input.email.trim().toLowerCase();
  const existing = await db.getUserByEmail(email);
  if (existing) {
    throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já possui uma conta de teste" });
  }
  const user = await db.createLocalUser({
    email,
    password: input.password,
    name: input.name.trim(),
    role: "user",
    mustChangePassword: false,
  });
  if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a conta de teste" });
  return user;
}

export async function bootstrapLocalAccounts() {
  const entries = [
    {
      email: ENV.bootstrapSuperAdminEmail,
      password: ENV.bootstrapSuperAdminPassword,
      name: "Só Models — Super Admin",
      role: "super_admin" as const,
    },
    {
      email: ENV.bootstrapDevEmail,
      password: ENV.bootstrapDevPassword,
      name: "Só Models — Desenvolvimento",
      role: "dev" as const,
    },
  ];
  for (const entry of entries) {
    if (!entry.email && !entry.password) continue;
    if (!entry.email || !entry.password || entry.password.length < 16) {
      throw new Error(`Bootstrap inválido para ${entry.role}: informe e-mail e senha com pelo menos 16 caracteres`);
    }
    await db.createLocalUser({ ...entry, mustChangePassword: true });
  }
}

export function assertPasswordPolicy(password: string) {
  if (password.length < 16) throw new TRPCError({ code: "BAD_REQUEST", message: "A senha precisa ter pelo menos 16 caracteres" });
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A senha precisa combinar maiúsculas, minúsculas e números" });
  }
}

export async function changePassword(userId: number, currentPassword: string, nextPassword: string) {
  assertPasswordPolicy(nextPassword);
  const account = await db.getUserById(userId);
  if (!account?.passwordHash || !(await verifyPassword(currentPassword, account.passwordHash))) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual inválida" });
  }
  await db.updateUserPassword(userId, nextPassword);
  await db.revokeAllAuthSessions(userId);
}

export function passwordHashForTests(password: string) {
  return hashPassword(password);
}
