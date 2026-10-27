import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  allChecksPassed,
  crmNoteKinds,
  crmStages,
  verificationChecks,
} from "../shared/admin-crm";
import { hasAnyScope, type AdminScope } from "../shared/admin-access";
import { normalizeSeoOverrides, seoEditablePages } from "../shared/admin-seo";
import { adminScopesFor, adminProcedure, router, scopedProcedure } from "./_core/trpc";
import {
  addAdvertiserNote,
  buildReport,
  deleteAdvertiserNote,
  getAdvertiserDetail,
  getPanelOverview,
  getPlanStats,
  listAdvertisers,
  listPaymentsAdmin,
  reportKinds,
  revealAdvertiserCpf,
  searchPanel,
  setAdvertiserFollowUp,
  setAdvertiserStage,
  setAdvertiserTags,
  updatePaymentStatus,
} from "./admin-panel";
import { readSeoOverrides, saveSeoOverrides } from "./seo-overrides";
import { getMediaOptimizeStats, runMediaOptimize } from "./media-optimize";
import {
  getVerificationDetail,
  listVerificationQueue,
  purgeVerificationDocs,
} from "./verification";
import { reviewIdentityVerification, writeAuditLog } from "./db";

const can = (user: Parameters<typeof adminScopesFor>[0], ...needed: AdminScope[]) =>
  hasAnyScope(adminScopesFor(user), needed);

const userId = z.object({ userId: z.number().int().positive() });
const dateOrNull = z
  .union([z.date(), z.string().datetime({ offset: true }), z.null()])
  .transform(value => (value === null ? null : new Date(value)));

const asBadRequest = async <T>(run: () => Promise<T>) => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Não foi possível concluir",
    });
  }
};

