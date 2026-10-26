import { updateOwnedMedia } from "./db";
import {
  profileDraftInputSchema,
  profileInputSchema,
} from "../shared/profile-schema";
import {
  attendancePlaceOptions,
  serviceOptions,
} from "../shared/discovery-options";
import {
  accountTermsClauses,
  accountTermsVersion,
} from "../shared/account-terms";
import { readSiteSettings } from "./site-config";
import { managementRouter } from "./management";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
  scopedProcedure,
  authenticatedProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  adminScopesFor,
} from "./_core/trpc";
import {
  ENV,
  isAgeVerificationConfigured,
  resolveStorageDriver,
  runtimeConfigStatus,
} from "./_core/env";
import { isLocalStoragePersistent } from "./storage";
import { buildReadiness } from "./readiness";
import { otpauthUrl } from "./totp";
import { verifyPassword } from "./auth-crypto";
import {
  LOCAL_SESSION_COOKIE,
  assertPasswordPolicy,
  authenticateLocalUser,
  changePassword,
  closeLocalAccount,
  createLocalSession,
  registerUser,
  registerTestUser,
  revokeLocalSession,
} from "./auth";
import {
  contactTopics,
  countPublishedProfiles,
  createContactMessage,
  listContactMessages,
  markContactMessageHandled,
  getOperationalCounts,
  activateSubscription,
  cancelSubscription,
  listMySubscriptions,
  listPlans,
  listSubscriptionsAdmin,
  requestSubscription,
  savePlan,
  setOwnerAvailability,
  confirmMfaEnrollment,
  disableMfa,
  getUserMfa,
  startMfaEnrollment,
  verifyLoginMfa,
  getOwnerProfileStats,
  listIdentityQueue,
  recordPublicProfileView,
  requestIdentityVerification,
  reviewIdentityVerification,
  createAgeVerificationSession,
  createMedia,
  createPremiumIntent,
  getApprovedAgeVerification,
  getIdentityVerification,
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
  listUserReports,
  reorderOwnedMedia,
  updateOwnedMediaMetadata,
  updateUserName,
  createProfileReport,
  listAdminReports,
  updateAdminReport,
  getReportAuditHistory,
  getSafeExternalContact,
  listPendingMedia,
  listPendingProfiles,
  listPublishedProfiles,
  listPublicLocations,
  moderateMedia,
  moderateProfile,
  publishOwnerProfile,
  saveProfile,
  acceptAccountTerms,
  getAccountTermsStatus,
  writeAuditLog,
} from "./db";
import { hashToken, createOpaqueToken } from "./auth-crypto";
import {
  createInMemoryRateLimiter,
  rateLimitMessage,
  sensitiveRateLimits,
} from "./rate-limit";

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
const reportRateLimiter = createInMemoryRateLimiter({
  ...sensitiveRateLimits.report,
  maxKeys: 20_000,
});
const contactRateLimiter = createInMemoryRateLimiter({
  ...sensitiveRateLimits.contact,
  maxKeys: 20_000,
});
const viewRateLimiter = createInMemoryRateLimiter({
  max: 1,
  windowMs: 30 * 60 * 1000,
  maxKeys: 50_000,
});
const identityRequestLimiter = createInMemoryRateLimiter({
  max: 5,
  windowMs: 24 * 60 * 60 * 1000,
  maxKeys: 20_000,
});
const contactLimiter = createInMemoryRateLimiter({
  max: 5,
  windowMs: 60 * 60 * 1000,
  maxKeys: 20_000,
});
const planRequestLimiter = createInMemoryRateLimiter({
  max: 5,
  windowMs: 24 * 60 * 60 * 1000,
  maxKeys: 20_000,
});
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
  if (!decision.allowed)
    throw new Error(rateLimitMessage(decision.retryAfterSeconds));
}

