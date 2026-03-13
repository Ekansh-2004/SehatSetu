import { NextRequest, NextResponse } from 'next/server';
import { searchMuscleInQdrant, searchMultipleMuscles } from '@/lib/muscle-search';

export async function POST(request: NextRequest) {
  try {
    const { terms } = await request.json();
    
    if (!terms) {
      return NextResponse.json(
        { error: 'No terms provided' },
        { status: 400 }
      );
    }
    
    // If single term, search for it
    if (typeof terms === 'string') {
      const result = await searchMuscleInQdrant(terms);
      return NextResponse.json(result);
    }
    
    // If array of terms, search for all
    if (Array.isArray(terms)) {
      const result = await searchMultipleMuscles(terms);
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid terms format. Expected string or array.' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Muscle search API error:', error);
    return NextResponse.json(
      { 
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 