/**
 * Input Sanitization & Validation Library
 * Prevents SQL Injection, XSS, and other injection attacks
 * 
 * IMPORTANT: While Prisma uses parameterized queries which protect against SQL injection,
 * this library provides additional defense-in-depth measures.
 */

import * as z from 'zod'

// ============================================================================
// SQL INJECTION PROTECTION
// ============================================================================


/**
 * SQL injection patterns - carefully tuned to avoid false positives
 * 
 * These patterns detect ATTACK patterns, not just keywords.
 * For example, "SELECT" alone in medical notes like "select a treatment" is OK,
 * but "' OR 1=1 --" is blocked.
 */
const SQL_INJECTION_PATTERNS = [
  // Classic injection: quote followed by OR/AND with comparison
  /['"`]\s*(OR|AND)\s+['"`\d]/i,
  /['"`]\s*(OR|AND)\s+\w+\s*[=<>]/i,
  
  // Union-based injection (UNION followed by SELECT)
  /\bUNION\s+(ALL\s+)?SELECT\b/i,
  
  // Comment injection after quote (common attack pattern)
  /['"`]\s*(--|#|\/\*)/,
  
  // Stacked queries with dangerous commands
  /;\s*(DROP|DELETE|TRUNCATE|ALTER|UPDATE|INSERT)\s/i,
  
  // Time-based blind injection
  /\b(SLEEP|BENCHMARK|WAITFOR\s+DELAY)\s*\(/i,
  
  // File operations (MySQL specific)
  /\b(LOAD_FILE|INTO\s+(OUT|DUMP)FILE)\s*\(/i,
  
  // Boolean-based blind: 1=1 or 'a'='a' patterns
  /\bOR\s+1\s*=\s*1\b/i,
  /\bOR\s+'[^']*'\s*=\s*'[^']*'/i,
  /\bAND\s+1\s*=\s*1\b/i,
  
  // Common tautology patterns
  /'\s*OR\s*'[^']*'\s*=\s*'/i,
  /"\s*OR\s*"[^"]*"\s*=\s*"/i,
  
  // EXEC/EXECUTE with parentheses (stored procedure injection)
  /\bEXEC(UTE)?\s*\(/i,
  
  // Information schema access (reconnaissance)
  /\bINFORMATION_SCHEMA\./i,
  
  // Hex encoding bypass attempts
  /0x[0-9a-f]{4,}/i,
]

/**
 * XSS attack patterns to detect
 * Note: data: URLs are allowed for legitimate use (e.g., small images)
 * Only block data: in dangerous contexts
 */
const XSS_PATTERNS = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  
  // JavaScript protocol
  /javascript\s*:/gi,
  
  // Event handlers (onclick, onerror, etc.)
  /\bon\w+\s*=/gi,
  
  // Dangerous HTML tags
  /<iframe\b/gi,
  /<object\b/gi,
  /<embed\b/gi,
  
  // Only block link/meta with dangerous attributes
  /<link\b[^>]*\bhref\s*=\s*["']?\s*javascript/gi,
  /<meta\b[^>]*\bhttp-equiv\s*=\s*["']?\s*refresh/gi,
  
  // VBScript (legacy IE attack)
  /vbscript\s*:/gi,
  
  // CSS expression (legacy IE)
  /expression\s*\(/gi,
  
  // SVG with script
  /<svg\b[^>]*\bonload\s*=/gi,
]

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/ ,
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.\.%2f/gi,
  /%2e%2e%5c/gi,
]

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if a string contains SQL injection patterns
 */
export function detectSqlInjection(input: string): {
  isSuspicious: boolean
  patterns: string[]
  score: number
} {
  if (!input || typeof input !== 'string') {
    return { isSuspicious: false, patterns: [], score: 0 }
  }

  const detectedPatterns: string[] = []
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source)
    }
  }

  // Calculate risk score (0-100)
  const score = Math.min(100, detectedPatterns.length * 25)

  return {
    isSuspicious: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    score
  }
}

/**
 * Check if a string contains XSS patterns
 */
export function detectXss(input: string): {
  isSuspicious: boolean
  patterns: string[]
} {
  if (!input || typeof input !== 'string') {
    return { isSuspicious: false, patterns: [] }
  }

  const detectedPatterns: string[] = []
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source)
    }
  }

  return {
    isSuspicious: detectedPatterns.length > 0,
    patterns: detectedPatterns
  }
}

/**
 * Check if a string contains path traversal patterns
 */
export function detectPathTraversal(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }

  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input))
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize string input by escaping dangerous characters
 * Note: This is for display purposes. Prisma handles SQL sanitization.
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
}

/**
 * Sanitize filename to prevent path traversal and injection
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file'
  }

  return filename
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove dangerous characters
    .replace(/[<>:"|?*]/g, '')
    // Limit to alphanumeric, dash, underscore, and dot
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Prevent hidden files
    .replace(/^\.+/, '')
    // Limit length
    .substring(0, 255)
}

/**
 * Sanitize ID fields (UUIDs, CUIDs, etc.)
 * Only allows alphanumeric characters and hyphens/underscores
 */
