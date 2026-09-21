export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimiterOptions = {
  max: number;
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
};

/**
 * Small-process limiter for sensitive mutations. Production deployments with
 * multiple replicas still need an edge/shared-store limiter in front of this.
 */
export function createInMemoryRateLimiter(options: RateLimiterOptions) {
  const entries = new Map<string, RateLimitEntry>();
  const now = options.now ?? (() => Date.now());
  const maxKeys = Math.max(100, options.maxKeys ?? 10_000);

  function prune(currentTime: number) {
    entries.forEach((entry, key) => {
      if (entry.resetAt <= currentTime) entries.delete(key);
    });
    while (entries.size >= maxKeys) {
      const first = entries.keys().next().value as string | undefined;
      if (!first) break;
      entries.delete(first);
    }
  }

  return {
    consume(key: string): RateLimitDecision {
      const currentTime = now();
      prune(currentTime);
      const current = entries.get(key);
      if (!current || current.resetAt <= currentTime) {
        entries.set(key, { count: 1, resetAt: currentTime + options.windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      if (current.count >= options.max) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
        };
      }
      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    clear() {
      entries.clear();
    },
    size() {
      return entries.size;
    },
  };
}

export const sensitiveRateLimits = {
  login: { max: 10, windowMs: 15 * 60 * 1000 },
  upload: { max: 20, windowMs: 60 * 60 * 1000 },
  report: { max: 10, windowMs: 15 * 60 * 1000 },
  contact: { max: 30, windowMs: 15 * 60 * 1000 },
} as const;

export function rateLimitMessage(retryAfterSeconds: number) {
  return `Muitas solicitações. Tente novamente em ${retryAfterSeconds} segundos.`;
}
