// TOTP (RFC 6238, SHA-1, 6 dígitos, passo de 30 s) sem dependências externas.
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_STEP_SECONDS = 30;

export function base32Encode(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of Array.from(buffer)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string) {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Segredo TOTP inválido");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function totpAt(secretBase32: string, step: number, digits = 6) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secretBase32))
    .update(counter)
    .digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary =
    ((hmac[offset] & 127) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function currentStep(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
}

/**
 * Retorna o passo que bateu (para impedir reuso do mesmo código) ou null.
 * Aceita uma janela de ±1 passo para tolerar diferença de relógio.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  options: { nowMs?: number; lastStep?: number; window?: number } = {}
) {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return null;
  const now = currentStep(options.nowMs);
  const window = options.window ?? 1;
  for (let delta = -window; delta <= window; delta++) {
    const step = now + delta;
    if (step <= (options.lastStep ?? 0)) continue;
    const expected = Buffer.from(totpAt(secretBase32, step));
    const given = Buffer.from(normalized);
    if (timingSafeEqual(expected, given)) return step;
  }
  return null;
}

export function otpauthUrl(secretBase32: string, account: string, issuer: string) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${TOTP_STEP_SECONDS}`;
}

// O segredo fica cifrado em repouso (AES-256-GCM) com chave derivada do JWT_SECRET.
function encryptionKey(appSecret: string) {
  return createHash("sha256").update(`mfa:${appSecret}`).digest();
}

export function encryptSecret(secret: string, appSecret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(appSecret), iv);
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string, appSecret: string) {
  const [iv, tag, data] = payload.split(".").map(part => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(appSecret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
