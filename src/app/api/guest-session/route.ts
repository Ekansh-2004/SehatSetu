import { NextRequest } from 'next/server'
import { createGuestSessionHandler, getGuestSessionHandler, deleteGuestSessionHandler } from '@/lib/session/guestSession'

export async function POST(request: NextRequest) {
  return createGuestSessionHandler(request)
}

export async function GET(request: NextRequest) {
  return getGuestSessionHandler(request)
}

export async function DELETE(request: NextRequest) {
  return deleteGuestSessionHandler(request)
} 