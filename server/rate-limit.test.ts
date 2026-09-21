import { describe, expect, it } from "vitest";
import { createInMemoryRateLimiter } from "./rate-limit";

describe("in-memory rate limiter", () => {
  it("allows up to the configured limit and returns a retry window", () => {
    let now = 1_000;
    const limiter = createInMemoryRateLimiter({
      max: 2,
      windowMs: 10_000,
      now: () => now,
    });

    expect(limiter.consume("user:1").allowed).toBe(true);
    expect(limiter.consume("user:1").allowed).toBe(true);
    const blocked = limiter.consume("user:1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(10);

    now += 10_001;
    expect(limiter.consume("user:1").allowed).toBe(true);
  });

  it("keeps independent keys isolated and bounds stored keys", () => {
    const limiter = createInMemoryRateLimiter({ max: 1, windowMs: 10_000, maxKeys: 100 });
    expect(limiter.consume("user:1").allowed).toBe(true);
    expect(limiter.consume("user:2").allowed).toBe(true);
    expect(limiter.size()).toBe(2);
  });
});
