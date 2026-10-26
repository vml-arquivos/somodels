import { createHash } from "node:crypto";
import { readSiteSettings } from "./site-config";
import { z } from "zod";
import { and, eq, desc, sql, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  adminScopesFor,
  publicProcedure,
  router,
  scopedProcedure,
} from "./_core/trpc";
import {
  getDb,
  getAdminProfile,
  getUserById,
  saveProfile,
  createLocalUser,
  getOperationalCounts,
} from "./db";
import {
  users,
  profiles,
  authSessions,
  passwordResetTokens,
  auditLogs,
  siteSettings,
  financeEntries,
} from "../drizzle/schema";
import { createOpaqueToken, hashToken, hashPassword } from "./auth-crypto";
import { assertPasswordPolicy } from "./auth";
import { ENV } from "./_core/env";
import { adminFunctionKeys } from "../shared/admin-access";
import { adminNavigationBadges } from "../shared/admin-navigation";
import { profileInputSchema } from "../shared/profile-schema";
import { defaultSiteSettings, siteSettingsSchema } from "../shared/portfolio";
import type { User } from "../drizzle/schema";

const paging = z
  .object({
    page: z.number().int().min(0).default(0),
    search: z.string().trim().max(120).default(""),
    status: z.enum(["all", "active", "suspended"]).default("all"),
    // clients: contas sem anúncio · owners: titulares (com anúncio) · admins: equipe
    kind: z.enum(["all", "clients", "owners", "admins", "system"]).default("all"),
  })
  .default({ page: 0, search: "", status: "all", kind: "all" });
const hasProfileSql = sql`EXISTS (SELECT 1 FROM profiles pr WHERE pr.ownerId = users.id AND pr.deletedAt IS NULL)`;
const accountKindWhere = (kind: string) => {
  switch (kind) {
    case "clients":
      return sql`${users.role} = 'user' AND NOT ${hasProfileSql}`;
    case "owners":
      return sql`${users.role} = 'user' AND ${hasProfileSql}`;
    case "admins":
    case "system":
      return sql`${users.role} <> 'user'`;
    default:
      return undefined;
  }
};
const idSchema = z.object({ id: z.number().int().positive() });
const userFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  adminFunction: users.adminFunction,
  accountStatus: users.accountStatus,
  emailVerifiedAt: users.emailVerifiedAt,
  mustChangePassword: users.mustChangePassword,
  createdAt: users.createdAt,
  lastSignedIn: users.lastSignedIn,
};
type ManagementActor = Pick<User, "id" | "role"> &
  Partial<Pick<User, "email" | "emailVerifiedAt">>;

function effectiveAdminRole(actor: ManagementActor) {
  if (["dev", "super_admin", "admin"].includes(actor.role)) return actor.role;
  const configuredAdmin =
    Boolean(actor.email && actor.emailVerifiedAt) &&
    ENV.adminEmails.includes(actor.email!.toLowerCase());
  return configuredAdmin ? "admin" : null;
}

