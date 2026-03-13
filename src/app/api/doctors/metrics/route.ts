import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { PrismaService } from '@/lib/db/prismaService'

export async function GET() {
  // Verify user authentication
  const user = await currentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized access' },
      { status: 401 }
    )
  }

  try {
    // Get doctor by clerk user ID
    const doctor = await PrismaService.getDoctorByClerkUserId(user.id)
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    // Get total appointments for this doctor
    const totalAppointments = await PrismaService.getAppointments({
      doctorId: doctor.id
    })

    // Get today's appointments
    const today = new Date()
    const todayAppointments = await PrismaService.getAppointments({
      doctorId: doctor.id,
      date: today
    })

    // Get last month's appointments count for comparison
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
    const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
    
    const lastMonthAppointments = await PrismaService.getAppointmentsByDateRange(
      lastMonthStart,
      lastMonthEnd,
      doctor.id
    )

    // Get current month's appointments for comparison
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const currentMonthAppointments = await PrismaService.getAppointmentsByDateRange(
      currentMonthStart,
      today,
      doctor.id
    )

    // Calculate metrics
    const totalCount = totalAppointments.length
    const todayCount = todayAppointments.length
    const lastMonthCount = lastMonthAppointments.length
    const currentMonthCount = currentMonthAppointments.length
    const monthlyGrowth = currentMonthCount - lastMonthCount

    // Calculate revenue (assuming consultationFee per appointment)
    const totalRevenue = totalAppointments.reduce((acc, apt) => acc + apt.paymentAmount, 0)
    const lastMonthRevenue = lastMonthAppointments.reduce((acc, apt) => acc + apt.paymentAmount, 0)
    const currentMonthRevenue = currentMonthAppointments.reduce((acc, apt) => acc + apt.paymentAmount, 0)
    const revenueGrowth = currentMonthRevenue - lastMonthRevenue

    return NextResponse.json({
      success: true,
      data: {
        totalAppointments: {
          count: totalCount,
          growth: monthlyGrowth,
          growthText: monthlyGrowth >= 0 ? `+${monthlyGrowth} from last month` : `${monthlyGrowth} from last month`
        },
        todaySchedule: {
          count: todayCount,
          text: `appointments today`
        },
        revenue: {
          total: totalRevenue,
          growth: revenueGrowth,
          growthText: revenueGrowth >= 0 ? `+$${revenueGrowth} from last month` : `-$${Math.abs(revenueGrowth)} from last month`
        },
        patients: {
          // Get unique patients from appointments
          total: new Set(totalAppointments.filter(apt => apt.patientId).map(apt => apt.patientId)).size,
          newThisMonth: new Set(currentMonthAppointments.filter(apt => apt.patientId).map(apt => apt.patientId)).size
        }
      }
    })

  } catch (error) {
    console.error('❌ Error fetching dashboard metrics:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard metrics',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 