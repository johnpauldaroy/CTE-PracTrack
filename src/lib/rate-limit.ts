import { NextRequest } from "next/server";

/**
 * Best-effort in-memory limiter for the unauthenticated write endpoints (registration,
 * email verification). It is per server instance, so on serverless hosting it slows
 * down abuse rather than guaranteeing a hard cap; the real protections are the hashed,
 * attempt-limited verification codes and the approval steps behind registration.
 */
const hits = new Map<string, number[]>();

export class RateLimitError extends Error {
  constructor(message = "Too many attempts. Please wait a minute and try again.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function clientKey(request: NextRequest, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${scope}:${forwarded || request.headers.get("x-real-ip") || "unknown"}`;
}

export function assertWithinRateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) throw new RateLimitError();
  recent.push(now);
  hits.set(key, recent);
  // Keep the map from growing without bound.
  if (hits.size > 5000) for (const [k, times] of hits) if (times.every((time) => now - time >= windowMs)) hits.delete(k);
}
