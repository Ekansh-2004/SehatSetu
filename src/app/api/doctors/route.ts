import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db/services/databaseService'
import { 
  validateAndSanitize, 
  detectSqlInjection,
  logSecurityEvent 
} from '@/lib/security/input-sanitizer'
import { 
  withRateLimit, 
  RATE_LIMIT_CONFIGS,
  getClientIdentifier
} from '@/lib/security/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await withRateLimit(
      request,
      '/api/doctors',
      RATE_LIMIT_CONFIGS.api
    )
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }

    const { searchParams } = new URL(request.url)
    const rawSpecialty = searchParams.get('specialty')

    let doctors
    if (rawSpecialty) {
      const sqlCheck = detectSqlInjection(rawSpecialty)
      if (sqlCheck.isSuspicious) {
        logSecurityEvent('sql_injection', {
          ip: getClientIdentifier(request),
          endpoint: '/api/doctors',
          input: rawSpecialty,
          patterns: sqlCheck.patterns,
        })
        return NextResponse.json(
          { error: 'Invalid specialty parameter' },
          { status: 400, headers: rateLimitResult.headers }
        )
      }

      const specialty = validateAndSanitize(rawSpecialty, { 
        type: 'search', 
        maxLength: 100 
      })
      
      if (!specialty) {
        return NextResponse.json(
          { error: 'Invalid specialty parameter' },
          { status: 400, headers: rateLimitResult.headers }
        )
      }

      doctors = await DatabaseService.getDoctorsBySpecialty(specialty)
    } else {
      doctors = await DatabaseService.getDoctors()
    }

    return NextResponse.json({
      success: true,
      data: doctors
    }, { headers: rateLimitResult.headers })
  } catch (error) {
    console.error('Error fetching doctors from database:', error)
    return NextResponse.json(
      { error: 'Failed to fetch doctors from database' },
      { status: 500 }
    )
  }
} 