function publicUser(user: User) {
  const configuredAdmin =
    Boolean(user.email && user.emailVerifiedAt) &&
    ENV.adminEmails.includes(user.email!.toLowerCase());
  const adminRole = ["dev", "super_admin", "admin"].includes(user.role)
    ? user.role
    : configuredAdmin
      ? "admin"
      : null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: Boolean(adminRole),
    adminRole,
    adminFunction: adminRole === "admin" ? (user.adminFunction ?? null) : null,
    adminScopes: adminRole ? [...adminScopesFor(user)] : ([] as string[]),
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

function sanitizePublicProfileContact<T extends ContactBearingProfile>(
  profile: T
) {
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
  const productEnabled =
    (ENV.testMode && ENV.testAccessEnabled) ||
    (ENV.adultMarketplaceEnabled &&
      ENV.escortListingsEnabled &&
      ENV.ageAssuranceEnabled);
  return (
    ENV.publicAccessEnabled &&
    productEnabled &&
    (!ENV.requireAgeVerification ||
      isAgeVerificationConfigured() ||
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
    updateAccount: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(120) }))
      .mutation(async ({ ctx, input }) => {
        const user = await updateUserName(ctx.user.id, input.name);
        if (!user) throw new Error("Conta não encontrada");
        return publicUser(user);
      }),
    closeAccount: authenticatedProcedure
      .input(
        z.object({
          currentPassword: z.string().min(1).max(200),
          confirmation: z.literal("EXCLUIR"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await closeLocalAccount(ctx.user.id, input.currentPassword);
        ctx.res.clearCookie(LOCAL_SESSION_COOKIE, {
          ...getLocalSessionCookieOptions(ctx.req),
          maxAge: -1,
        });
        return { success: true as const };
      }),
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
          acceptAccountTerms: z.literal(true),
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
        await acceptAccountTerms(user.id);
        return { user: publicUser(user) };
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email().max(320),
          password: z.string().min(1).max(200),
          totpCode: z.string().max(12).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertLoginRateLimit(ctx.req);
        const user = await authenticateLocalUser(input.email, input.password);
        if (!user) throw new Error("E-mail ou senha inválidos");
        const mfa = await getUserMfa(user.id);
        if (mfa?.enabledAt) {
          if (!input.totpCode)
            throw new Error("Informe o código de verificação em duas etapas");
          if (!(await verifyLoginMfa(user.id, input.totpCode)))
            throw new Error("Código de verificação inválido ou já utilizado");
        }
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
    mfaStatus: authenticatedProcedure.query(async ({ ctx }) => {
      const mfa = await getUserMfa(ctx.user.id);
      const isAdmin = publicUser(ctx.user).isAdmin;
      return {
        enabled: Boolean(mfa?.enabledAt),
        required: ENV.adminMfaRequired && isAdmin,
        isAdmin,
      };
    }),
    mfaBegin: authenticatedProcedure.mutation(async ({ ctx }) => {
      const secret = await startMfaEnrollment(ctx.user.id);
      return {
        secret,
        otpauthUrl: otpauthUrl(
          secret,
          ctx.user.email ?? `user-${ctx.user.id}`,
          ENV.siteName
        ),
      };
    }),
    mfaConfirm: authenticatedProcedure
      .input(z.object({ code: z.string().min(6).max(12) }))
      .mutation(async ({ ctx, input }) => {
        const decision = loginAttempts.consume(`mfa:${ctx.user.id}`);
        if (!decision.allowed)
          throw new Error(rateLimitMessage(decision.retryAfterSeconds));
        await confirmMfaEnrollment(ctx.user.id, input.code);
        return { enabled: true };
      }),
    mfaDisable: authenticatedProcedure
      .input(
        z.object({
          password: z.string().min(1).max(200),
          code: z.string().min(6).max(12),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ENV.adminMfaRequired && publicUser(ctx.user).isAdmin)
          throw new Error(
            "A verificação em duas etapas é obrigatória para administradores"
          );
        const account = await getUserById(ctx.user.id);
        if (
          !account?.passwordHash ||
          !(await verifyPassword(input.password, account.passwordHash))
        )
          throw new Error("Senha inválida");
        if (!(await verifyLoginMfa(ctx.user.id, input.code)))
          throw new Error("Código de verificação inválido ou já utilizado");
        await disableMfa(ctx.user.id, ctx.user.id);
        return { enabled: false };
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
    accountTerms: publicProcedure.query(() => ({
      version: accountTermsVersion,
      clauses: accountTermsClauses,
    })),
    accountTermsStatus: authenticatedProcedure.query(({ ctx }) =>
      getAccountTermsStatus(ctx.user.id)
    ),
    acceptAccountTerms: authenticatedProcedure.mutation(({ ctx }) =>
      acceptAccountTerms(ctx.user.id)
    ),
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
      if (!ageAccessEnabled())
        throw new Error(
          "A confirmação de maioridade está temporariamente indisponível"
        );
      const token = createOpaqueToken();
      const selfAttested = ENV.ageVerificationMode === "self_attestation";
      const created = await createAgeVerificationSession(
        hashToken(token),
        selfAttested ||
          !ENV.requireAgeVerification ||
          (ENV.testMode && ENV.testAccessEnabled)
          ? {
              status: "approved",
              provider: selfAttested ? "self_attestation" : "test",
            }
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
    updateMediaMetadata: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().trim().max(160),
          description: z.string().trim().max(2000),
        })
      )
      .mutation(({ ctx, input }) =>
        updateOwnedMediaMetadata(ctx.user.id, input.id, {
          title: input.title || null,
          description: input.description || null,
        })
      ),
    reorderMedia: protectedProcedure
      .input(
        z.object({
          profileId: z.number().int().positive(),
          mediaIds: z.array(z.number().int().positive()).min(1).max(100),
        })
      )
      .mutation(({ ctx, input }) =>
        reorderOwnedMedia(ctx.user.id, input.profileId, input.mediaIds)
      ),
    list: publicProcedure
      .input(
        z
          .object({
            search: z.string().max(120).optional(),
            city: z.string().max(120).optional(),
            region: z.string().max(80).optional(),
            category: z.string().max(60).optional(),
            attribute: z.string().max(60).optional(),
            ageMin: z.number().int().min(18).max(99).optional(),
            ageMax: z.number().int().min(18).max(99).optional(),
            availableNow: z.boolean().optional(),
            priceMaxCents: z.number().int().min(0).max(10_000_000).optional(),
            service: z.enum(serviceOptions).optional(),
            place: z.enum(attendancePlaceOptions).optional(),
            verifiedOnly: z.boolean().optional(),
            sort: z
              .enum(["featured", "recent", "available", "price_asc"])
              .optional(),
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
    count: publicProcedure
      .input(
        z
          .object({
            search: z.string().max(120).optional(),
            city: z.string().max(120).optional(),
            region: z.string().max(80).optional(),
            category: z.string().max(60).optional(),
            attribute: z.string().max(60).optional(),
            ageMin: z.number().int().min(18).max(99).optional(),
            ageMax: z.number().int().min(18).max(99).optional(),
            availableNow: z.boolean().optional(),
            priceMaxCents: z.number().int().min(0).max(10_000_000).optional(),
            service: z.enum(serviceOptions).optional(),
            place: z.enum(attendancePlaceOptions).optional(),
            verifiedOnly: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => ({
        total: await countPublishedProfiles({
          ...(input ?? {}),
          publicAllowed: await hasValidAgeSession(ctx.req),
        }),
      })),
    locations: publicProcedure.query(async ({ ctx }) =>
      listPublicLocations(await hasValidAgeSession(ctx.req))
    ),
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
    archiveMine: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          confirmation: z.literal("EXCLUIR"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const owned = await getOwnerProfile(ctx.user.id, input.id);
        if (!owned) throw new Error("Perfil não pertence à conta");
        return softDeleteProfile(input.id, ctx.user.id);
      }),
    publishMine: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => publishOwnerProfile(ctx.user.id, input.id)),
    identity: protectedProcedure.query(({ ctx }) =>
      getIdentityVerification(ctx.user.id)
    ),
    setAvailability: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          available: z.boolean(),
          hours: z.number().int().min(1).max(24).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        setOwnerAvailability(
          ctx.user.id,
          input.id,
          input.available,
          input.hours
        )
      ),
    requestIdentity: protectedProcedure.mutation(({ ctx }) => {
      const decision = identityRequestLimiter.consume(`user:${ctx.user.id}`);
      if (!decision.allowed)
        throw new Error(rateLimitMessage(decision.retryAfterSeconds));
      return requestIdentityVerification(ctx.user.id);
    }),
    stats: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          days: z.number().int().min(1).max(90).default(30),
        })
      )
      .query(({ ctx, input }) =>
        getOwnerProfileStats(ctx.user.id, input.id, input.days)
      ),
    trackView: publicProcedure
      .input(z.object({ slug: z.string().min(2).max(160) }))
      .mutation(async ({ ctx, input }) => {
        // Só conta visitantes com sessão de maioridade válida, no máximo uma
        // visualização por visitante/anúncio a cada 30 minutos.
        if (!(await hasValidAgeSession(ctx.req))) return { recorded: false };
        const decision = viewRateLimiter.consume(
          `${getClientKey(ctx.req)}:${input.slug}`
        );
        if (!decision.allowed) return { recorded: false };
        return recordPublicProfileView(input.slug, ctx.user?.id ?? null);
      }),
    publicationReadiness: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const owned = await getOwnerProfile(ctx.user.id, input.id);
        if (!owned) throw new Error("Perfil não pertence à conta");
        return getProfilePublicationReadiness(input.id);
      }),
    save: protectedProcedure
      .input(
        profileDraftInputSchema.extend({
          id: z.number().int().positive().optional(),
          submitForReview: z.boolean().default(false),
        })
      )
      .mutation(({ ctx, input }) => {
        const { id, submitForReview, ...data } = input;
        if (submitForReview) {
          const strict = profileInputSchema.safeParse({
            ...data,
            phone: data.phone || undefined,
            whatsapp: data.whatsapp || undefined,
          });
          if (!strict.success) {
            const issue = strict.error.issues[0];
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                issue?.message ||
                "Complete os dados obrigatórios antes de enviar para revisão",
            });
          }
          return saveProfile(ctx.user.id, strict.data as any, id, true);
        }
        return saveProfile(ctx.user.id, data as any, id, submitForReview);
      }),
  }),
  safety: router({
    favoriteStatus: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        getFavoriteStatus(ctx.user.id, input.profileId)
      ),
    favorite: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        favoriteProfile(ctx.user.id, input.profileId)
      ),
    unfavorite: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        unfavoriteProfile(ctx.user.id, input.profileId)
      ),
    favorites: protectedProcedure.query(({ ctx }) =>
      listFavoriteProfiles(ctx.user.id)
    ),
    blockStatus: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .query(({ ctx, input }) => getBlockStatus(ctx.user.id, input.profileId)),
    blockProfile: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => blockProfile(ctx.user.id, input.profileId)),
    unblockProfile: protectedProcedure
      .input(z.object({ profileId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        unblockProfile(ctx.user.id, input.profileId)
      ),
    blocks: protectedProcedure.query(({ ctx }) =>
      listBlockedProfiles(ctx.user.id)
    ),
    myReports: protectedProcedure.query(({ ctx }) =>
      listUserReports(ctx.user.id)
    ),
    reportProfile: protectedProcedure
      .input(reportProfileInputSchema)
      .mutation(({ ctx, input }) => {
        const decision = reportRateLimiter.consume(`user:${ctx.user.id}`);
        if (!decision.allowed)
          throw new Error(rateLimitMessage(decision.retryAfterSeconds));
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
        if (!decision.allowed)
          throw new Error(rateLimitMessage(decision.retryAfterSeconds));
        if (!(await readSiteSettings()).showContact) {
          throw new Error("Os contatos estão temporariamente desabilitados");
        }
        if (!(await hasValidAgeSession(ctx.req))) {
          throw new Error(
            "Confirme que você tem 18 anos ou mais antes de acessar o contato"
          );
        }
        return getSafeExternalContact(
          ctx.user.id,
          input.profileId,
          input.method
        );
      }),
    adminReports: scopedProcedure("reports").query(() => listAdminReports()),
    adminReportHistory: scopedProcedure("reports")
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ input }) => getReportAuditHistory(input.id)),
    updateReport: scopedProcedure("reports")
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum([
            "open",
            "in_review",
            "approved",
            "rejected",
            "appealed",
            "closed",
          ]),
          decision: z.string().trim().max(1000).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        updateAdminReport({ ...input, actorUserId: ctx.user.id })
      ),
  }),
  plans: router({
    list: publicProcedure.query(async () =>
      (await listPlans(true)).map(plan => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        billingPeriod: plan.billingPeriod,
        durationDays: plan.durationDays,
        isFeatured: plan.isFeatured,
        benefits: plan.benefits as string[],
      }))
    ),
    mine: protectedProcedure.query(({ ctx }) =>
      listMySubscriptions(ctx.user.id)
    ),
    request: protectedProcedure
      .input(z.object({ planId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => {
        const decision = planRequestLimiter.consume(`user:${ctx.user.id}`);
        if (!decision.allowed)
          throw new Error(rateLimitMessage(decision.retryAfterSeconds));
        return requestSubscription(ctx.user.id, input.planId);
      }),
  }),
  contact: router({
    send: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2, "Informe seu nome").max(120),
          replyTo: z.string().trim().max(200).optional().or(z.literal("")),
          topic: z.enum(contactTopics),
          message: z
            .string()
            .trim()
            .min(10, "Escreva uma mensagem com pelo menos 10 caracteres")
            .max(3000),
          // Campo-isca: pessoas não o veem; robôs costumam preenchê-lo.
          website: z.string().max(200).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.website) return { ok: true };
        const decision = contactLimiter.consume(`ip:${getClientKey(ctx.req)}`);
        if (!decision.allowed)
          throw new Error(rateLimitMessage(decision.retryAfterSeconds));
        await createContactMessage({
          name: input.name,
          replyTo: input.replyTo || null,
          topic: input.topic,
          message: input.message,
        });
        return { ok: true };
      }),
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
    identityQueue: scopedProcedure("identity")
      .input(
        z
          .object({
            status: z
              .enum(["pending", "approved", "rejected"])
              .default("pending"),
          })
          .optional()
      )
      .query(({ input }) => listIdentityQueue(input?.status ?? "pending")),
    reviewIdentity: scopedProcedure("identity")
      .input(
        z.object({
          id: z.number().int().positive(),
          decision: z.enum(["approved", "rejected"]),
          reason: z.string().trim().max(500).optional(),
          validityDays: z.number().int().min(30).max(730).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        reviewIdentityVerification({ ...input, actorUserId: ctx.user.id })
      ),
    contactMessages: scopedProcedure("messages")
      .input(
        z
          .object({ status: z.enum(["new", "handled", "all"]).optional() })
          .optional()
      )
      .query(({ input }) => listContactMessages(input?.status ?? "new")),
    handleContactMessage: scopedProcedure("messages")
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        markContactMessageHandled(input.id, ctx.user.id)
      ),
    readiness: scopedProcedure("readiness").query(async () => {
      const status = runtimeConfigStatus();
      return buildReadiness({
        publicAccessEnabled: ENV.publicAccessEnabled,
        publicLaunchEnabled: ENV.publicLaunchEnabled,
        robotsNoIndex: ENV.robotsNoIndex,
        testMode: ENV.testMode,
        allowFakeData: ENV.allowFakeData,
        ageVerificationConfigured: status.ageVerification,
        requireIdentityVerification: ENV.requireIdentityVerification,
        storageConfigured: status.storage,
        storageDriver: resolveStorageDriver(),
        storagePersistent:
          resolveStorageDriver() === "local"
            ? await isLocalStoragePersistent()
            : true,
        canonicalOriginSet: Boolean(ENV.canonicalOrigin),
        releaseKnown: ENV.release !== "development",
        contactChannelSet: Boolean(ENV.contactEmail),
        operatorIdentified: Boolean(ENV.operatorName && ENV.operatorDocument),
        adminMfaRequired: ENV.adminMfaRequired,
        flags: {
          reportsEnabled: ENV.reportsEnabled,
          favoritesEnabled: ENV.favoritesEnabled,
          blockingEnabled: ENV.blockingEnabled,
          secureContactEnabled: ENV.secureContactEnabled,
          sponsoredListingsEnabled: ENV.sponsoredListingsEnabled,
          paymentsEnabled: ENV.paymentsEnabled,
        },
        counts: await getOperationalCounts(),
      });
    }),
    plans: scopedProcedure("plans").query(() => listPlans(false)),
    savePlan: scopedProcedure("plans")
      .input(
        z.object({
          id: z.number().int().positive().optional(),
          code: z
            .string()
            .trim()
            .regex(/^[a-z0-9-]{2,40}$/),
          name: z.string().trim().min(2).max(80),
          description: z.string().trim().max(500).nullish(),
          priceCents: z.number().int().min(0).max(10_000_000),
          billingPeriod: z.enum(["none", "month", "year"]),
          durationDays: z.number().int().min(1).max(366),
          isFeatured: z.boolean(),
          isActive: z.boolean(),
          sortOrder: z.number().int().min(0).max(1000).default(0),
          benefits: z
            .array(z.string().trim().min(2).max(120))
            .max(8)
            .default([]),
        })
      )
      .mutation(({ ctx, input }) => savePlan(input, ctx.user.id)),
    subscriptions: scopedProcedure("plans")
      .input(
        z
          .object({
            status: z
              .enum(["pending", "active", "cancelled", "expired"])
              .optional(),
          })
          .optional()
      )
      .query(({ input }) => listSubscriptionsAdmin(input?.status)),
    activateSubscription: scopedProcedure("plans")
      .input(
        z.object({
          subscriptionId: z.number().int().positive().optional(),
          userId: z.number().int().positive().optional(),
          planId: z.number().int().positive().optional(),
          paidCents: z.number().int().min(0).max(10_000_000).optional(),
          note: z.string().trim().max(300).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        activateSubscription({ ...input, actorUserId: ctx.user.id })
      ),
    cancelSubscription: scopedProcedure("plans")
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => cancelSubscription(input.id, ctx.user.id)),
    pendingProfiles: scopedProcedure("moderation").query(() =>
      listPendingProfiles()
    ),
    pendingMedia: scopedProcedure("moderation").query(() => listPendingMedia()),
    users: scopedProcedure("users:read", "plans", "profiles:write").query(
      ({ ctx }) => listAdminUsers(ctx.user.role)
    ),
    profiles: scopedProcedure("profiles:read", "moderation")
      .input(
        z
          .object({
            search: z.string().trim().max(120).optional(),
            lifecycle: z
              .enum(["all", "active", "inactive", "deleted"])
              .default("all"),
          })
          .optional()
      )
      .query(({ input }) => listAdminProfiles(input)),
    profileDetail: scopedProcedure("profiles:read", "moderation")
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ input }) => getAdminProfile(input.id)),
    profileReadiness: scopedProcedure("profiles:read", "moderation")
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ input }) => getProfilePublicationReadiness(input.id)),
    activateProfile: scopedProcedure("profiles:write")
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().max(500).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        setProfileActive(input.id, true, ctx.user.id, input.reason)
      ),
    deactivateProfile: scopedProcedure("profiles:write")
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().min(3).max(500),
        })
      )
      .mutation(({ ctx, input }) =>
        setProfileActive(input.id, false, ctx.user.id, input.reason)
      ),
    deleteProfile: scopedProcedure("profiles:write")
      .input(
        z.object({
          id: z.number().int().positive(),
        })
      )
      .mutation(({ ctx, input }) => softDeleteProfile(input.id, ctx.user.id)),
    restoreProfile: scopedProcedure("profiles:write")
      .input(
        z.object({
          id: z.number().int().positive(),
          reason: z.string().trim().min(3).max(500),
        })
      )
      .mutation(({ ctx, input }) =>
        restoreProfile(input.id, ctx.user.id, input.reason)
      ),
    moderateProfile: scopedProcedure("moderation")
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
            if (
              ["rejected", "suspended"].includes(value.status) &&
              !value.rejectionReason?.trim()
            ) {
              ctx.addIssue({
                code: "custom",
                path: ["rejectionReason"],
                message: "Informe o motivo da decisão",
              });
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
    moderateMedia: scopedProcedure("moderation")
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["approved", "rejected", "private"]),
        })
      )
      .mutation(({ ctx, input }) =>
        moderateMedia(input.id, input.status, ctx.user.id)
      ),
    addMedia: scopedProcedure("profiles:write")
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
