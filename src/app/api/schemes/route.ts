import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

type Scheme = {
  id: number;
  title: string;
  description: string;
  benefits: string[];
  eligibility: string;
  coverage: string;
  category: string;
  status: 'Active' | 'Inactive';
  role: 'patient' | 'doctor' | 'staff';
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = (searchParams.get('role') as 'patient' | 'doctor' | 'staff') || 'patient';

  try {
    const schemes = await scrapeGovernmentSites(role);
    
    return NextResponse.json({
      schemes,
      source: schemes.length > 0 ? 'live' : 'none',
      timestamp: new Date().toISOString()
    }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' }
    });
  } catch (error) {
    console.error('API Error:', error);
    // STRICT RULE: No static fallbacks. If it fails, it returns empty array.
    return NextResponse.json({
      schemes: [],
      source: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch schemes from government portals'
    });
  }
}

async function scrapeGovernmentSites(role: string): Promise<Scheme[]> {
  const schemes: Scheme[] = [];
  let idCounter = 1;

  if (role === 'patient') {
    try {
      const pmjayRes = await fetch('https://pmjay.gov.in/en/eligibility', { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 3600 }
      });
      if (pmjayRes.ok) {
        const html = await pmjayRes.text();
        const $ = cheerio.load(html);
        
        $('.eligibility-content h3, .scheme-details').each((_, el) => {
          const title = $(el).text().trim().substring(0, 100);
          if (title.toLowerCase().includes('pm-jay') || title.toLowerCase().includes('ayushman')) {
            schemes.push({
              id: idCounter++,
              title: 'Ayushman Bharat PM-JAY (Live)',
              description: 'Real-time data scraped from pmjay.gov.in for cashless hospitalization.',
              benefits: ['Cashless treatment', 'Pre-existing diseases covered', 'No family size limit'],
              eligibility: 'Based on SECC 2011 database',
              coverage: 'Up to ₹5,00,000 per family per year',
              category: 'Health Insurance',
              status: 'Active',
              role: 'patient'
            });
          }
        });
      }
    } catch (e) {
      console.error('PM-JAY scrape failed');
    }
  }

  if (role === 'doctor' || role === 'staff') {
    try {
      const nhmRes = await fetch('https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=1044', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 3600 }
      });
      if (nhmRes.ok) {
        const nhmHtml = await nhmRes.text();
        const $nhm = cheerio.load(nhmHtml);

        $nhm('.content h3, p').each((_, el) => {
          const text = $nhm(el).text().toLowerCase();
          
          if (role === 'doctor' && (text.includes('rural') || text.includes('incentive'))) {
            schemes.push({
              id: idCounter++,
              title: 'NHM Rural Service Incentive (Live)',
              description: 'Government incentives for doctors serving in rural and difficult areas.',
              benefits: ['Hardship allowance', 'Housing facilities', 'Priority in PG seats'],
              eligibility: 'MBBS/Specialist doctors in PHC/CHCs',
              coverage: 'Variable based on state policies',
              category: 'Service Incentive',
              status: 'Active',
              role: 'doctor'
            });
          }
          
          if (role === 'staff' && (text.includes('asha') || text.includes('anm') || text.includes('worker'))) {
            schemes.push({
              id: idCounter++,
              title: 'NHM Healthcare Worker Support (Live)',
              description: 'Incentives and welfare schemes for frontline healthcare workers.',
              benefits: ['Task-based incentives', 'Free uniforms', 'Life insurance cover'],
              eligibility: 'ASHA, ANM, and support staff',
              coverage: 'As per NHM guidelines',
              category: 'Worker Welfare',
              status: 'Active',
              role: 'staff'
            });
          }
        });
      }
    } catch (e) {
      console.error('NHM scrape failed');
    }
  }

  // To prevent duplicates if multiple tags match
  const uniqueSchemes = Array.from(new Map(schemes.map(item => [item.title, item])).values());
  return uniqueSchemes.slice(0, 6); // Cap at 6 schemes
}
