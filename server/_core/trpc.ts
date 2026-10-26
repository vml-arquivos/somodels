import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";
import { getUserMfa } from "../db";
import {
  hasAnyScope,
  resolveAdminScopes,
  type AdminScope,
} from "../../shared/admin-access";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || ctx.user.accountStatus !== "active") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Password rotation itself must remain accessible to an active account.
export const authenticatedProcedure = t.procedure.use(requireUser);
export const protectedProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.mustChangePassword) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Altere sua senha antes de continuar" });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const configuredAdmin = ctx.user?.email && ctx.user.emailVerifiedAt ? ENV.adminEmails.includes(ctx.user.email.toLowerCase()) : false;
    if (!ctx.user || (!['admin', 'super_admin', 'dev'].includes(ctx.user.role) && !configuredAdmin)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    if (ENV.adminMfaRequired) {
      const mfa = await getUserMfa(ctx.user.id);
      if (!mfa?.enabledAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: MFA_ENROLLMENT_REQUIRED,
        });
      }
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/** Áreas liberadas ao administrador autenticado (já validado como admin). */
export function adminScopesFor(user: {
  role: string;
  adminFunction?: string | null;
  email?: string | null;
  emailVerifiedAt?: Date | null;
}) {
  const configuredAdmin = Boolean(
    user.email &&
      user.emailVerifiedAt &&
      ENV.adminEmails.includes(user.email.toLowerCase()),
  );
  return resolveAdminScopes({
    role: user.role,
    adminFunction: user.adminFunction,
    configuredAdmin,
  });
}

export const NO_SCOPE_ERR_MSG = "Sua função não tem acesso a esta área";

/**
 * Procedure administrativo restrito por área. Basta ter UMA das permissões
 * listadas. A checagem é feita no servidor, não só escondendo abas.
 */
export const scopedProcedure = (...needed: AdminScope[]) =>
  adminProcedure.use(async ({ ctx, next }) => {
    if (!hasAnyScope(adminScopesFor(ctx.user), needed)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NO_SCOPE_ERR_MSG });
    }
    return next();
  });

export const MFA_ENROLLMENT_REQUIRED =
  "Ative a verificação em duas etapas para acessar a administração";
