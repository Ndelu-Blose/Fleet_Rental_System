// Simple in-memory rate limiter
// For production, consider using Redis or a dedicated rate limiting service

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

const store: RateLimitStore = {}

export interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 15 * 60 * 1000, maxRequests: 100 },
): RateLimitResult {
  const now = Date.now()
  const { windowMs, maxRequests } = options

  // Get or create entry
  let entry = store[identifier]

  // Clean up expired entries
  if (entry && entry.resetAt < now) {
    entry = undefined
    delete store[identifier]
  }

  // Create new entry if needed
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    }
    store[identifier] = entry
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  const allowed = entry.count <= maxRequests
  const remaining = Math.max(0, maxRequests - entry.count)

  // Store entry
  store[identifier] = entry

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  }
}

// Helper to get identifier from request
export function getRateLimitIdentifier(req: Request): string {
  // Try to get IP address
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  const path = new URL(req.url).pathname

  // Combine IP and path for more granular limiting
  return `${ip}:${path}`
}

// Middleware helper for API routes
export function withRateLimit(
  options: RateLimitOptions = { windowMs: 15 * 60 * 1000, maxRequests: 100 },
) {
  return async (req: Request): Promise<Response | null> => {
    const identifier = getRateLimitIdentifier(req)
    const result = rateLimit(identifier, options)

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          resetAt: new Date(result.resetAt).toISOString(),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": options.maxRequests.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.resetAt.toString(),
            "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    return null
  }
}

// Cleanup old entries periodically (run every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of Object.entries(store)) {
      if (entry.resetAt < now) {
        delete store[key]
      }
    }
  }, 5 * 60 * 1000)
}

