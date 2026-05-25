// Phase 1 in-memory placeholder for HP-6. Phase 7 follow-up: Upstash Redis ratelimit.
//
// In-memory token bucket keyed by client IP. Single-process semantics — fine for
// the single Next.js node in Phase 1 dev/preview, NOT distributed-correct across
// Vercel serverless invocations. The Phase 7 Upstash upgrade is documented in
// .planning/phases/01-spine-plan-lifecycle/01-RESEARCH.md §HP-6.
//
// CONTRACT:
// - Default capacity 10 tokens; refill at 10/60 tokens per second (10 req/min).
// - `rateLimitOrAllow(ip)` returns `{ allowed, retryAfterMs }`. When `allowed`
//   is false, callers should set a Retry-After header and 302 to a benign route.
// - The bucket Map is capped at 10k entries. When full, the oldest `lastRefill`
//   entry is evicted (cheap LRU approximation) — this prevents unbounded memory
//   growth under adversarial unique-IP traffic.

interface Bucket {
  tokens: number;
  lastRefill: number; // ms since epoch
}

interface Options {
  capacity?: number;
  refillPerSec?: number;
}

const MAX_ENTRIES = 10_000;
const DEFAULT_CAPACITY = 10;
const DEFAULT_REFILL_PER_SEC = 10 / 60; // 10 tokens / minute

const buckets = new Map<string, Bucket>();

function evictOldestIfFull() {
  if (buckets.size < MAX_ENTRIES) return;
  let oldestKey: string | null = null;
  let oldestRefill = Number.POSITIVE_INFINITY;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < oldestRefill) {
      oldestRefill = bucket.lastRefill;
      oldestKey = key;
    }
  }
  if (oldestKey !== null) buckets.delete(oldestKey);
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function rateLimitOrAllow(ip: string, options?: Options): RateLimitResult {
  const capacity = options?.capacity ?? DEFAULT_CAPACITY;
  const refillPerSec = options?.refillPerSec ?? DEFAULT_REFILL_PER_SEC;

  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    evictOldestIfFull();
    bucket = { tokens: capacity, lastRefill: now };
    buckets.set(ip, bucket);
  } else {
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSec);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  // Compute how many ms until 1 token will be available.
  const deficit = 1 - bucket.tokens;
  const retryAfterMs = Math.ceil((deficit / refillPerSec) * 1000);
  return { allowed: false, retryAfterMs };
}

// Test-only — clears state between tests.
export function _resetRateLimit(): void {
  buckets.clear();
}
