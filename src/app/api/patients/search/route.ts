import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { 
  validateAndSanitize, 
  logSecurityEvent, 
  detectSqlInjection 
} from '@/lib/security/input-sanitizer'
import { 
  withRateLimit, 
  RATE_LIMIT_CONFIGS 
} from '@/lib/security/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitResult = await withRateLimit(
      request,
      '/api/patients/search',
      RATE_LIMIT_CONFIGS.search,
      { userId: user.id }
    )
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }

    const { searchParams } = new URL(request.url)
    const rawQuery = (searchParams.get('q') || '').trim()
    
    if (!rawQuery) {
      return NextResponse.json({ success: true, data: [] }, {
        headers: rateLimitResult.headers
      })
    }

    const sqlCheck = detectSqlInjection(rawQuery)
    if (sqlCheck.isSuspicious && sqlCheck.score >= 50) {
      logSecurityEvent('sql_injection', {
        userId: user.id,
        endpoint: '/api/patients/search',
        input: rawQuery,
        patterns: sqlCheck.patterns,
      })
      return NextResponse.json(
        { error: 'Invalid search query' },
        { status: 400, headers: rateLimitResult.headers }
      )
    }

    const q = validateAndSanitize(rawQuery, { type: 'search', maxLength: 100 })
    if (!q) {
      return NextResponse.json(
        { error: 'Invalid search query' },
        { status: 400, headers: rateLimitResult.headers }
      )
    }

    const patients = await prisma.patient.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: patients }, {
      headers: rateLimitResult.headers
    })
  } catch (error) {
    console.error('Patient search error:', error)
    return NextResponse.json({ error: 'Failed to search patients' }, { status: 500 })
  }
} 