export const panelRouter = router({
  // Visão geral: qualquer administrador entra, cada bloco aparece conforme a função.
  overview: adminProcedure.query(({ ctx }) =>
    getPanelOverview({
      canSeePeople: can(ctx.user, "users:read"),
      canSeeFinance: can(ctx.user, "finance:read", "plans"),
    })
  ),

  // --- Anunciantes (CRM) ---
  advertisers: scopedProcedure("users:read")
    .input(
      z.object({
        search: z.string().trim().max(120).optional(),
        stage: z.string().max(20).optional(),
        plan: z.enum(["all", "with", "without"]).optional(),
        payment: z.enum(["all", "overdue", "pending", "paid", "none"]).optional(),
        personal: z.enum(["all", "complete", "missing"]).optional(),
        identity: z.enum(["all", "none", "pending", "approved", "rejected"]).optional(),
        listings: z.enum(["all", "none", "published", "unpublished"]).optional(),
        followUp: z.enum(["all", "due"]).optional(),
        status: z.enum(["all", "active", "suspended"]).optional(),
        sort: z.enum(["recent", "name", "listings", "login", "paid"]).optional(),
        page: z.number().int().min(0).max(5000).optional(),
      })
    )
    .query(({ ctx, input }) => {
      const finance = can(ctx.user, "finance:read", "plans");
      return listAdvertisers(
        {
          ...input,
          // Sem acesso ao financeiro, esses filtros não podem vazar informação.
          payment: finance ? input.payment : "all",
          plan: finance ? input.plan : "all",
        },
        { canSeeFinance: finance }
      );
    }),
  advertiser: scopedProcedure("users:read")
    .input(userId)
    .query(async ({ ctx, input }) => {
      const detail = await getAdvertiserDetail(input.userId, {
        canSeeFinance: can(ctx.user, "finance:read", "plans"),
        canSeeIdentity: can(ctx.user, "identity"),
      });
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Anunciante não encontrado" });
      return detail;
    }),
  setStage: scopedProcedure("users:write")
    .input(userId.extend({ stage: z.enum(crmStages) }))
    .mutation(({ ctx, input }) =>
      asBadRequest(() => setAdvertiserStage(input.userId, input.stage, ctx.user.id))
    ),
  setTags: scopedProcedure("users:write")
    .input(userId.extend({ tags: z.array(z.string().max(40)).max(12) }))
    .mutation(({ ctx, input }) =>
      asBadRequest(() => setAdvertiserTags(input.userId, input.tags, ctx.user.id))
    ),
  setFollowUp: scopedProcedure("users:write")
    .input(userId.extend({ at: dateOrNull }))
    .mutation(({ ctx, input }) =>
      asBadRequest(() => setAdvertiserFollowUp(input.userId, input.at, ctx.user.id))
    ),
  addNote: scopedProcedure("users:write")
    .input(
      userId.extend({
        kind: z.enum(crmNoteKinds),
        body: z.string().trim().min(2).max(2000),
        followUpAt: dateOrNull.optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      asBadRequest(() =>
        addAdvertiserNote({
          userId: input.userId,
          actorId: ctx.user.id,
          kind: input.kind,
          body: input.body,
          followUpAt: input.followUpAt,
        })
      )
    ),
  deleteNote: scopedProcedure("users:write")
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      asBadRequest(() => deleteAdvertiserNote(input.id, ctx.user.id))
    ),
  revealCpf: scopedProcedure("identity")
    .input(userId)
    .mutation(({ ctx, input }) =>
      asBadRequest(() => revealAdvertiserCpf(input.userId, ctx.user.id))
    ),

  // --- Verificação de identidade ---
  verificationQueue: scopedProcedure("identity")
    .input(
      z
        .object({
          status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
        })
        .optional()
    )
    .query(({ input }) => listVerificationQueue(input?.status ?? "pending")),
  verificationDetail: scopedProcedure("identity")
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => asBadRequest(() => getVerificationDetail(input.id))),
  decideVerification: scopedProcedure("identity")
    .input(
      z.object({
        id: z.number().int().positive(),
        decision: z.enum(["approved", "rejected"]),
        reason: z.string().trim().max(500).optional(),
        checks: z.record(z.string(), z.boolean()).default({}),
        validityDays: z.number().int().min(30).max(730).optional(),
        purgeFiles: z.boolean().default(false),
      })
    )
    .mutation(({ ctx, input }) =>
      asBadRequest(async () => {
        if (input.decision === "approved" && !allChecksPassed(input.checks))
          throw new Error("Confirme todos os itens da conferência antes de aprovar");
        const detail = await getVerificationDetail(input.id);
        const result = await reviewIdentityVerification({
          id: input.id,
          decision: input.decision,
          reason: input.reason,
          validityDays: input.validityDays,
          actorUserId: ctx.user.id,
        });
        const failed = verificationChecks
          .filter(item => input.checks[item.key] === false)
          .map(item => item.key);
        await writeAuditLog({
          actorUserId: ctx.user.id,
          action: "verification.decided",
          entityType: "user",
          entityId: detail.userId,
          metadata: { decision: input.decision, failedChecks: failed },
        });
        let removed = 0;
        if (input.purgeFiles) removed = (await purgeVerificationDocs(detail.userId, ctx.user.id)).removed;
        await addAdvertiserNote({
          userId: detail.userId,
          actorId: ctx.user.id,
          kind: "sistema",
          body:
            input.decision === "approved"
              ? "Identidade aprovada"
              : `Identidade recusada${input.reason ? `: ${input.reason}` : ""}`,
        }).catch(() => undefined);
        return { ...result, removedFiles: removed };
      })
    ),

  // --- Financeiro ---
  payments: scopedProcedure("finance:read", "plans")
    .input(
      z.object({
        bucket: z
          .enum(["all", "paid", "pending", "overdue", "failed", "refunded", "cancelled"])
          .optional(),
        method: z.string().max(20).optional(),
        from: z.string().max(10).nullish(),
        to: z.string().max(10).nullish(),
        search: z.string().trim().max(120).optional(),
        page: z.number().int().min(0).max(5000).optional(),
      })
    )
    .query(({ input }) => listPaymentsAdmin(input)),
  markPayment: scopedProcedure("finance:write", "plans")
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["paid", "pending", "failed", "refunded", "cancelled"]),
        method: z.enum(["pix", "card", "boleto", "manual", "courtesy"]).optional(),
        dueAt: dateOrNull.optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      asBadRequest(() => updatePaymentStatus({ ...input, actorId: ctx.user.id }))
    ),
  planStats: scopedProcedure("plans", "finance:read").query(() => getPlanStats()),

  // --- Relatórios ---
  report: adminProcedure
    .input(
      z.object({
        kind: z.enum(reportKinds),
        from: z.string().max(10).nullish(),
        to: z.string().max(10).nullish(),
        days: z.number().int().min(1).max(366).optional(),
      })
    )
    .query(({ ctx, input }) => {
      const needed: Record<(typeof reportKinds)[number], AdminScope[]> = {
        advertisers: ["users:read"],
        listings: ["profiles:read", "moderation"],
        payments: ["finance:read", "plans"],
        verifications: ["identity"],
      };
      if (!can(ctx.user, ...needed[input.kind]))
        throw new TRPCError({ code: "FORBIDDEN", message: "Sua função não tem acesso a este relatório" });
      return asBadRequest(() =>
        buildReport(input.kind, input, { canSeeFinance: can(ctx.user, "finance:read", "plans") })
      );
    }),

  // --- Busca rápida ---
  search: adminProcedure
    .input(z.object({ q: z.string().trim().max(80) }))
    .query(({ ctx, input }) =>
      searchPanel(input.q, {
        canSeePeople: can(ctx.user, "users:read"),
        canSeeListings: can(ctx.user, "profiles:read", "moderation"),
      })
    ),

  // --- SEO ---
  mediaStats: scopedProcedure("settings").query(() => getMediaOptimizeStats()),
  mediaOptimize: scopedProcedure("settings").mutation(({ ctx }) =>
    asBadRequest(() => runMediaOptimize(ctx.user.id, 10))
  ),
  seoGet: scopedProcedure("settings").query(async () => ({
    overrides: await readSeoOverrides(),
    pages: seoEditablePages.map(page => ({ ...page })),
  })),
  seoSave: scopedProcedure("settings")
    .input(z.object({ image: z.string().max(300), pages: z.record(z.string(), z.any()) }))
    .mutation(async ({ ctx, input }) => {
      const saved = await saveSeoOverrides(normalizeSeoOverrides(input));
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "seo.updated",
        entityType: "site",
        entityId: null,
        metadata: { pages: Object.keys(saved.pages) },
      });
      return saved;
    }),
});
