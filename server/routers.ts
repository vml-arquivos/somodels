import { z } from "zod";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getLocalSessionCookieOptions, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV, runtimeConfigStatus } from "./_core/env";
import { LOCAL_SESSION_COOKIE, assertPasswordPolicy, authenticateLocalUser, changePassword, createLocalSession, registerTestUser, revokeLocalSession } from "./auth";
import {
  createAgeVerificationSession,
  createMedia,
  createPremiumIntent,
  getApprovedAgeVerification,
  getIdentityVerification,
  getOwnerProfile,
  getOwnerProfiles,
  getPublicProfile,
  hasPremiumAccess,
  listAdminProfiles,
  listAdminUsers,
  getAdminProfile,
  listPendingMedia,
  listPendingProfiles,
  listPublishedProfiles,
  moderateMedia,
  moderateProfile,
  saveProfile,
  writeAuditLog,
} from "./db";
import { hashToken, createOpaqueToken } from "./auth-crypto";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const ageCookie = "so_age_session";

function getClientKey(req: { ip?: string; headers: Record<string, unknown> }) {
  const forwarded = req.headers["x-forwarded-for"];
  return typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip ?? "unknown";
}

function assertLoginRateLimit(req: { ip?: string; headers: Record<string, unknown> }) {
  const key = getClientKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + ENV.loginRateLimitWindowMs });
    return;
  }
  if (current.count >= ENV.loginRateLimitMax) {
    throw new Error("Muitas tentativas de login. Tente novamente mais tarde.");
  }
  current.count += 1;
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    loginMethod: user.loginMethod,
    emailVerifiedAt: user.emailVerifiedAt,
    mustChangePassword: user.mustChangePassword,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
    lastSignedIn: user.lastSignedIn,
  };
}

function ageAccessEnabled() {
  return ENV.publicAccessEnabled && (!ENV.requireAgeVerification || runtimeConfigStatus().ageVerification || (ENV.testMode && ENV.testAccessEnabled));
}

async function hasValidAgeSession(req: { headers: { cookie?: string } }) {
  if (!ageAccessEnabled()) return false;
  if (!ENV.requireAgeVerification || (ENV.testMode && ENV.testAccessEnabled)) return true;
  const cookie = req.headers.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith(`${ageCookie}=`))?.slice(ageCookie.length + 1);
  return Boolean(cookie && (await getApprovedAgeVerification(hashToken(cookie))));
}

