import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db/services/databaseService'
import { 
  sanitizeId, 
  detectSqlInjection,
  logSecurityEvent 
} from '@/lib/security/input-sanitizer'
import { 
  withRateLimit, 
  RATE_LIMIT_CONFIGS,
  getClientIdentifier
} from '@/lib/security/rate-limiter'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await withRateLimit(
      request,
      '/api/doctors/[id]',
      RATE_LIMIT_CONFIGS.api
    )
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }

    const { id: rawId } = await params
    
    const sqlCheck = detectSqlInjection(rawId)
    if (sqlCheck.isSuspicious) {
      logSecurityEvent('sql_injection', {
        ip: getClientIdentifier(request),
        endpoint: '/api/doctors/[id]',
        input: rawId,
        patterns: sqlCheck.patterns,
      })
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400, headers: rateLimitResult.headers }
      )
    }

    const id = sanitizeId(rawId)
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid doctor ID format' },
        { status: 400, headers: rateLimitResult.headers }
      )
    }

    const doctor = await DatabaseService.getDoctorById(id)

    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404, headers: rateLimitResult.headers }
      )
    }

    return NextResponse.json({
      success: true,
      data: doctor
    }, { headers: rateLimitResult.headers })
  } catch (error) {
    console.error('Error fetching doctor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch doctor' },
      { status: 500 }
    )
  }
} 