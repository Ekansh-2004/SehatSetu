import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const isProtectedRoute = (req: NextRequest) => {
  const url = req.nextUrl.pathname
  // Protect doctor, patient, and staff dashboard routes
  return url.startsWith('/doctor/dashboard') || 
         url.startsWith('/patient/dashboard') || 
         url.startsWith('/staff/dashboard')
}

const isPatientRoute = (req: NextRequest) => {
  const url = req.nextUrl.pathname
  // Patient-only routes
  return url.startsWith('/patient/') || url.startsWith('/book')
}

const isDoctorRoute = (req: NextRequest) => {
  const url = req.nextUrl.pathname
  // Doctor-only routes
  return url.startsWith('/doctor/')
}

export default clerkMiddleware(async (auth, req) => {
  // Allow WhatsApp webhook and patient-requests API without authentication
  // (called externally by the Twilio+AI backend)
  if (
    req.nextUrl.pathname.startsWith('/api/whatsapp-webhook') ||
    req.nextUrl.pathname.startsWith('/api/patient-requests')
  ) {
    return NextResponse.next()
  }
  
  // Check for patient session cookie
  const patientSession = req.cookies.get('patient_session')
  const hasPatientSession = !!patientSession
  
  // If patient is logged in and tries to access doctor/staff routes, redirect to patient dashboard
  if (hasPatientSession && (isDoctorRoute(req) || req.nextUrl.pathname.startsWith('/staff/'))) {
    console.log('Patient trying to access doctor/staff route, redirecting to patient dashboard')
    return NextResponse.redirect(new URL('/patient/dashboard', req.url))
  }
  
  // Protect doctor/staff dashboard routes with Clerk authentication
  if (isProtectedRoute(req)) {
    const { userId } = await auth()
    
    // If no Clerk user and no patient session, redirect to appropriate login
    if (!userId && !hasPatientSession) {
      // Determine which login page based on the route
      if (req.nextUrl.pathname.startsWith('/doctor/')) {
        return NextResponse.redirect(new URL('/doctor/sign-in', req.url))
      } else if (req.nextUrl.pathname.startsWith('/staff/')) {
        return NextResponse.redirect(new URL('/staff/sign-in', req.url))
      } else if (req.nextUrl.pathname.startsWith('/patient/')) {
        return NextResponse.redirect(new URL('/patient/sign-in', req.url))
      }
      
      // Default: protect with Clerk
      await auth.protect()
    }
  }
  
  // Allow everything else to proceed normally
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
} 