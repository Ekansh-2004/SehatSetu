/**
 * Security Headers Configuration
 * Provides protection against XSS, clickjacking, and other attacks
 */

import { NextResponse } from 'next/server'

/**
 * Security headers to apply to all responses
 */
export const SECURITY_HEADERS: Record<string, string> = {
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy (formerly feature policy)
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
  
  // HSTS - force HTTPS (only in production)
  // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

/**
 * Content Security Policy for production
 * Restricts sources for scripts, styles, etc.
 */
export const CSP_HEADER = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://*.clerk.accounts.dev",
    "frame-src 'self' https://js.stripe.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
}

/**
 * CORS configuration for API routes
 */
export const CORS_CONFIG = {
  // Allowed origins - update with your domains
  allowedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    // Add additional allowed origins here
  ],
  
  // Allowed methods
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  
  // Exposed headers
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  
  // Max age for preflight cache (1 hour)
  maxAge: 3600,
  
  // Allow credentials
  credentials: true,
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Apply CSP in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', CSP_HEADER['Content-Security-Policy'])
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  return response
}

/**
 * Get CORS headers for a specific origin
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin is allowed
  const isAllowed = !origin || CORS_CONFIG.allowedOrigins.includes(origin) || 
    CORS_CONFIG.allowedOrigins.includes('*')
  
  if (!isAllowed) {
    return {}
  }
  
  return {
    'Access-Control-Allow-Origin': origin || CORS_CONFIG.allowedOrigins[0],
    'Access-Control-Allow-Methods': CORS_CONFIG.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': CORS_CONFIG.allowedHeaders.join(', '),
    'Access-Control-Expose-Headers': CORS_CONFIG.exposedHeaders.join(', '),
    'Access-Control-Max-Age': CORS_CONFIG.maxAge.toString(),
    'Access-Control-Allow-Credentials': CORS_CONFIG.credentials.toString(),
  }
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(request: Request): Response | null {
  const origin = request.headers.get('origin')
  
  if (request.method !== 'OPTIONS') {
    return null
  }
  
  const corsHeaders = getCorsHeaders(origin)
  
  if (Object.keys(corsHeaders).length === 0) {
    return new Response('Forbidden', { status: 403 })
  }
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

/**
 * Create a secure API response with all headers
 */
export function createSecureResponse(
  body: unknown,
  options: {
    status?: number
    origin?: string | null
    additionalHeaders?: Record<string, string>
  } = {}
): Response {
  const { status = 200, origin = null, additionalHeaders = {} } = options
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...SECURITY_HEADERS,
    ...getCorsHeaders(origin),
    ...additionalHeaders,
  }
  
  return new Response(JSON.stringify(body), {
    status,
    headers,
  })
}

export default {
  SECURITY_HEADERS,
  CSP_HEADER,
  CORS_CONFIG,
  applySecurityHeaders,
  getCorsHeaders,
  handleCorsPreflightRequest,
  createSecureResponse,
}