export const profileInputSchema = z.object({
  stageName: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(5000).optional(),
  city: z.string().trim().min(2).max(120),
  region: z.string().trim().max(80).optional(),
  locationNote: z.string().trim().max(180).optional(),
  categories: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  attributes: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  contactOptions: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  age: z.number().int().min(18).max(99).optional(),
  avatarUrl: z.string().url().or(z.string().startsWith("/manus-storage/")).optional(),
  preferences: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  languages: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  availabilityLabel: z.string().trim().max(160).optional(),
  isAvailableNow: z.boolean().default(false),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  telegram: z.string().trim().max(80).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => (opts.ctx.user ? publicUser(opts.ctx.user) : null)),
    register: publicProcedure
      .input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().max(320), password: z.string().min(16).max(200) }))
      .mutation(async ({ ctx, input }) => {
        const user = await registerTestUser(input);
        const session = await createLocalSession(user);
        ctx.res.cookie(LOCAL_SESSION_COOKIE, session.token, { ...getLocalSessionCookieOptions(ctx.req), maxAge: session.expiresAt.getTime() - Date.now() });
        await writeAuditLog({ actorUserId: user.id, action: "auth.register_test", entityType: "user", entityId: user.id });
        return { user: publicUser(user), mustChangePassword: user.mustChangePassword };
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().email().max(320), password: z.string().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        assertLoginRateLimit(ctx.req);
        const user = await authenticateLocalUser(input.email, input.password);
        if (!user) throw new Error("E-mail ou senha inválidos");
        const session = await createLocalSession(user);
        ctx.res.cookie(LOCAL_SESSION_COOKIE, session.token, {
          ...getLocalSessionCookieOptions(ctx.req),
          maxAge: session.expiresAt.getTime() - Date.now(),
        });
        await writeAuditLog({ actorUserId: user.id, action: "auth.login", entityType: "user", entityId: user.id });
        return { user: publicUser(user), mustChangePassword: user.mustChangePassword };
      }),
    changePassword: protectedProcedure
      .input(z.object({ currentPassword: z.string().min(1).max(200), nextPassword: z.string().min(16).max(200) }))
      .mutation(async ({ ctx, input }) => {
        await changePassword(ctx.user.id, input.currentPassword, input.nextPassword);
        ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...getLocalSessionCookieOptions(ctx.req), maxAge: -1 });
        return { success: true as const };
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookies = ctx.req.headers.cookie ?? "";
      const localCookie = cookies.split(";").map(v => v.trim()).find(v => v.startsWith(`${LOCAL_SESSION_COOKIE}=`))?.slice(LOCAL_SESSION_COOKIE.length + 1);
      await revokeLocalSession(localCookie);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      if (localCookie) ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...getLocalSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  age: router({
    status: publicProcedure.query(async ({ ctx }) => {
      if (!ageAccessEnabled()) return { status: "unavailable" as const };
      if (ENV.testMode && ENV.testAccessEnabled) return { status: "approved" as const };
      if (!ENV.requireAgeVerification || (ENV.testMode && ENV.testAccessEnabled)) return { status: "approved" as const };
      const cookie = ctx.req.headers.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith(`${ageCookie}=`))?.slice(ageCookie.length + 1);
      return { status: (await getApprovedAgeVerification(cookie ? hashToken(cookie) : "")) ? "approved" as const : "pending" as const };
    }),
    start: publicProcedure.mutation(async ({ ctx }) => {
      if (!ageAccessEnabled()) {
        throw new Error("A verificação de idade ainda não está configurada por um provedor real");
      }
      const token = createOpaqueToken();
      const created = await createAgeVerificationSession(hashToken(token), !ENV.requireAgeVerification || (ENV.testMode && ENV.testAccessEnabled) ? { status: "approved", provider: "test" } : undefined);
      ctx.res.cookie(ageCookie, token, { ...getLocalSessionCookieOptions(ctx.req), maxAge: 24 * 60 * 60 * 1000 });
      return created;
    }),
  }),
  profiles: router({
    list: publicProcedure.input(z.object({ search: z.string().max(120).optional(), city: z.string().max(120).optional(), category: z.string().max(60).optional(), attribute: z.string().max(60).optional() }).optional()).query(async ({ ctx, input }) => listPublishedProfiles({ ...(input ?? {}), publicAllowed: await hasValidAgeSession(ctx.req) })),
    bySlug: publicProcedure.input(z.object({ slug: z.string().min(2).max(160) })).query(async ({ ctx, input }) => getPublicProfile(input.slug, await hasValidAgeSession(ctx.req))),
    mine: protectedProcedure.query(({ ctx }) => getOwnerProfiles(ctx.user.id)),
    mineById: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getOwnerProfile(ctx.user.id, input.id)),
    identity: protectedProcedure.query(({ ctx }) => getIdentityVerification(ctx.user.id)),
    save: protectedProcedure.input(profileInputSchema.extend({ id: z.number().int().positive().optional(), submitForReview: z.boolean().default(false) })).mutation(({ ctx, input }) => { const { id, submitForReview, ...data } = input; return saveProfile(ctx.user.id, data as any, id, submitForReview); }),
  }),
  media: router({
    add: protectedProcedure.input(z.object({ profileId: z.number().int().positive(), kind: z.enum(["photo", "video"]), title: z.string().max(160).optional(), description: z.string().max(2000).optional(), storageKey: z.string().min(1).max(500), url: z.string().startsWith("/manus-storage/").max(600), mimeType: z.string().min(1).max(120), isPremium: z.boolean().default(false), sortOrder: z.number().int().min(0).max(1000).default(0) })).mutation(({ ctx, input }) => createMedia(ctx.user.id, input as any)),
  }),
  premium: router({
    createIntent: protectedProcedure.input(z.object({ mediaId: z.number().int().positive() })).mutation(({ ctx, input }) => createPremiumIntent(ctx.user.id, input.mediaId)),
    hasAccess: protectedProcedure.input(z.object({ mediaId: z.number().int().positive() })).query(({ ctx, input }) => hasPremiumAccess(ctx.user.id, input.mediaId)),
  }),
  admin: router({
    pendingProfiles: adminProcedure.query(() => listPendingProfiles()),
    pendingMedia: adminProcedure.query(() => listPendingMedia()),
    users: adminProcedure.query(() => listAdminUsers()),
    profiles: adminProcedure.query(() => listAdminProfiles()),
    profileDetail: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getAdminProfile(input.id)),
    moderateProfile: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected", "suspended", "pending"]), isFeatured: z.boolean().optional(), rejectionReason: z.string().trim().max(500).optional() })).mutation(({ ctx, input }) => moderateProfile(input.id, input.status, input.isFeatured ?? false, input.rejectionReason, ctx.user.id)),
    moderateMedia: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected", "private"]) })).mutation(({ ctx, input }) => moderateMedia(input.id, input.status, ctx.user.id)),
    assertPasswordPolicy: adminProcedure.input(z.object({ password: z.string().min(1).max(200) })).mutation(({ input }) => { assertPasswordPolicy(input.password); return { valid: true as const }; }),
  }),
});

export type AppRouter = typeof appRouter;
