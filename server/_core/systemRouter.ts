import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { ENV, runtimeConfigStatus } from "./env";

export const systemRouter = router({
  health: publicProcedure
    .input(z.object({ timestamp: z.number().min(0, "timestamp cannot be negative") }))
    .query(() => ({ ok: true, release: ENV.release })),

  config: publicProcedure.query(() => ({
    siteName: ENV.siteName,
    release: ENV.release,
    publicAccessEnabled: ENV.publicAccessEnabled,
    ageVerificationRequired: true,
    ageVerificationConfigured: runtimeConfigStatus().ageVerification,
    kycRequired: ENV.kycRequired,
    paymentsEnabled: runtimeConfigStatus().payments,
  })),

  notifyOwner: adminProcedure
    .input(z.object({ title: z.string().min(1), content: z.string().min(1) }))
    .mutation(async ({ input }) => ({ success: await notifyOwner(input) } as const)),
});