export function canManage(
  actor: ManagementActor,
  target: Pick<User, "id" | "role">
) {
  if (actor.id === target.id) return false;
  const role = effectiveAdminRole(actor);
  return role === "dev"
    ? target.role !== "dev"
    : role === "super_admin"
      ? ["user", "admin"].includes(target.role)
      : role === "admin" && target.role === "user";
}
async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Banco indisponível",
    });
  return db;
}
async function targetFor(actor: User, id: number) {
  const target = await getUserById(id);
  if (
    !target ||
    !canManage(actor, target) ||
    target.openId.startsWith("deleted:")
  )
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não pode alterar esta conta",
    });
  return target;
}
function adminVisibility(actor: User) {
  return effectiveAdminRole(actor) === "dev"
    ? undefined
    : sql`${users.role} <> 'dev'`;
}
async function audit(
  tx: any,
  actor: number,
  action: string,
  entityType: string,
  entityId?: number,
  metadata = {}
) {
  await tx.insert(auditLogs).values({
    actorUserId: actor,
    action,
    entityType,
    entityId,
    metadata: JSON.stringify(metadata),
  });
}
export const managementRouter = router({
  settings: publicProcedure.query(readSiteSettings),
  saveSettings: scopedProcedure("settings")
    .input(siteSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.transaction(async tx => {
        await tx
          .insert(siteSettings)
          .values({ id: 1, value: JSON.stringify(input) })
          .onDuplicateKeyUpdate({ set: { value: JSON.stringify(input) } });
        await audit(tx, ctx.user.id, "settings.updated", "site", 1);
      });
      return { success: true };
    }),
  users: scopedProcedure("users:read").input(paging).query(async ({ ctx, input }) => {
    const db = await database();
    const where = and(
      adminVisibility(ctx.user),
      input.search
        ? or(
            like(users.name, `%${input.search}%`),
            like(users.email, `%${input.search}%`)
          )
        : undefined,
      input.status === "all" ? undefined : eq(users.accountStatus, input.status),
      accountKindWhere(input.kind)
    );
    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(where);
    const items = await db
      .select({
        ...userFields,
        profilesCount: sql<number>`(SELECT COUNT(*) FROM profiles pc WHERE pc.ownerId = users.id AND pc.deletedAt IS NULL)`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.id))
      .limit(25)
      .offset(input.page * 25);
    return {
      items: items.map(item => ({ ...item, profilesCount: Number(item.profilesCount ?? 0) })),
      total: Number(total.count),
    };
  }),
  userSummary: scopedProcedure("users:read").query(async ({ ctx }) => {
    const db = await database();
    const visible = adminVisibility(ctx.user);
    const count = async (extra?: any) => {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(visible, extra));
      return Number(row?.count ?? 0);
    };
    return {
      clients: await count(accountKindWhere("clients")),
      owners: await count(accountKindWhere("owners")),
      admins: await count(accountKindWhere("admins")),
      suspended: await count(eq(users.accountStatus, "suspended")),
    };
  }),
  userDetail: scopedProcedure("users:read").input(idSchema).query(async ({ ctx, input }) => {
    const db = await database();
    const [user] = await db
      .select(userFields)
      .from(users)
      .where(and(eq(users.id, input.id), adminVisibility(ctx.user)));
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    const owned = await db
      .select()
      .from(profiles)
      .where(eq(profiles.ownerId, user.id));
    return { user, profiles: owned, editable: canManage(ctx.user, user) };
  }),
  updateUser: scopedProcedure("users:write")
    .input(
      idSchema.extend({
        name: z.string().trim().min(2).max(120),
        email: z.string().email().max(320),
        role: z.enum(["user", "admin", "super_admin"]),
        // Função da equipe (só vale para role admin). null = acesso total.
        adminFunction: z.enum(adminFunctionKeys).nullable().optional(),
        accountStatus: z.enum(["active", "suspended"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.role === "super_admin" && effectiveAdminRole(ctx.user) !== "dev")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Só o desenvolvedor pode conceder o nível Super administrador",
        });
      const db = await database();
      await db.transaction(async tx => {
        const [target] = await tx
          .select()
          .from(users)
          .where(eq(users.id, input.id))
          .for("update");
        if (
          !target ||
          !canManage(ctx.user, target) ||
          target.openId.startsWith("deleted:") ||
          (effectiveAdminRole(ctx.user) === "admin" && input.role !== "user")
        )
          throw new TRPCError({ code: "FORBIDDEN" });
        const email = input.email.trim().toLowerCase();
        // Só dev/super_admin definem a função; quem não envia mantém a atual.
        const canAssignFunction = ["dev", "super_admin"].includes(
          effectiveAdminRole(ctx.user) || ""
        );
        const nextFunction =
          input.role !== "admin"
            ? null
            : canAssignFunction && input.adminFunction !== undefined
              ? input.adminFunction
              : target.adminFunction;
        await tx
          .update(users)
          .set({
            name: input.name,
            email,
            role: input.role,
            adminFunction: nextFunction,
            accountStatus: input.accountStatus,
            emailVerifiedAt:
              email === target.email ? target.emailVerifiedAt : null,
          })
          .where(eq(users.id, input.id));
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(eq(authSessions.userId, input.id));
        await tx
          .update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(eq(passwordResetTokens.userId, input.id));
        await audit(tx, ctx.user.id, "user.updated", "user", input.id, {
          previousRole: target.role,
          role: input.role,
          previousFunction: target.adminFunction ?? null,
          adminFunction: nextFunction,
          status: input.accountStatus,
        });
      });
      return { success: true };
    }),
  createUser: scopedProcedure("users:write")
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        email: z.string().email().max(320),
        password: z.string().min(16).max(200),
        role: z.enum(["user", "admin", "super_admin"]),
        adminFunction: z.enum(adminFunctionKeys).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.role === "super_admin" && effectiveAdminRole(ctx.user) !== "dev")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Só o desenvolvedor pode conceder o nível Super administrador",
        });
      if (
        input.role !== "user" &&
        !["dev", "super_admin"].includes(effectiveAdminRole(ctx.user) || "")
      )
        throw new TRPCError({ code: "FORBIDDEN" });
      assertPasswordPolicy(input.password);
      const db = await database();
      const email = input.email.trim().toLowerCase();
      const passwordHash = await hashPassword(input.password);
      try {
        return await db.transaction(async tx => {
          const [result] = await tx.insert(users).values({
            name: input.name,
            email,
            passwordHash,
            role: input.role,
            adminFunction: input.role === "admin" ? (input.adminFunction ?? null) : null,
            openId: `local:${createHash("sha256").update(email).digest("hex").slice(0, 48)}`,
            accountStatus: "active",
            loginMethod: "password",
            mustChangePassword: true,
            emailVerifiedAt: null,
          });
          const id = Number(result.insertId);
          await audit(tx, ctx.user.id, "user.created", "user", id, {
            role: input.role,
            adminFunction: input.role === "admin" ? (input.adminFunction ?? null) : null,
          });
          return { id };
        });
      } catch (e) {
        if (
          (e as any)?.code === "ER_DUP_ENTRY" ||
          (e as any)?.cause?.code === "ER_DUP_ENTRY"
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe uma conta para este e-mail",
          });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível criar a conta",
        });
      }
    }),
  anonymizeUser: scopedProcedure("users:delete")
    .input(idSchema.extend({ confirmation: z.literal("EXCLUIR") }))
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.transaction(async tx => {
        const [target] = await tx
          .select()
          .from(users)
          .where(eq(users.id, input.id))
          .for("update");
        if (!target || !canManage(ctx.user, target) || target.role !== "user")
          throw new TRPCError({ code: "FORBIDDEN" });
        await tx
          .update(users)
          .set({
            name: "Conta excluída",
            email: null,
            passwordHash: null,
            emailVerifiedAt: null,
            openId: `deleted:${input.id}:${createOpaqueToken().slice(0, 16)}`,
            accountStatus: "suspended",
          })
          .where(eq(users.id, input.id));
        await tx
          .update(profiles)
          .set({
            isPublished: false,
            status: "suspended",
            phone: null,
            whatsapp: null,
            telegram: null,
            portfolioReviewed: false,
          })
          .where(eq(profiles.ownerId, input.id));
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(eq(authSessions.userId, input.id));
        await tx
          .delete(passwordResetTokens)
          .where(eq(passwordResetTokens.userId, input.id));
        await audit(tx, ctx.user.id, "user.anonymized", "user", input.id);
      });
      return { success: true };
    }),
  resetLink: scopedProcedure("users:write").input(idSchema).mutation(async ({ ctx, input }) => {
    const db = await database();
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    if (!ENV.canonicalOrigin)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Configure CANONICAL_ORIGIN antes de gerar links",
      });
    await db.transaction(async tx => {
      const [target] = await tx
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .for("update");
      if (
        !target ||
        !canManage(ctx.user, target) ||
        target.accountStatus !== "active" ||
        target.openId.startsWith("deleted:")
      )
        throw new TRPCError({ code: "FORBIDDEN" });
      await tx
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, input.id));
      await tx
        .insert(passwordResetTokens)
        .values({ userId: input.id, tokenHash: hashToken(token), expiresAt });
      await audit(tx, ctx.user.id, "password_reset.issued", "user", input.id);
    });
    return {
      url: `${ENV.canonicalOrigin}/redefinir-senha#token=${token}`,
      expiresAt,
    };
  }),
  resetPassword: publicProcedure
    .input(
      z.object({
        // createOpaqueToken emits 32 random bytes encoded as base64url.
        // Validate its alphabet/size without coupling the public input to the
        // SHA-256 digest length stored in the database.
        token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        password: z.string().min(16).max(200),
      })
    )
    .mutation(async ({ input }) => {
      assertPasswordPolicy(input.password);
      const db = await database();
      await db.transaction(async tx => {
        // Lock the account first, matching issuance/revocation lock order.
        const [hint] = await tx
          .select({ userId: passwordResetTokens.userId })
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.tokenHash, hashToken(input.token)));
        if (!hint)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Link inválido ou expirado",
          });
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, hint.userId))
          .for("update");
        const [token] = await tx
          .select()
          .from(passwordResetTokens)
          .where(
            and(
              eq(passwordResetTokens.tokenHash, hashToken(input.token)),
              sql`${passwordResetTokens.usedAt} IS NULL`,
              sql`${passwordResetTokens.expiresAt} > UTC_TIMESTAMP()`
            )
          )
          .for("update");
        if (!token || !user || user.accountStatus !== "active")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Link inválido ou expirado",
          });
        const encoded = await hashPassword(input.password);
        await tx
          .update(users)
          .set({
            passwordHash: encoded,
            mustChangePassword: false,
            loginMethod: "password",
          })
          .where(eq(users.id, user.id));
        await tx
          .update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(eq(passwordResetTokens.userId, user.id));
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(eq(authSessions.userId, user.id));
        await audit(tx, user.id, "password_reset.completed", "user", user.id);
      });
      return { success: true };
    }),
  saveProfile: scopedProcedure("profiles:write")
    .input(
      profileInputSchema.extend({
        id: z.number().int().positive().optional(),
        ownerId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
    const target = await getUserById(input.ownerId);
    if (
      !target ||
      !(ctx.user.id === target.id || canManage(ctx.user, target))
    )
      throw new TRPCError({ code: "FORBIDDEN" });

    if (input.id) {
      const detail = await getAdminProfile(input.id);
      if (!detail || detail.profile.ownerId !== input.ownerId)
        throw new TRPCError({ code: "FORBIDDEN" });
      if (detail.profile.deletedAt)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Restaure o perfil antes de editá-lo",
        });
    } else if (target.accountStatus !== "active") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "O titular precisa estar ativo para criar um novo perfil",
      });
    }
      const { id, ownerId, ...data } = input;
      const profileId = await saveProfile(ownerId, data as any, id, false);
      const db = await database();
      await audit(
        db,
        ctx.user.id,
        "profile.admin_edited",
        "profile",
        profileId
      );
      return profileId;
    }),
  overview: adminProcedure.query(async ({ ctx }) => {
    const db = await database();
    const [accounts] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(${users.accountStatus} = 'active')`,
        suspended: sql<number>`sum(${users.accountStatus} = 'suspended')`,
      })
      .from(users)
      .where(adminVisibility(ctx.user));
    const [portfolio] = await db
      .select({
        total: sql<number>`count(*)`,
        published: sql<number>`sum(${profiles.isActive} = 1 AND ${profiles.deletedAt} IS NULL AND ${profiles.isPublished} = 1 AND ${profiles.portfolioReviewed} = 1 AND ${profiles.status} = 'approved' AND EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${profiles.ownerId} AND ${users.accountStatus} = 'active'))`,
        pending: sql<number>`sum(${profiles.deletedAt} IS NULL AND ${profiles.isActive} = 1 AND ${profiles.status} = 'pending')`,
      })
      .from(profiles);
    const cities = await db
      .select({ label: profiles.city, total: sql<number>`count(*)` })
      .from(profiles)
      .groupBy(profiles.city)
      .orderBy(sql`count(*) DESC`)
      .limit(20);
    const states = await db
      .select({ label: profiles.status, total: sql<number>`count(*)` })
      .from(profiles)
      .groupBy(profiles.status);
    const groups = await db
      .select({ categories: profiles.categories, total: sql<number>`count(*)` })
      .from(profiles)
      .groupBy(profiles.categories);
    const counts: Record<string, number> = {};
    for (const group of groups) {
      try {
        const categories = JSON.parse(group.categories || "[]");
        if (Array.isArray(categories))
          for (const c of Array.from(new Set(categories))) {
            if (typeof c === "string")
              counts[c] = (counts[c] || 0) + Number(group.total);
          }
      } catch {}
    }
    const types = Object.entries(counts)
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
    return { accounts, portfolio, cities, states, types };
  }),
  navigationCounts: scopedProcedure().query(async ({ ctx }) => {
    const counts = await getOperationalCounts();
    return adminNavigationBadges(adminScopesFor(ctx.user), counts);
  }),
  audit: scopedProcedure("audit")
    .input(
      z
        .object({ page: z.number().int().min(0).default(0) })
        .default({ page: 0 })
    )
    .query(async ({ ctx, input }) => {
      const db = await database();
      // Regular admins do not receive privileged actor/target activity.
      const where =
        ctx.user.role === "dev"
          ? undefined
          : sql`NOT EXISTS (SELECT 1 FROM ${users} WHERE ${users.role} = 'dev' AND (${users.id} = ${auditLogs.actorUserId} OR (${auditLogs.entityType} = 'user' AND ${users.id} = ${auditLogs.entityId})))`;
      return db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          actorUserId: auditLogs.actorUserId,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.id))
        .limit(50)
        .offset(input.page * 50);
    }),
  finance: scopedProcedure("finance:read").query(async () => {
    const db = await database();
    const [totals] = await db
      .select({
        income: sql<number>`coalesce(sum(case when ${financeEntries.kind} = 'income' then ${financeEntries.amountCents} else 0 end),0)`,
        expense: sql<number>`coalesce(sum(case when ${financeEntries.kind} = 'expense' then ${financeEntries.amountCents} else 0 end),0)`,
      })
      .from(financeEntries)
      .where(sql`${financeEntries.voidedAt} IS NULL`);
    const items = await db
      .select()
      .from(financeEntries)
      .orderBy(desc(financeEntries.id))
      .limit(100);
    return { totals, items };
  }),
  addFinance: scopedProcedure("finance:write")
    .input(
      z.object({
        requestId: z.string().uuid(),
        kind: z.enum(["income", "expense"]),
        description: z.string().trim().min(3).max(250),
        amountCents: z.number().int().min(1).max(100000000),
        occurredOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .refine(
            v =>
              !Number.isNaN(Date.parse(v)) &&
              new Date(v).toISOString().slice(0, 10) === v,
            "Data inválida"
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.transaction(async tx => {
        await tx
          .insert(financeEntries)
          .values({ ...input, createdBy: ctx.user.id });
        await audit(tx, ctx.user.id, "finance.created", "finance", undefined, {
          requestId: input.requestId,
        });
      });
      return { success: true };
    }),
  voidFinance: scopedProcedure("finance:write")
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.transaction(async tx => {
        await tx
          .update(financeEntries)
          .set({ voidedAt: new Date() })
          .where(
            and(
              eq(financeEntries.id, input.id),
              sql`${financeEntries.voidedAt} IS NULL`
            )
          );
        await audit(tx, ctx.user.id, "finance.voided", "finance", input.id);
      });
      return { success: true };
    }),
});
