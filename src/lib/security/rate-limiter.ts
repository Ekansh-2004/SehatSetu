/**
 * Rate Limiting Library
 * Prevents brute force attacks, API abuse, and DoS attempts
 */

interface RateLimitRecord {
  count: number
  firstRequest: number
  lastRequest: number
  blocked: boolean
  blockedUntil?: number
}

interface RateLimitConfig {
  windowMs: number          // Time window in milliseconds
  maxRequests: number       // Maximum requests per window
  blockDurationMs: number   // How long to block after limit exceeded
  skipSuccessfulRequests?: boolean
}

// In-memory store for rate limiting
// In production, use Redis or similar for distributed systems
const rateLimitStore = new Map<string, RateLimitRecord>()

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      // Remove entries older than 1 hour
      if (now - record.lastRequest > 60 * 60 * 1000) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

// Start cleanup on module load
startCleanup()

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - strict limits
  auth: {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxRequests: 5,              // 5 attempts
    blockDurationMs: 30 * 60 * 1000,  // 30 minute block
  } as RateLimitConfig,

  // OTP endpoints - very strict
  otp: {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 3,              // 3 attempts
    blockDurationMs: 15 * 60 * 1000,  // 15 minute block
  } as RateLimitConfig,

  // API endpoints - moderate limits
  api: {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 100,            // 100 requests
    blockDurationMs: 60 * 1000,  // 1 minute block
  } as RateLimitConfig,

  // Search endpoints - moderate limits
  search: {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 30,             // 30 searches
    blockDurationMs: 60 * 1000,  // 1 minute block
  } as RateLimitConfig,

  // File upload - strict limits
  upload: {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 10,             // 10 uploads
    blockDurationMs: 5 * 60 * 1000,  // 5 minute block
  } as RateLimitConfig,

  // Payment endpoints - very strict
  payment: {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 5,              // 5 attempts
    blockDurationMs: 10 * 60 * 1000,  // 10 minute block
  } as RateLimitConfig,

  // Webhook endpoints - high limits for legitimate traffic
  webhook: {
    windowMs: 60 * 1000,         // 1 minute
    maxRequests: 1000,           // 1000 requests
    blockDurationMs: 60 * 1000,  // 1 minute block
  } as RateLimitConfig,
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(
  request: Request,
  options?: { useUserId?: string }
): string {
  // Priority: userId > X-Forwarded-For > X-Real-IP > connection IP
  if (options?.useUserId) {
    return `user:${options.useUserId}`
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Get the first IP in the chain (original client)
    const ip = forwardedFor.split(',')[0].trim()
    return `ip:${ip}`
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return `ip:${realIp}`
  }

  // Fallback - in production, you should always have a real IP
  return `ip:unknown-${Date.now()}`
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
} {
  const key = `${identifier}:${endpoint}`
  const now = Date.now()

  let record = rateLimitStore.get(key)

  // Check if currently blocked
  if (record?.blocked && record.blockedUntil) {
    if (now < record.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.blockedUntil,
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000),
      }
    }
    // Block expired, reset record
    record = undefined
  }

  // Initialize or check window
  if (!record || now - record.firstRequest >= config.windowMs) {
    // New window
    record = {
      count: 1,
      firstRequest: now,
      lastRequest: now,
      blocked: false,
    }
    rateLimitStore.set(key, record)

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  // Within existing window
  record.count++
  record.lastRequest = now

  if (record.count > config.maxRequests) {
    // Block the client
    record.blocked = true
    record.blockedUntil = now + config.blockDurationMs
    rateLimitStore.set(key, record)

    console.warn(`[RATE LIMIT] Blocked: ${identifier} on ${endpoint}`, {
      count: record.count,
      window: config.windowMs,
      blockedUntil: new Date(record.blockedUntil).toISOString(),
    })

    return {
      allowed: false,
      remaining: 0,
      resetAt: record.blockedUntil,
      retryAfter: Math.ceil(config.blockDurationMs / 1000),
    }
  }

  rateLimitStore.set(key, record)

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.firstRequest + config.windowMs,
  }
}

/**
 * Rate limit middleware helper for API routes
 */
export async function withRateLimit(
  request: Request,
  endpoint: string,
  config: RateLimitConfig,
  options?: { userId?: string }
): Promise<{
  allowed: boolean
  headers: Record<string, string>
  response?: Response
}> {
  const identifier = getClientIdentifier(request, { useUserId: options?.userId })
  const result = checkRateLimit(identifier, endpoint, config)

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  }

  if (!result.allowed) {
    headers['Retry-After'] = result.retryAfter?.toString() || '60'
    
    return {
      allowed: false,
      headers,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please wait before making another request',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      ),
    }
  }

  return { allowed: true, headers }
}

/**
 * Reset rate limit for a specific identifier (e.g., after successful auth)
 */
export function resetRateLimit(identifier: string, endpoint: string): void {
  const key = `${identifier}:${endpoint}`
  rateLimitStore.delete(key)
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): {
  count: number
  remaining: number
  blocked: boolean
  blockedUntil?: number
} {
  const key = `${identifier}:${endpoint}`
  const record = rateLimitStore.get(key)
  const now = Date.now()

  if (!record) {
    return {
      count: 0,
      remaining: config.maxRequests,
      blocked: false,
    }
  }

  // Check if window expired
  if (now - record.firstRequest >= config.windowMs) {
    return {
      count: 0,
      remaining: config.maxRequests,
      blocked: false,
    }
  }

  // Check if block expired
  if (record.blocked && record.blockedUntil && now >= record.blockedUntil) {
    return {
      count: 0,
      remaining: config.maxRequests,
      blocked: false,
    }
  }

  return {
    count: record.count,
    remaining: Math.max(0, config.maxRequests - record.count),
    blocked: record.blocked,
    blockedUntil: record.blockedUntil,
  }
}

export default {
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  checkRateLimit,
  withRateLimit,
  resetRateLimit,
  getRateLimitStatus,
}

