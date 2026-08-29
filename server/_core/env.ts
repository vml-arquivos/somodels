const readBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const readInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const canonicalOrigin = (process.env.CANONICAL_ORIGIN ?? "").replace(/\/+$/, "");

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  oauthPortalUrl: process.env.VITE_OAUTH_PORTAL_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: readInteger(process.env.PORT, 3000),
  trustProxy: readBoolean(process.env.TRUST_PROXY, true),
  siteName: process.env.SITE_NAME ?? "Só Models",
  canonicalOrigin,
  release: process.env.APP_RELEASE ?? process.env.GIT_SHA ?? "development",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  sessionDurationHours: readInteger(process.env.SESSION_DURATION_HOURS, 12),
  publicAccessEnabled: readBoolean(process.env.PUBLIC_ACCESS_ENABLED, false),
  ageVerificationProvider: process.env.AGE_VERIFICATION_PROVIDER ?? "",
  ageVerificationApiKey: process.env.AGE_VERIFICATION_API_KEY ?? "",
  ageVerificationWebhookSecret: process.env.AGE_VERIFICATION_WEBHOOK_SECRET ?? "",
  ageVerificationTtlHours: readInteger(process.env.AGE_VERIFICATION_TTL_HOURS, 24),
  kycRequired: readBoolean(process.env.KYC_REQUIRED, true),
  kycProvider: process.env.KYC_PROVIDER ?? "",
  kycApiKey: process.env.KYC_API_KEY ?? "",
  kycWebhookSecret: process.env.KYC_WEBHOOK_SECRET ?? "",
  paymentsEnabled: readBoolean(process.env.PAYMENTS_ENABLED, false),
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "",
  paymentApiKey: process.env.PAYMENT_API_KEY ?? "",
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
  allowedOrigin: canonicalOrigin || process.env.ALLOWED_ORIGIN || "",
  bootstrapSuperAdminEmail: process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? "",
  bootstrapSuperAdminPassword: process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? "",
  bootstrapDevEmail: process.env.BOOTSTRAP_DEV_EMAIL ?? "",
  bootstrapDevPassword: process.env.BOOTSTRAP_DEV_PASSWORD ?? "",
  loginRateLimitWindowMs: readInteger(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  loginRateLimitMax: readInteger(process.env.LOGIN_RATE_LIMIT_MAX, 10),
};

export const runtimeConfigStatus = () => ({
  database: Boolean(ENV.databaseUrl),
  sessionSecret: Boolean(ENV.cookieSecret),
  oauth: Boolean(ENV.appId && ENV.oAuthServerUrl && ENV.oauthPortalUrl),
  storage: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
  ageVerification: Boolean(
    ENV.ageVerificationProvider &&
      ENV.ageVerificationApiKey &&
      ENV.ageVerificationWebhookSecret,
  ),
  kyc: Boolean(ENV.kycProvider && ENV.kycApiKey && ENV.kycWebhookSecret),
  payments: Boolean(
    ENV.paymentsEnabled &&
      ENV.paymentProvider &&
      ENV.paymentApiKey &&
      ENV.paymentWebhookSecret,
  ),
});

export function assertProductionConfig() {
  if (!ENV.isProduction) return;
  const missing: string[] = [];
  if (!ENV.databaseUrl) missing.push("DATABASE_URL");
  if (ENV.cookieSecret.length < 32) missing.push("JWT_SECRET (mínimo de 32 caracteres)");
  if (!ENV.canonicalOrigin) missing.push("CANONICAL_ORIGIN");
  if (missing.length > 0) {
    throw new Error(`Configuração de produção incompleta: ${missing.join(", ")}`);
  }
}
