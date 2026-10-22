export const ACCOUNT_HOST = "conta.eromodels.com.br";
export const ADMIN_HOST = "admin.eromodels.com.br";

export function normalizeRequestHost(host: string | undefined | null) {
  return String(host ?? "")
    .split(",", 1)[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

export function getPrivateHostLanding(host: string | undefined | null) {
  const normalizedHost = normalizeRequestHost(host);
  if (normalizedHost === ACCOUNT_HOST) return "/conta";
  if (normalizedHost === ADMIN_HOST) return "/admin";
  return null;
}

export function isPrivateHost(host: string | undefined | null) {
  return getPrivateHostLanding(host) !== null;
}
