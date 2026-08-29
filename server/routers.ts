import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createMedia, getOwnerProfile, getOwnerProfiles, getPublicProfile, listPendingMedia, listPendingProfiles, listPublishedProfiles, moderateMedia, moderateProfile, saveProfile } from "./db";

export const profileInputSchema = z.object({
  stageName: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(5000).optional(),
  city: z.string().trim().min(2).max(120),
  region: z.string().trim().max(80).optional(),
  categories: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  attributes: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  contactOptions: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  avatarUrl: z.string().url().or(z.string().startsWith("/manus-storage/")).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  profiles: router({
    list: publicProcedure.input(z.object({ search: z.string().optional(), city: z.string().optional(), category: z.string().optional(), attribute: z.string().optional() }).optional()).query(({ input }) => listPublishedProfiles(input ?? {})),
    bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getPublicProfile(input.slug)),
    mine: protectedProcedure.query(({ ctx }) => getOwnerProfiles(ctx.user.id)),
    mineById: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getOwnerProfile(ctx.user.id, input.id)),
    save: protectedProcedure.input(profileInputSchema.extend({ id: z.number().int().positive().optional(), submitForReview: z.boolean().default(false) })).mutation(({ ctx, input }) => { const { id, submitForReview, ...data } = input; return saveProfile(ctx.user.id, data as any, id, submitForReview); }),
  }),
  media: router({
    add: protectedProcedure.input(z.object({ profileId: z.number().int().positive(), kind: z.enum(["photo", "video"]), title: z.string().max(160).optional(), description: z.string().max(2000).optional(), storageKey: z.string().min(1), url: z.string().min(1), mimeType: z.string().min(1).max(120), isPremium: z.boolean().default(false), sortOrder: z.number().int().default(0) })).mutation(({ ctx, input }) => createMedia(ctx.user.id, input as any)),
  }),
  admin: router({
    pendingProfiles: adminProcedure.query(() => listPendingProfiles()),
    pendingMedia: adminProcedure.query(() => listPendingMedia()),
    moderateProfile: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "suspended", "pending"]), isFeatured: z.boolean().optional() })).mutation(({ input }) => moderateProfile(input.id, input.status, input.isFeatured)),
    moderateMedia: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected", "private"]) })).mutation(({ input }) => moderateMedia(input.id, input.status)),
  }),
});

export type AppRouter = typeof appRouter;
