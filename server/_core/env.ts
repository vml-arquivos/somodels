const readBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const readInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const canonicalOrigin = (process.env.CANONICAL_ORIGIN ?? "").replace(/\/+$/, "");
const configuredTestMode = readBoolean(process.env.TEST_MODE, false);
const configuredTestAccess = readBoolean(process.env.TEST_ACCESS_ENABLED, false);
const appMode = (process.env.APP_MODE ?? (configuredTestMode && configuredTestAccess ? "test" : "production")).toLowerCase();
const isTestMode = appMode === "test";
const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
const ageVerificationMode = process.env.AGE_VERIFICATION_MODE === "self_attestation" ? "self_attestation" : "provider";

// O commit gravado na imagem no build (Coolify envia SOURCE_COMMIT) vence variáveis
// antigas como APP_RELEASE, que ficavam presas num valor velho depois dos deploys.
function resolveRelease() {
  const built = (process.env.BUILD_COMMIT ?? "").trim();
  if (built && built.toUpperCase() !== "HEAD") return built;
  return (
    process.env.APP_RELEASE?.trim() ||
    process.env.GIT_SHA?.trim() ||
    "development"
  );
}

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
  siteName: process.env.SITE_NAME ?? "Ero Models",
  canonicalOrigin,
  release: resolveRelease(),
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  sessionDurationHours: readInteger(process.env.SESSION_DURATION_HOURS, 12),
  publicAccessEnabled: readBoolean(process.env.PUBLIC_ACCESS_ENABLED, false),
  publicLaunchEnabled: readBoolean(process.env.PUBLIC_LAUNCH_ENABLED, false),
  appMode,
  testMode: isTestMode,
  testAccessEnabled: configuredTestAccess,
  allowTestSignup: readBoolean(process.env.ALLOW_TEST_SIGNUP, isTestMode && configuredTestAccess),
  allowFakeData: readBoolean(process.env.ALLOW_FAKE_DATA, isTestMode),
  allowDemoSeed: readBoolean(process.env.ALLOW_DEMO_SEED, isTestMode),
  demoContactsEnabled: readBoolean(process.env.DEMO_CONTACTS_ENABLED, false),
  robotsNoIndex: readBoolean(process.env.ROBOTS_NOINDEX, isTestMode),
  // New marketplace capabilities are deliberately independent from legacy launch gates.
  // They remain disabled until product/compliance/provider readiness is explicitly approved.
  adultMarketplaceEnabled: readBoolean(process.env.ADULT_MARKETPLACE_ENABLED, false),
  escortListingsEnabled: readBoolean(process.env.ESCORT_LISTINGS_ENABLED, false),
  ageAssuranceEnabled: readBoolean(process.env.AGE_ASSURANCE_ENABLED, false),
  identityVerificationEnabled: readBoolean(process.env.IDENTITY_VERIFICATION_ENABLED, false),
  secureContactEnabled: readBoolean(process.env.SECURE_CONTACT_ENABLED, false),
  sponsoredListingsEnabled: readBoolean(process.env.SPONSORED_LISTINGS_ENABLED, false),
  creatorContent18Enabled: readBoolean(process.env.CREATOR_CONTENT_18_ENABLED, false),
  favoritesEnabled: readBoolean(process.env.FAVORITES_ENABLED, false),
  blockingEnabled: readBoolean(process.env.BLOCKING_ENABLED, false),
  reportsEnabled: readBoolean(process.env.REPORTS_ENABLED, false),
  adminEmails,
  // Armazenamento de mídia: "local" (volume do Coolify), "s3" (S3, R2, Spaces, MinIO) ou "forge".
  storageDriver: (process.env.STORAGE_DRIVER ?? "").trim().toLowerCase(),
  storageLocalDir: (process.env.STORAGE_LOCAL_DIR ?? "/app/storage").trim(),
  s3Endpoint: (process.env.S3_ENDPOINT ?? "").trim(),
  s3Region: (process.env.S3_REGION ?? "us-east-1").trim(),
  s3Bucket: (process.env.S3_BUCKET ?? "").trim(),
  s3AccessKeyId: (process.env.S3_ACCESS_KEY_ID ?? "").trim(),
  s3SecretAccessKey: (process.env.S3_SECRET_ACCESS_KEY ?? "").trim(),
  s3ForcePathStyle: readBoolean(process.env.S3_FORCE_PATH_STYLE, false),
  contactEmail: (process.env.CONTACT_EMAIL ?? "").trim(),
  privacyEmail: (process.env.PRIVACY_EMAIL ?? process.env.CONTACT_EMAIL ?? "").trim(),
  operatorName: (process.env.OPERATOR_NAME ?? "").trim(),
  operatorDocument: (process.env.OPERATOR_DOCUMENT ?? "").trim(),
  adminMfaRequired: readBoolean(process.env.ADMIN_MFA_REQUIRED, false),
  ageVerificationMode,
  ageVerificationProvider: process.env.AGE_VERIFICATION_PROVIDER ?? "",
  ageVerificationApiKey: process.env.AGE_VERIFICATION_API_KEY ?? "",
  ageVerificationWebhookSecret: process.env.AGE_VERIFICATION_WEBHOOK_SECRET ?? "",
  ageVerificationTtlHours: readInteger(process.env.AGE_VERIFICATION_TTL_HOURS, 24),
  requireAgeVerification: readBoolean(process.env.REQUIRE_AGE_VERIFICATION, !isTestMode),
  requireIdentityVerification: readBoolean(process.env.REQUIRE_IDENTITY_VERIFICATION, readBoolean(process.env.KYC_REQUIRED, true)),
  kycRequired: readBoolean(process.env.REQUIRE_IDENTITY_VERIFICATION, readBoolean(process.env.KYC_REQUIRED, true)),
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
  bootstrapDevResetExisting: readBoolean(process.env.BOOTSTRAP_DEV_RESET_EXISTING, false),
  loginRateLimitWindowMs: readInteger(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  loginRateLimitMax: readInteger(process.env.LOGIN_RATE_LIMIT_MAX, 10),
};

export function resolveStorageDriver(): "forge" | "s3" | "local" {
  const explicit = ENV.storageDriver;
  if (explicit === "forge" || explicit === "s3" || explicit === "local") return explicit;
  if (ENV.forgeApiUrl && ENV.forgeApiKey) return "forge";
  if (ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey) return "s3";
  return "local";
}

function storageConfigured() {
  const driver = resolveStorageDriver();
  if (driver === "forge") return Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
  if (driver === "s3")
    return Boolean(ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey);
  return Boolean(ENV.storageLocalDir);
}

export const runtimeConfigStatus = () => ({
  database: Boolean(ENV.databaseUrl),
  sessionSecret: Boolean(ENV.cookieSecret),
  oauth: Boolean(ENV.appId && ENV.oAuthServerUrl && ENV.oauthPortalUrl),
  storage: storageConfigured(),
  ageVerification: isAgeVerificationConfigured(),
  kyc: Boolean(ENV.kycProvider && ENV.kycApiKey && ENV.kycWebhookSecret),
  payments: Boolean(
    ENV.paymentsEnabled &&
      ENV.paymentProvider &&
      ENV.paymentApiKey &&
      ENV.paymentWebhookSecret,
  ),
});

export function isAgeVerificationConfigured() {
  return (
    ENV.ageVerificationMode === "self_attestation" ||
    Boolean(
      ENV.ageVerificationProvider &&
        ENV.ageVerificationApiKey &&
        ENV.ageVerificationWebhookSecret,
    )
  );
}

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
