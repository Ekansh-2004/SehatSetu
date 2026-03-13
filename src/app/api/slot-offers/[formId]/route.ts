import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { formId } = await params;

    // Fetch all slot offers for this form
    const slotOffers = await prisma.slotOffer.findMany({
      where: {
        patientFormId: formId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: slotOffers,
    });
  } catch (error) {
    console.error('Error fetching slot offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slot offers' },
      { status: 500 }
    );
  }
}

