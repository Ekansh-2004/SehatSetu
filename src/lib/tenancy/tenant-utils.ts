import { NextRequest } from 'next/server'
import { TenantConfigService, TenantConfig } from './tenant-config'

export class TenantUtils {
  /**
   * Extract tenant ID from request headers or query parameters
   */
  static getTenantIdFromRequest(request: NextRequest): string | null {
    // Try to get from headers first
    const tenantId = request.headers.get('x-tenant-id') || 
                    request.headers.get('tenant-id') ||
                    request.nextUrl.searchParams.get('tenantId')

    return tenantId
  }

  /**
   * Extract tenant ID from domain
   */
  static getTenantIdFromDomain(domain: string): string | null {
    // Remove protocol and www
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '')
    
    // Try to match domain to tenant configuration
    const tenantConfig = TenantConfigService.getTenantConfigByDomain(cleanDomain)
    return tenantConfig?.id || null
  }

  /**
   * Get tenant ID from request with fallback to domain
   */
  static async getTenantId(request: NextRequest): Promise<string | null> {
    // First try to get from request headers/params
    const tenantId = this.getTenantIdFromRequest(request)
    if (tenantId) {
      return tenantId
    }

    // Fallback to domain-based tenant detection
    const host = request.headers.get('host')
    if (host) {
      return this.getTenantIdFromDomain(host)
    }

    return null
  }

  /**
   * Validate tenant access for a user
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static validateTenantAccess(tenantId: string, _userId: string): boolean {
    // In a real implementation, you would check if the user has access to this tenant
    // This could involve checking user-tenant relationships in the database
    const tenantConfig = TenantConfigService.getTenantConfig(tenantId)
    return !!tenantConfig
  }

  /**
   * Get tenant configuration from request
   */
  static async getTenantConfigFromRequest(request: NextRequest) {
    const tenantId = await this.getTenantId(request)
    if (!tenantId) {
      return null
    }

    return TenantConfigService.getTenantConfig(tenantId)
  }

  /**
   * Check if tenant has specific feature enabled
   */
  static async hasFeature(request: NextRequest, feature: keyof TenantConfig['features']): Promise<boolean> {
    const tenantId = await this.getTenantId(request)
    if (!tenantId) {
      return false
    }

    return TenantConfigService.hasFeature(tenantId, feature)
  }
} 