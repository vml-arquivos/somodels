import { updateOwnedMedia } from "./db";
import { profileInputSchema } from "../shared/profile-schema";
import { readSiteSettings } from "./site-config";
import { managementRouter } from "./management";
import { z } from "zod";
import { reportProfileInputSchema } from "../shared/safety";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import {
  getLocalSessionCookieOptions,
  getSessionCookieOptions,
} from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  authenticatedProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import { ENV, runtimeConfigStatus } from "./_core/env";
import {
  LOCAL_SESSION_COOKIE,
  assertPasswordPolicy,
  authenticateLocalUser,
  changePassword,
  createLocalSession,
  registerUser,
  registerTestUser,
  revokeLocalSession,
} from "./auth";
import {
  acceptProfileTerms,
  createAgeVerificationSession,
  createMedia,
  createPremiumIntent,
  getApprovedAgeVerification,
  getIdentityVerification,
  getProfileTermsStatus,
  getOwnerProfile,
  getOwnerProfiles,
  getPublicProfile,
  getProfilePublicationReadiness,
  getUserById,
  hasPremiumAccess,
  listAdminProfiles,
  setProfileActive,
  softDeleteProfile,
  restoreProfile,
  listAdminUsers,
  getAdminProfile,
  favoriteProfile,
  unfavoriteProfile,
  getFavoriteStatus,
  listFavoriteProfiles,
  blockProfile,
  unblockProfile,
  getBlockStatus,
  listBlockedProfiles,
  createProfileReport,
  listAdminReports,
  updateAdminReport,
  getReportAuditHistory,
  getSafeExternalContact,
  listPendingMedia,
  listPendingProfiles,
  listPublishedProfiles,
  moderateMedia,
  moderateProfile,
  saveProfile,
  writeAuditLog,
} from "./db";
import { hashToken, createOpaqueToken } from "./auth-crypto";
import { createInMemoryRateLimiter, rateLimitMessage, sensitiveRateLimits } from "./rate-limit";

const loginAttempts = createInMemoryRateLimiter({
  max: ENV.loginRateLimitMax,
  windowMs: ENV.loginRateLimitWindowMs,
  maxKeys: 20_000,
});
const registrationAttempts = createInMemoryRateLimiter({
  max: 5,
  windowMs: 60 * 60 * 1000,
  maxKeys: 20_000,
});
const reportRateLimiter = createInMemoryRateLimiter({ ...sensitiveRateLimits.report, maxKeys: 20_000 });
const contactRateLimiter = createInMemoryRateLimiter({ ...sensitiveRateLimits.contact, maxKeys: 20_000 });
const ageCookie = "so_age_session";

function getClientKey(req: { ip?: string; headers: Record<string, unknown> }) {
  // Express applies the configured trusted proxy policy before exposing req.ip.
  return req.ip ?? "unknown";
}

