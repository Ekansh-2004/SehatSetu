import { NextRequest, NextResponse } from "next/server";

type Role = "patient" | "doctor" | "staff";
type Language = "en-IN" | "hi-IN" | "mr-IN" | "ta-IN" | "te-IN";

type Scheme = {
  id: number;
  title: string;
  description: string;
  benefits: string[];
  eligibility: string;
  coverage: string;
  category: string;
  status: "Active" | "Inactive";
  role: Role;
};

type NavigatorScheme = Scheme & {
  score: number;
  localizedSummary: string;
  narrationText: string;
  googleQuery: string;
  matchReasons: string[];
};

const FALLBACK_SCHEMES: Record<Role, Scheme[]> = {
  patient: [
    {
      id: 1001,
      title: "Ayushman Bharat PM-JAY",
      description: "Cashless secondary and tertiary care for eligible families through empanelled hospitals.",
      benefits: ["Cashless treatment", "Pre-existing disease coverage", "Portable across India"],
      eligibility: "SECC listed vulnerable families and approved beneficiary groups",
      coverage: "Up to Rs 5,00,000 per family per year",
      category: "Health Insurance",
      status: "Active",
      role: "patient",
    },
    {
      id: 1002,
      title: "Pradhan Mantri Bhartiya Janaushadhi Pariyojana",
      description: "Affordable generic medicines through Jan Aushadhi Kendras.",
      benefits: ["Lower medicine cost", "Wide drug availability", "Quality tested generics"],
      eligibility: "Open to all citizens purchasing from Jan Aushadhi stores",
      coverage: "Medicine savings often between 50% to 90%",
      category: "Medicine Support",
      status: "Active",
      role: "patient",
    },
    {
      id: 1003,
      title: "National TB Elimination Programme Support",
      description: "Free TB diagnosis and treatment support under public health facilities.",
      benefits: ["Free diagnosis", "Free drug regimen", "Treatment adherence support"],
      eligibility: "Patients diagnosed with TB through government-recognized channels",
      coverage: "Diagnosis and full treatment course support",
      category: "Public Health",
      status: "Active",
      role: "patient",
    },
  ],
  doctor: [
    {
      id: 2001,
      title: "NHM Rural Service Incentive",
      description: "Incentive support for doctors serving in rural and difficult areas.",
      benefits: ["Hard area allowance", "Career preference support", "Housing support in select regions"],
      eligibility: "Doctors posted in notified rural/remote public facilities",
      coverage: "Varies by state NHM policy",
      category: "Service Incentive",
      status: "Active",
      role: "doctor",
    },
    {
      id: 2002,
      title: "Telemedicine eSanjeevani Participation",
      description: "Support for doctors delivering teleconsultations in public platforms.",
      benefits: ["Digital consultations", "Wider patient reach", "OPD load balancing"],
      eligibility: "Registered doctors participating via approved state channels",
      coverage: "As per implementing state/department policy",
      category: "Digital Health",
      status: "Active",
      role: "doctor",
    },
    {
      id: 2003,
      title: "Continuing Medical Education Assistance",
      description: "Selected public programs provide skill upgradation pathways for doctors.",
      benefits: ["Capacity building", "Updated clinical protocols", "Program-linked certifications"],
      eligibility: "Doctors nominated by public institutions and schemes",
      coverage: "Program specific",
      category: "Professional Development",
      status: "Active",
      role: "doctor",
    },
  ],
  staff: [
    {
      id: 3001,
      title: "ASHA Incentive Support",
      description: "Task-based incentives for ASHA workers under NHM-linked activities.",
      benefits: ["Performance-linked payout", "Maternal-child health task incentives", "Field support"],
      eligibility: "ASHA workers enrolled through state health mission",
      coverage: "Task-wise approved incentive rates",
      category: "Worker Welfare",
      status: "Active",
      role: "staff",
    },
    {
      id: 3002,
      title: "ANM and Frontline Worker Capacity Support",
      description: "Skill and service quality programs for ANM and frontline healthcare workers.",
      benefits: ["Skill training", "Protocol refreshers", "Service quality improvement"],
      eligibility: "ANM and frontline workers in public health programs",
      coverage: "Program specific",
      category: "Training",
      status: "Active",
      role: "staff",
    },
    {
      id: 3003,
      title: "Frontline Health Worker Insurance and Welfare",
      description: "Insurance and welfare support in eligible risk and duty categories.",
      benefits: ["Insurance cover", "Risk protection", "Family support provisions"],
      eligibility: "Eligible frontline workers as per active government notifications",
      coverage: "Notification based",
      category: "Worker Protection",
      status: "Active",
      role: "staff",
    },
  ],
};

