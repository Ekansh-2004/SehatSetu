/**
 * Security Module - Central Export
 * 
 * This module provides comprehensive security utilities including:
 * - Input sanitization and validation
 * - SQL injection detection
 * - XSS prevention
 * - Rate limiting
 * - Security headers
 */

export * from './input-sanitizer'
export * from './rate-limiter'
export * from './security-headers'

// Default export for convenience
import inputSanitizer from './input-sanitizer'
import rateLimiter from './rate-limiter'
import securityHeaders from './security-headers'

export default {
  ...inputSanitizer,
  ...rateLimiter,
  ...securityHeaders,
}

