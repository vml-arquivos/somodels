import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

function baseCookieOptions(req: Request) {
  return {
    httpOnly: true,
    path: "/",
    secure: isSecureRequest(req),
  } as const;
}

export function getSessionCookieOptions(req: Request): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  return { ...baseCookieOptions(req), sameSite: "none" };
}

export function getLocalSessionCookieOptions(req: Request): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  return { ...baseCookieOptions(req), sameSite: "lax" };
}

export function getAgeCookieOptions(req: Request): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure" | "maxAge"> {
  return { ...baseCookieOptions(req), sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 };
}