export function sanitizeId(id: string): string | null {
  if (!id || typeof id !== 'string') {
    return null
  }

  // Remove any non-alphanumeric characters except hyphen and underscore
  const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '')
  
  // Check reasonable length (CUIDs are typically 25 chars, UUIDs are 36)
  if (sanitized.length < 1 || sanitized.length > 50) {
    return null
  }

  return sanitized
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Safe string schema - validates and rejects suspicious input
 */
export const safeStringSchema = z.string().refine(
  (val) => {
    const sqlCheck = detectSqlInjection(val)
    const xssCheck = detectXss(val)
    return !sqlCheck.isSuspicious && !xssCheck.isSuspicious
  },
  { message: 'Input contains potentially dangerous characters' }
)

/**
 * Safe ID schema - validates ID format
 */
export const safeIdSchema = z.string()
  .min(1, 'ID is required')
  .max(50, 'ID is too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')

/**
 * Safe email schema
 */
export const safeEmailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email is too long')
  .refine(
    (val) => !detectSqlInjection(val).isSuspicious,
    { message: 'Invalid email format' }
  )

/**
 * Safe phone schema
 */
export const safePhoneSchema = z.string()
  .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Invalid phone format')
  .min(10, 'Phone number too short')
  .max(20, 'Phone number too long')

/**
 * Safe search query schema - allows searching but blocks injection
 */
export const safeSearchSchema = z.string()
  .max(200, 'Search query too long')
  .transform((val) => {
    // Remove special SQL characters while keeping search-friendly chars
    return val
      .replace(/[;'"\\]/g, '')
      .replace(/--/g, '')
      .trim()
  })

/**
 * Safe filename schema
 */
export const safeFilenameSchema = z.string()
  .min(1, 'Filename is required')
  .max(255, 'Filename is too long')
  .refine(
    (val) => !detectPathTraversal(val),
    { message: 'Invalid filename' }
  )
  .transform(sanitizeFilename)

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and sanitize user input for database queries
 * Returns null if input is suspicious, sanitized value otherwise
 */
export function validateAndSanitize(
  input: string,
  options: {
    maxLength?: number
    allowNumbers?: boolean
    allowEmail?: boolean
    type?: 'string' | 'id' | 'email' | 'phone' | 'search' | 'filename'
  } = {}
): string | null {
  const { maxLength = 1000, type = 'string' } = options

  if (!input || typeof input !== 'string') {
    return null
  }

  if (input.length > maxLength) {
    return null
  }

  // Check for SQL injection
  const sqlCheck = detectSqlInjection(input)
  if (sqlCheck.isSuspicious && sqlCheck.score >= 50) {
    console.warn(`[SECURITY] SQL injection attempt detected: ${sqlCheck.patterns.join(', ')}`)
    return null
  }

  // Check for XSS
  const xssCheck = detectXss(input)
  if (xssCheck.isSuspicious) {
    console.warn(`[SECURITY] XSS attempt detected: ${xssCheck.patterns.join(', ')}`)
    return null
  }

  // Type-specific validation
  switch (type) {
    case 'id':
      return sanitizeId(input)
    case 'email':
      const emailResult = safeEmailSchema.safeParse(input)
      return emailResult.success ? input.toLowerCase().trim() : null
    case 'phone':
      const phoneResult = safePhoneSchema.safeParse(input)
      return phoneResult.success ? input.replace(/\s/g, '') : null
    case 'search':
      const searchResult = safeSearchSchema.safeParse(input)
      return searchResult.success ? searchResult.data : null
    case 'filename':
      return sanitizeFilename(input)
    default:
      return sanitizeString(input)
  }
}

/**
 * Validate request parameters
 */
export function validateRequestParams<T extends z.ZodSchema>(
  params: unknown,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    const result = schema.safeParse(params)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { 
      success: false, 
      error: result.error.errors.map(e => e.message).join(', ') 
    }
  } catch {
    return { success: false, error: 'Invalid input parameters' }
  }
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  eventType: 'sql_injection' | 'xss' | 'path_traversal' | 'auth_failure' | 'rate_limit',
  details: {
    ip?: string
    userId?: string
    endpoint?: string
    input?: string
    patterns?: string[]
  }
): void {
  const sanitizedInput = details.input 
    ? details.input.substring(0, 100).replace(/[^\x20-\x7E]/g, '')
    : undefined

  console.error(`[SECURITY ALERT] ${eventType.toUpperCase()}`, {
    timestamp: new Date().toISOString(),
    eventType,
    ip: details.ip || 'unknown',
    userId: details.userId || 'anonymous',
    endpoint: details.endpoint,
    input: sanitizedInput,
    patterns: details.patterns,
  })

  // In production, you would send this to a security monitoring service
  // Example: await sendToSecurityMonitor({ eventType, details })
}

export default {
  detectSqlInjection,
  detectXss,
  detectPathTraversal,
  sanitizeString,
  sanitizeFilename,
  sanitizeId,
  validateAndSanitize,
  validateRequestParams,
  logSecurityEvent,
  schemas: {
    safeStringSchema,
    safeIdSchema,
    safeEmailSchema,
    safePhoneSchema,
    safeSearchSchema,
    safeFilenameSchema,
  }
}

