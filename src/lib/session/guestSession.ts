import { NextRequest, NextResponse } from 'next/server'

interface GuestSession {
  id: string
  guestName: string
  guestEmail: string
  guestPhone: string
  doctorId: string
  date: string
  time: string
  mode?: 'physical' | 'video'
  createdAt: Date
  expiresAt: Date
}

// In-memory store for guest sessions (in production, use Redis)
const guestSessions = new Map<string, GuestSession>()

export class GuestSessionManager {
  private static generateSessionId(): string {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static createGuestSession(data: {
    guestName: string
    guestEmail: string
    guestPhone: string
    doctorId: string
    date: string
    time: string
    mode?: 'physical' | 'video'
  }): string {
    const sessionId = this.generateSessionId()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes

    const session: GuestSession = {
      id: sessionId,
      ...data,
      createdAt: now,
      expiresAt
    }

    guestSessions.set(sessionId, session)
    return sessionId
  }

  static getGuestSession(sessionId: string): GuestSession | null {
    const session = guestSessions.get(sessionId)
    
    if (!session) {
      return null
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      guestSessions.delete(sessionId)
      return null
    }

    return session
  }

  static deleteGuestSession(sessionId: string): boolean {
    return guestSessions.delete(sessionId)
  }

  static cleanupExpiredSessions(): void {
    const now = new Date()
    for (const [sessionId, session] of guestSessions.entries()) {
      if (now > session.expiresAt) {
        guestSessions.delete(sessionId)
      }
    }
  }

  // Clean up expired sessions every 5 minutes
  static startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions()
    }, 5 * 60 * 1000)
  }
}

// Start cleanup interval when module is loaded
GuestSessionManager.startCleanupInterval()

export async function createGuestSessionHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestName, guestEmail, guestPhone, doctorId, date, time, mode } = body

    // Validate required fields
    if (!guestName || !guestEmail || !guestPhone || !doctorId || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const sessionId = GuestSessionManager.createGuestSession({
      guestName,
      guestEmail,
      guestPhone,
      doctorId,
      date,
      time,
      mode
    })

    return NextResponse.json({
      success: true,
      sessionId
    })
  } catch (error) {
    console.error('Error creating guest session:', error)
    return NextResponse.json(
      { error: 'Failed to create guest session' },
      { status: 500 }
    )
  }
}

export async function getGuestSessionHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const session = GuestSessionManager.getGuestSession(sessionId)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('Error getting guest session:', error)
    return NextResponse.json(
      { error: 'Failed to get guest session' },
      { status: 500 }
    )
  }
}

export async function deleteGuestSessionHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const deleted = GuestSessionManager.deleteGuestSession(sessionId)

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Session deleted successfully' : 'Session not found'
    })
  } catch (error) {
    console.error('Error deleting guest session:', error)
    return NextResponse.json(
      { error: 'Failed to delete guest session' },
      { status: 500 }
    )
  }
} 