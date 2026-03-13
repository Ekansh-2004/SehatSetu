import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { paymentSchema } from '@/lib/validation/schemas'
import { GuestSessionManager } from '@/lib/session/guestSession'
import { STRIPE_CONFIG } from '../../../../types'

// Check if Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set in environment variables')
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_CONFIG.API_VERSION,
    })
  : null

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      )
    }

    const body = await request.json()

    // Server-side validation
    const validationResult = paymentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { 
      amount, 
      doctorId, 
      doctorName, 
      date, 
      time, 
      patientEmail,
      guestName,
      guestEmail,
      guestPhone,
      isGuest,
      reason,
      mode
    } = validationResult.data

    // Create guest session if this is a guest booking
    let guestSessionId: string | undefined
    if (isGuest && guestName && guestEmail && guestPhone) {
      guestSessionId = GuestSessionManager.createGuestSession({
        guestName,
        guestEmail,
        guestPhone,
        doctorId,
        date,
        time,
        mode
      })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Medical Consultation - ${doctorName}`,
              description: `Appointment on ${date} at ${time} - ${reason}`,
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/success?session_id={CHECKOUT_SESSION_ID}${guestSessionId ? `&guest_session_id=${guestSessionId}` : ''}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book?canceled=true`,
      metadata: {
        doctorId: doctorId.toString(),
        appointmentDate: date,
        appointmentTime: time,
        patientEmail: patientEmail || guestEmail || '',
        guestSessionId: guestSessionId || '',
        reason: reason,
        isGuest: isGuest ? 'true' : 'false',
        mode: mode || 'physical'
      },
      customer_email: patientEmail || guestEmail,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      guestSessionId
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// Verify payment success
export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      // Get guest session data if available
      let guestInfo = null
      if (session.metadata?.guestSessionId) {
        guestInfo = GuestSessionManager.getGuestSession(session.metadata.guestSessionId)
      }
      
      return NextResponse.json({
        success: true,
        appointmentDetails: {
          doctorId: session.metadata?.doctorId,
          date: session.metadata?.appointmentDate,
          time: session.metadata?.appointmentTime,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          reason: session.metadata?.reason || 'General consultation',
          isGuest: session.metadata?.isGuest === 'true',
          guestInfo: guestInfo ? {
            name: guestInfo.guestName,
            email: guestInfo.guestEmail,
            phone: guestInfo.guestPhone
          } : null,
          mode: (session.metadata?.mode as 'physical' | 'video') || 'physical'
        }
      })
    }

    return NextResponse.json({ success: false })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
} 