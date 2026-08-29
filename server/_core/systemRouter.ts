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
    publicLaunchEnabled: ENV.publicLaunchEnabled,
    appMode: ENV.appMode,
    testMode: ENV.testMode && ENV.testAccessEnabled,
    allowTestSignup: ENV.allowTestSignup,
    allowFakeData: ENV.allowFakeData,
    allowDemoSeed: ENV.allowDemoSeed,
    demoContactsEnabled: ENV.demoContactsEnabled,
    robotsNoIndex: ENV.robotsNoIndex,
    ageVerificationRequired: ENV.requireAgeVerification,
    ageVerificationConfigured: runtimeConfigStatus().ageVerification,
    kycRequired: ENV.requireIdentityVerification,
    paymentsEnabled: runtimeConfigStatus().payments,
  })),

  notifyOwner: adminProcedure
    .input(z.object({ title: z.string().min(1), content: z.string().min(1) }))
    .mutation(async ({ input }) => ({ success: await notifyOwner(input) } as const)),
});
