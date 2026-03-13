// Analytics Service Configuration
export const ANALYTICS_SERVICE_CONFIG = {
  // Base URL for the analytics service
  BASE_URL: process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:3001',
  
  TIMEOUT_MS: 20000,
  
  // API endpoints
  ENDPOINTS: {
    TRACK_SESSION: '/api/analytics/track-session',
    TRACK_TOKENS: '/api/analytics/track-tokens',
    TRACK_PDF: '/api/analytics/track-pdf',
    TRACK_DEEPGRAM: '/api/analytics/track-deepgram',
    ADMIN_ANALYTICS: '/api/admin/analytics',
    ADMIN_DOCTORS: '/api/admin/analytics/doctors'
  }
} as const;

// Helper function to get full analytics service URL
export function getAnalyticsServiceUrl(endpoint: string): string {
  return `${ANALYTICS_SERVICE_CONFIG.BASE_URL}${endpoint}`;
}


export async function callAnalyticsService(
  endpoint: string, 
  options: RequestInit = {},
  timeoutMs: number = ANALYTICS_SERVICE_CONFIG.TIMEOUT_MS
) {
  const url = getAnalyticsServiceUrl(endpoint);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Analytics service call failed: ${response.status} ${response.statusText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Analytics service call timed out after ${timeoutMs}ms for endpoint: ${endpoint}`);
    } else {
      console.error('Analytics service call error:', error);
    }
    return null;
  }
}