const INTENT_TERMS: Array<{ intent: string; terms: string[] }> = [
  {
    intent: "budget",
    terms: [
      "budget",
      "cheap",
      "low cost",
      "less money",
      "free",
      "affordable",
      "cost",
      "financial",
      "बजट",
      "सस्ता",
      "कम पैसा",
      "स्वस्त",
      "குறைந்த செலவு",
      "బడ్జెట్",
    ],
  },
  {
    intent: "insurance",
    terms: ["insurance", "cover", "coverage", "cashless", "बीमा", "विमा", "காப்பீடு", "బీమా"],
  },
  {
    intent: "medicine",
    terms: ["medicine", "drug", "pharmacy", "दवा", "औषध", "மருந்து", "ఔషధం"],
  },
  {
    intent: "worker",
    terms: ["asha", "anm", "staff", "worker", "healthcare worker", "कर्मचारी", "worker welfare"],
  },
  {
    intent: "doctor",
    terms: ["doctor", "physician", "mbbs", "specialist", "डॉक्टर", "वैद्य"],
  },
  {
    intent: "rural",
    terms: ["rural", "remote", "village", "ग्रामीण", "गांव", "ग्राम", "ஊரக", "గ్రామీణ"],
  },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function localizeReason(language: Language, intent: string): string {
  const map: Record<Language, Record<string, string>> = {
    "en-IN": {
      budget: "matched your budget/cost query",
      insurance: "matched insurance/coverage need",
      medicine: "matched medicine support need",
      worker: "matched worker/staff support need",
      doctor: "matched doctor support intent",
      rural: "matched rural service intent",
    },
    "hi-IN": {
      budget: "आपके बजट/लागत सवाल से मेल",
      insurance: "बीमा/कवरेज जरूरत से मेल",
      medicine: "दवा सहायता जरूरत से मेल",
      worker: "स्टाफ/वर्कर सहायता से मेल",
      doctor: "डॉक्टर सहायता इरादे से मेल",
      rural: "ग्रामीण सेवा इरादे से मेल",
    },
    "mr-IN": {
      budget: "तुमच्या बजेट/खर्च प्रश्नाशी जुळते",
      insurance: "विमा/कव्हरेज गरजेशी जुळते",
      medicine: "औषध सहाय्य गरजेशी जुळते",
      worker: "कर्मचारी सहाय्य गरजेशी जुळते",
      doctor: "डॉक्टर सहाय्य उद्देशाशी जुळते",
      rural: "ग्रामीण सेवेशी जुळते",
    },
    "ta-IN": {
      budget: "பட்ஜெட்/செலவு கேள்விக்கு பொருந்தியது",
      insurance: "காப்பீடு/கவரேஜ் தேவைக்கு பொருந்தியது",
      medicine: "மருந்து உதவி தேவைக்கு பொருந்தியது",
      worker: "பணியாளர் உதவிக்கு பொருந்தியது",
      doctor: "மருத்துவர் ஆதரவு நோக்கத்துடன் பொருந்தியது",
      rural: "ஊரக சேவை தேவைக்கு பொருந்தியது",
    },
    "te-IN": {
      budget: "బడ్జెట్/ఖర్చు ప్రశ్నకు సరిపోయింది",
      insurance: "బీమా/కవరేజ్ అవసరానికి సరిపోయింది",
      medicine: "ఔషధ సహాయ అవసరానికి సరిపోయింది",
      worker: "సిబ్బంది సహాయానికి సరిపోయింది",
      doctor: "డాక్టర్ సహాయ ఉద్దేశానికి సరిపోయింది",
      rural: "గ్రామీణ సేవ అవసరానికి సరిపోయింది",
    },
  };

  return map[language][intent] || map[language].budget;
}

function makeSummary(language: Language, scheme: Scheme, reasons: string[]): string {
  const reasonText = reasons.length > 0 ? reasons.join(", ") : "general relevance";

  if (language === "hi-IN") {
    return `${scheme.title} आपके प्रश्न के लिए उपयुक्त है (${reasonText})। प्रमुख लाभ: ${scheme.benefits.slice(0, 2).join(", ")}।`;
  }
  if (language === "mr-IN") {
    return `${scheme.title} तुमच्या प्रश्नासाठी उपयुक्त आहे (${reasonText}). मुख्य लाभ: ${scheme.benefits.slice(0, 2).join(", ")}.`;
  }
  if (language === "ta-IN") {
    return `${scheme.title} உங்கள் கேள்விக்கு பொருத்தமானது (${reasonText}). முக்கிய நன்மைகள்: ${scheme.benefits.slice(0, 2).join(", ")}.`;
  }
  if (language === "te-IN") {
    return `${scheme.title} మీ ప్రశ్నకు సరిపోతుంది (${reasonText}). ప్రధాన ప్రయోజనాలు: ${scheme.benefits.slice(0, 2).join(", ")}.`;
  }

  return `${scheme.title} matches your query (${reasonText}). Key benefits: ${scheme.benefits.slice(0, 2).join(", ")}.`;
}

function makeNarration(language: Language, scheme: Scheme): string {
  if (language === "hi-IN") {
    return `${scheme.title}. लाभ: ${scheme.benefits.join(", ")}. पात्रता: ${scheme.eligibility}. कवरेज: ${scheme.coverage}.`;
  }
  if (language === "mr-IN") {
    return `${scheme.title}. लाभ: ${scheme.benefits.join(", ")}. पात्रता: ${scheme.eligibility}. कव्हरेज: ${scheme.coverage}.`;
  }
  if (language === "ta-IN") {
    return `${scheme.title}. நன்மைகள்: ${scheme.benefits.join(", ")}. தகுதி: ${scheme.eligibility}. கவரேஜ்: ${scheme.coverage}.`;
  }
  if (language === "te-IN") {
    return `${scheme.title}. ప్రయోజనాలు: ${scheme.benefits.join(", ")}. అర్హత: ${scheme.eligibility}. కవరేజ్: ${scheme.coverage}.`;
  }

  return `${scheme.title}. Benefits: ${scheme.benefits.join(", ")}. Eligibility: ${scheme.eligibility}. Coverage: ${scheme.coverage}.`;
}

function scoreSchemes(query: string, language: Language, schemes: Scheme[]): NavigatorScheme[] {
  const normalizedQuery = normalize(query);
  const queryTokens = new Set(normalizedQuery.split(" ").filter(Boolean));

  const activeIntents = INTENT_TERMS.filter(({ terms }) =>
    terms.some((term) => normalizedQuery.includes(normalize(term)))
  );

  return schemes
    .map((scheme) => {
      const haystack = normalize(
        [
          scheme.title,
          scheme.description,
          scheme.eligibility,
          scheme.coverage,
          scheme.category,
          ...scheme.benefits,
        ].join(" ")
      );

      let score = 0;
      const reasons: string[] = [];

      for (const token of queryTokens) {
        if (token.length >= 3 && haystack.includes(token)) score += 2;
      }

      for (const intent of activeIntents) {
        const matched = intent.terms.some((term) => haystack.includes(normalize(term)));
        if (matched) {
          score += 5;
          reasons.push(localizeReason(language, intent.intent));
        }
      }

      if (!normalizedQuery) score = 1;

      return {
        ...scheme,
        score,
        matchReasons: reasons,
        localizedSummary: makeSummary(language, scheme, reasons),
        narrationText: makeNarration(language, scheme),
        googleQuery: `${scheme.title} scheme eligibility official website`,
      };
    })
    .sort((a, b) => b.score - a.score || a.id - b.id);
}

async function getLiveSchemes(request: NextRequest, role: Role): Promise<Scheme[]> {
  const origin = new URL(request.url).origin;

  try {
    const response = await fetch(`${origin}/api/schemes?role=${role}`, {
      cache: "no-store",
      headers: { "x-internal-fetch": "navigator" },
    });

    if (!response.ok) return [];
    const data = (await response.json()) as { schemes?: Scheme[] };
    return Array.isArray(data.schemes) ? data.schemes : [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      role?: Role;
      query?: string;
      language?: Language;
    };

    const role: Role = body.role === "doctor" || body.role === "staff" ? body.role : "patient";
    const language: Language =
      body.language === "hi-IN" ||
      body.language === "mr-IN" ||
      body.language === "ta-IN" ||
      body.language === "te-IN"
        ? body.language
        : "en-IN";
    const query = (body.query || "").trim();

    const liveSchemes = await getLiveSchemes(request, role);
    const usingFallback = liveSchemes.length === 0;
    const candidateSchemes = usingFallback ? FALLBACK_SCHEMES[role] : liveSchemes;

    const ranked = scoreSchemes(query, language, candidateSchemes);
    const filtered = query ? ranked.filter((scheme) => scheme.score > 0) : ranked;
    const topResults = (filtered.length > 0 ? filtered : ranked).slice(0, 6);

    return NextResponse.json({
      schemes: topResults,
      total: topResults.length,
      source: usingFallback ? "fallback" : "live",
      role,
      language,
      query,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Navigator recommendation error:", error);
    return NextResponse.json(
      {
        schemes: [],
        total: 0,
        source: "error",
        error: "Failed to generate scheme recommendations",
      },
      { status: 500 }
    );
  }
}