function assertLoginRateLimit(req: {
  ip?: string;
  headers: Record<string, unknown>;
}) {
  const decision = loginAttempts.consume(getClientKey(req));
  if (!decision.allowed) throw new Error(rateLimitMessage(decision.retryAfterSeconds));
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

type PublicContactMethod = "whatsapp" | "phone" | "telegram";

type ContactBearingProfile = {
  whatsapp?: string | null;
  phone?: string | null;
  telegram?: string | null;
  contactOptions?: unknown;
  demoContactDisabled?: unknown;
  availableContactMethods?: unknown;
};

function sanitizePublicProfileContact<T extends ContactBearingProfile>(profile: T) {
  const availableContactMethods: PublicContactMethod[] = [
    profile.whatsapp || profile.phone ? "whatsapp" : null,
    profile.phone ? "phone" : null,
    profile.telegram ? "telegram" : null,
  ].filter((method): method is PublicContactMethod => method !== null);

  const {
    phone: _phone,
    whatsapp: _whatsapp,
    telegram: _telegram,
    contactOptions: _contactOptions,
    demoContactDisabled: _demoContactDisabled,
    availableContactMethods: _availableContactMethods,
    ...publicProfile
  } = profile;

  return {
    ...publicProfile,
    availableContactMethods,
    phone: null,
    whatsapp: null,
    telegram: null,
    contactOptions: [] as string[],
    demoContactDisabled: true as const,
  };
}

function ageAccessEnabled() {
  return (
    ENV.publicAccessEnabled &&
    (!ENV.requireAgeVerification ||
      runtimeConfigStatus().ageVerification ||
      (ENV.testMode && ENV.testAccessEnabled))
  );
}

async function hasValidAgeSession(req: { headers: { cookie?: string } }) {
  if (!ageAccessEnabled() || !(await readSiteSettings()).showGallery)
    return false;
  if (!ENV.requireAgeVerification || (ENV.testMode && ENV.testAccessEnabled))
    return true;
  const cookie = req.headers.cookie
    ?.split(";")
    .map(v => v.trim())
    .find(v => v.startsWith(`${ageCookie}=`))
    ?.slice(ageCookie.length + 1);
  return Boolean(
    cookie && (await getApprovedAgeVerification(hashToken(cookie)))
  );
}

export { profileInputSchema } from "../shared/profile-schema";

export const appRouter = router({
  system: systemRouter,
  management: managementRouter,
  auth: router({
    me: publicProcedure.query(opts =>
      opts.ctx.user ? publicUser(opts.ctx.user) : null
    ),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(120),
          email: z.string().email().max(320),
          password: z.string().min(16).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await registerTestUser(input);
        const session = await createLocalSession(user);
        ctx.res.cookie(LOCAL_SESSION_COOKIE, session.token, {
          ...getLocalSessionCookieOptions(ctx.req),
          maxAge: session.expiresAt.getTime() - Date.now(),
        });
        await writeAuditLog({
          actorUserId: user.id,
          action: "auth.register_test",
          entityType: "user",
          entityId: user.id,
        });
        return {
          user: publicUser(user),
          mustChangePassword: user.mustChangePassword,
        };
      }),
    registerPublic: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(120),
          email: z.string().email().max(320),
          password: z.string().min(16).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const decision = registrationAttempts.consume(getClientKey(ctx.req));
        if (!decision.allowed)
          throw new Error(rateLimitMessage(decision.retryAfterSeconds));
        const user = await registerUser(input);
        const session = await createLocalSession(user);
        ctx.res.cookie(LOCAL_SESSION_COOKIE, session.token, {
          ...getLocalSessionCookieOptions(ctx.req),
          maxAge: session.expiresAt.getTime() - Date.now(),
        });
        await writeAuditLog({
          actorUserId: user.id,
          action: "auth.register_public",
          entityType: "user",
          entityId: user.id,
        });
        return { user: publicUser(user) };
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email().max(320),
          password: z.string().min(1).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertLoginRateLimit(ctx.req);
        const user = await authenticateLocalUser(input.email, input.password);
        if (!user) throw new Error("E-mail ou senha inválidos");
        const session = await createLocalSession(user);
        ctx.res.cookie(LOCAL_SESSION_COOKIE, session.token, {
          ...getLocalSessionCookieOptions(ctx.req),
          maxAge: session.expiresAt.getTime() - Date.now(),
        });
        await writeAuditLog({
          actorUserId: user.id,
          action: "auth.login",
          entityType: "user",
          entityId: user.id,
        });
        return {
          user: publicUser(user),
          mustChangePassword: user.mustChangePassword,
        };
      }),
    changePassword: authenticatedProcedure
      .input(
        z.object({
          currentPassword: z.string().min(1).max(200),
          nextPassword: z.string().min(16).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await changePassword(
          ctx.user.id,
          input.currentPassword,
          input.nextPassword
        );
        ctx.res.clearCookie(LOCAL_SESSION_COOKIE, {
          ...getLocalSessionCookieOptions(ctx.req),
          maxAge: -1,
        });
        return { success: true as const };
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookies = ctx.req.headers.cookie ?? "";
      const localCookie = cookies
        .split(";")
        .map(v => v.trim())
        .find(v => v.startsWith(`${LOCAL_SESSION_COOKIE}=`))
        ?.slice(LOCAL_SESSION_COOKIE.length + 1);
      await revokeLocalSession(localCookie);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      if (localCookie)
        ctx.res.clearCookie(LOCAL_SESSION_COOKIE, {
          ...getLocalSessionCookieOptions(ctx.req),
          maxAge: -1,
        });
      return { success: true } as const;
    }),
  }),
  age: router({
    status: publicProcedure.query(async ({ ctx }) => {
      if (!ageAccessEnabled()) return { status: "unavailable" as const };
      if (ENV.testMode && ENV.testAccessEnabled)
        return { status: "approved" as const };
      if (
        !ENV.requireAgeVerification ||
        (ENV.testMode && ENV.testAccessEnabled)
      )
        return { status: "approved" as const };
      const cookie = ctx.req.headers.cookie
        ?.split(";")
        .map(v => v.trim())
        .find(v => v.startsWith(`${ageCookie}=`))
        ?.slice(ageCookie.length + 1);
      return {
        status: (await getApprovedAgeVerification(
          cookie ? hashToken(cookie) : ""
        ))
          ? ("approved" as const)
          : ("pending" as const),
      };
    }),
    start: publicProcedure.mutation(async ({ ctx }) => {
      if (!ageAccessEnabled()) {
        throw new Error(
          "A verificação de idade ainda não está configurada por um provedor real"
        );
      }
      const token = createOpaqueToken();
      const created = await createAgeVerificationSession(
        hashToken(token),
        !ENV.requireAgeVerification || (ENV.testMode && ENV.testAccessEnabled)
          ? { status: "approved", provider: "test" }
          : undefined
      );
      ctx.res.cookie(ageCookie, token, {
        ...getLocalSessionCookieOptions(ctx.req),
        maxAge: 24 * 60 * 60 * 1000,
      });
      return created;
    }),
  }),
  profiles: router({
    cover: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        updateOwnedMedia(ctx.user.id, input.id, "cover")
      ),
    hideMedia: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        updateOwnedMedia(ctx.user.id, input.id, "hide")
      ),
    list: publicProcedure
      .input(
        z
          .object({
            search: z.string().max(120).optional(),
            city: z.string().max(120).optional(),
            category: z.string().max(60).optional(),
            attribute: z.string().max(60).optional(),
            limit: z.number().int().min(1).max(25).optional(),
            offset: z.number().int().min(0).max(10000).optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const rows = await listPublishedProfiles({
          ...(input ?? {}),
          publicAllowed: await hasValidAgeSession(ctx.req),
        });
        // Contact details are never part of the public discovery payload.
        // Authenticated viewers request a gated off-platform intent through safety.contactIntent.
        return rows.map(p => ({
          ...p,
          availableContactMethods: [
            p.whatsapp || p.phone ? "whatsapp" : null,
            p.phone ? "phone" : null,
            p.telegram ? "telegram" : null,
          ].filter(Boolean),
          phone: null,
          whatsapp: null,
          telegram: null,
          contactOptions: [],
          demoContactDisabled: true,
        }));
      }),
    bySlug: publicProcedure
      .input(z.object({ slug: z.string().min(2).max(160) }))
      .query(async ({ ctx, input }) => {
        const data = await getPublicProfile(
          input.slug,
          await hasValidAgeSession(ctx.req)
        );
        if (!data) return data;

        return {
          ...data,
          profile: sanitizePublicProfileContact(data.profile),
          related: data.related.map(sanitizePublicProfileContact),
        };
      }),
    mine: protectedProcedure.query(({ ctx }) => getOwnerProfiles(ctx.user.id)),
    mineById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ ctx, input }) => getOwnerProfile(ctx.user.id, input.id)),
    identity: protectedProcedure.query(({ ctx }) =>
      getIdentityVerification(ctx.user.id)
    ),
    termsStatus: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ ctx, input }) => getProfileTermsStatus(input.id, ctx.user.id)),
    publicationReadiness: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const owned = await getOwnerProfile(ctx.user.id, input.id);
        if (!owned) throw new Error("Perfil não pertence à conta");
        return getProfilePublicationReadiness(input.id);
      }),
    acceptTerms: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          adultConfirmed: z.literal(true),
          rightsConfirmed: z.literal(true),
          responsibilityConfirmed: z.literal(true),
        })
      )
      .mutation(({ ctx, input }) => acceptProfileTerms(ctx.user.id, input.id)),
    save: protectedProcedure
      .input(
        profileInputSchema.extend({
          id: z.number().int().positive().optional(),
          submitForReview: z.boolean().default(false),
        })
      )
      .mutation(({ ctx, input }) => {
        const { id, submitForReview, ...data } = input;
        return saveProfile(ctx.user.id, data as any, id, submitForReview);
      }),
  }),
  media: router({
    add: protectedProcedure
      .input(
        z.object({
          profileId: z.number().int().positive(),
          kind: z.enum(["photo", "video"]),
          title: z.string().max(160).optional(),
          description: z.string().max(2000).optional(),
          storageKey: z.string().min(1).max(500),
          url: z.string().startsWith("/manus-storage/").max(600),
          mimeType: z.string().min(1).max(120),
          isPremium: z.boolean().default(false),
          sortOrder: z.number().int().min(0).max(1000).default(0),
        })
      )
      .mutation(({ ctx, input }) => createMedia(ctx.user.id, input as any)),
  }),
  safety: router({
    favoriteStatus: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .query(({ ctx, input }) => getFavoriteStatus(ctx.user.id, input.profileId)),
    favorite: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => favoriteProfile(ctx.user.id, input.profileId)),
    unfavorite: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => unfavoriteProfile(ctx.user.id, input.profileId)),
    favorites: protectedProcedure.query(({ ctx }) => listFavoriteProfiles(ctx.user.id)),
    blockStatus: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .query(({ ctx, input }) => getBlockStatus(ctx.user.id, input.profileId)),
    blockProfile: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => blockProfile(ctx.user.id, input.profileId)),
    unblockProfile: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => unblockProfile(ctx.user.id, input.profileId)),
    blocks: protectedProcedure.query(({ ctx }) => listBlockedProfiles(ctx.user.id)),
    reportProfile: protectedProcedure
      .input(reportProfileInputSchema)
      .mutation(({ ctx, input }) => {
        const decision = reportRateLimiter.consume(`user:${ctx.user.id}`);
        if (!decision.allowed) throw new Error(rateLimitMessage(decision.retryAfterSeconds));
        return createProfileReport(ctx.user.id, input);
      }),
    contactIntent: protectedProcedure
      .input(
        z.object({
          profileId: z.number().int().positive(),
          method: z.enum(["whatsapp", "phone", "telegram"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const decision = contactRateLimiter.consume(`user:${ctx.user.id}`);
        if (!decision.allowed) throw new Error(rateLimitMessage(decision.retryAfterSeconds));
        if (!(await readSiteSettings()).showContact) {
          throw new Error("Os contatos estão temporariamente desabilitados");
        }
        if (!(await hasValidAgeSession(ctx.req))) {
          throw new Error("Conclua a verificação de idade antes de acessar o contato");
        }
        return getSafeExternalContact(ctx.user.id, input.profileId, input.method);
      }),
    adminReports: adminProcedure.query(() => listAdminReports()),
    adminReportHistory: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ input }) => getReportAuditHistory(input.id)),
    updateReport: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["open", "in_review", "approved", "rejected", "appealed", "closed"]),
          decision: z.string().trim().max(1000).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        updateAdminReport({ ...input, actorUserId: ctx.user.id })
      ),
  }),
  premium: router({
    createIntent: protectedProcedure
      .input(z.object({ mediaId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        createPremiumIntent(ctx.user.id, input.mediaId)
      ),
    hasAccess: protectedProcedure
      .input(z.object({ mediaId: z.number().int().positive() }))
      .query(({ ctx, input }) => hasPremiumAccess(ctx.user.id, input.mediaId)),
  }),
  admin: router({
    pendingProfiles: adminProcedure.query(() => listPendingProfiles()),
    pendingMedia: adminProcedure.query(() => listPendingMedia()),
    users: adminProcedure.query(({ ctx }) => listAdminUsers(ctx.user.role)),
    profiles: adminProcedure
      .input(
        z
          .object({
            search: z.string().trim().max(120).optional(),
            lifecycle: z.enum(["all", "active", "inactive", "deleted"]).default("all"),
          })
          .optional()
      )
      .query(({ input }) => listAdminProfiles(input)),
    profileDetail: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ input }) => getAdminProfile(input.id)),
    profileReadiness: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ input }) => getProfilePublicationReadiness(input.id)),
    activateProfile: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().max(500).optional(),
        })
      )
      .mutation(({ ctx, input }) => setProfileActive(input.id, true, ctx.user.id, input.reason)),
    deactivateProfile: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().min(3).max(500),
        })
      )
      .mutation(({ ctx, input }) => setProfileActive(input.id, false, ctx.user.id, input.reason)),
    deleteProfile: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().max(500).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        softDeleteProfile(input.id, ctx.user.id, input.reason)
      ),
    restoreProfile: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().min(3).max(500),
        })
      )
      .mutation(({ ctx, input }) => restoreProfile(input.id, ctx.user.id, input.reason)),
    moderateProfile: adminProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            status: z.enum(["approved", "rejected", "suspended", "pending"]),
            isFeatured: z.boolean().optional(),
            rejectionReason: z.string().trim().max(500).optional(),
            portfolioConfirmed: z.boolean().default(false),
          })
          .superRefine((value, ctx) => {
            if (["rejected", "suspended"].includes(value.status) && !value.rejectionReason?.trim()) {
              ctx.addIssue({ code: "custom", path: ["rejectionReason"], message: "Informe o motivo da decisão" });
            }
          })
      )
      .mutation(({ ctx, input }) =>
        moderateProfile(
          input.id,
          input.status,
          input.isFeatured ?? false,
          input.rejectionReason,
          ctx.user.id,
          input.portfolioConfirmed
        )
      ),
    moderateMedia: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["approved", "rejected", "private"]),
        })
      )
      .mutation(({ ctx, input }) =>
        moderateMedia(input.id, input.status, ctx.user.id)
      ),
    addMedia: adminProcedure
      .input(
        z.object({
          ownerId: z.number().int().positive(),
          profileId: z.number().int().positive(),
          kind: z.enum(["photo", "video"]),
          title: z.string().max(160).optional(),
          description: z.string().max(2000).optional(),
          storageKey: z.string().min(1).max(500),
          url: z.string().startsWith("/manus-storage/").max(600),
          mimeType: z.string().min(1).max(120),
          isPremium: z.literal(false).default(false),
          sortOrder: z.number().int().min(0).max(1000).default(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const detail = await getAdminProfile(input.profileId);
        const owner = await getUserById(input.ownerId);
        if (!owner || owner.accountStatus !== "active")
          throw new Error("O titular precisa estar ativo");
        if (!detail || detail.profile.ownerId !== input.ownerId)
          throw new Error("O perfil não pertence ao titular selecionado");
        return createMedia(input.ownerId, input as any, ctx.user.id, false);
      }),
    assertPasswordPolicy: adminProcedure
      .input(z.object({ password: z.string().min(1).max(200) }))
      .mutation(({ input }) => {
        assertPasswordPolicy(input.password);
        return { valid: true as const };
      }),
  }),
});

export type AppRouter = typeof appRouter;
