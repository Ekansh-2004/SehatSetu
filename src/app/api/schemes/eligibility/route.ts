import { NextRequest, NextResponse } from "next/server";

type State = "Rajasthan" | "Other";
type Employment = "Govt Employee" | "Pensioner" | "Private" | "Other";
type Income = "Below 2.5L" | "2.5L-5L" | "Above 5L";

const VALID_STATES: State[] = ["Rajasthan", "Other"];
const VALID_EMPLOYMENTS: Employment[] = ["Govt Employee", "Pensioner", "Private", "Other"];
const VALID_INCOMES: Income[] = ["Below 2.5L", "2.5L-5L", "Above 5L"];

type EligibilityResult = {
  name: string;
  shortName: string;
  eligible: boolean;
  coverage: string;
  coverageDesc: string;
  helpline: string;
  reason?: string;
  details: {
    officialWebsite: string;
    applyAt: string;
    documentsNeeded: string[];
    notes: string;
  };
};

const SCHEME_DEFINITIONS = [
  {
    name: "Rajasthan Government Health Scheme",
    shortName: "RGHS",
    coverage: "₹5 lakh/year",
    coverageDesc: "Cashless treatment at empanelled hospitals",
    helpline: "1800-180-6127",
    reason: "Only for Rajasthan govt employees & pensioners",
    details: {
      officialWebsite: "https://rghs.rajasthan.gov.in",
      applyAt: "Department of Medical, Health & Family Welfare, Rajasthan",
      documentsNeeded: ["Govt service ID", "Aadhaar card", "Salary slip or pension certificate"],
      notes: "Covers employee, spouse, and dependent children. Private sector employees are not eligible.",
    },
    check: (state: State, employment: Employment, _income: Income, _hasBPLCard: boolean): boolean =>
      state === "Rajasthan" && (employment === "Govt Employee" || employment === "Pensioner"),
  },
  {
    name: "PMJAY – Ayushman Bharat",
    shortName: "PMJAY",
    coverage: "₹5 lakh/year",
    coverageDesc: "1500+ empanelled hospitals across India",
    helpline: "14555",
    reason: "Only for low-income or BPL card holders",
    details: {
      officialWebsite: "https://pmjay.gov.in",
      applyAt: "Nearest Common Service Centre (CSC) or empanelled hospital",
      documentsNeeded: ["Aadhaar card", "Ration/BPL card (if applicable)", "Income certificate"],
      notes: "Covers entire family. Check eligibility at pmjay.gov.in/am-i-eligible before applying.",
    },
    check: (_state: State, _employment: Employment, income: Income, hasBPLCard: boolean): boolean =>
      income === "Below 2.5L" || hasBPLCard,
  },
  {
    name: "Chiranjeevi Yojana",
    shortName: "Chiranjeevi",
    coverage: "₹25 lakh/year",
    coverageDesc: "Rajasthan empanelled hospital network",
    helpline: "181",
    reason: "Only for Rajasthan residents with low income or BPL card",
    details: {
      officialWebsite: "https://chiranjeevi.rajasthan.gov.in",
      applyAt: "Jan Aadhaar enrolment centre or empanelled hospital",
      documentsNeeded: ["Jan Aadhaar card", "Aadhaar card", "BPL/Ration card (for BPL category)"],
      notes:
        "Free registration for state govt employees, BPL families, and small/marginal farmers. ₹850/year premium for others.",
    },
    check: (state: State, _employment: Employment, income: Income, hasBPLCard: boolean): boolean =>
      state === "Rajasthan" && (income === "Below 2.5L" || hasBPLCard),
  },
];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { state, employment, income, hasBPLCard } = body as Record<string, unknown>;

  if (!VALID_STATES.includes(state as State)) {
    return NextResponse.json({ error: `Invalid state. Must be one of: ${VALID_STATES.join(", ")}` }, { status: 400 });
  }
  if (!VALID_EMPLOYMENTS.includes(employment as Employment)) {
    return NextResponse.json({ error: `Invalid employment. Must be one of: ${VALID_EMPLOYMENTS.join(", ")}` }, { status: 400 });
  }
  if (!VALID_INCOMES.includes(income as Income)) {
    return NextResponse.json({ error: `Invalid income. Must be one of: ${VALID_INCOMES.join(", ")}` }, { status: 400 });
  }
  if (typeof hasBPLCard !== "boolean") {
    return NextResponse.json({ error: "hasBPLCard must be a boolean" }, { status: 400 });
  }

  const s = state as State;
  const e = employment as Employment;
  const i = income as Income;
  const bpl = hasBPLCard;

  const results: EligibilityResult[] = SCHEME_DEFINITIONS.map((scheme) => {
    const eligible = scheme.check(s, e, i, bpl);
    return {
      name: scheme.name,
      shortName: scheme.shortName,
      eligible,
      coverage: scheme.coverage,
      coverageDesc: scheme.coverageDesc,
      helpline: scheme.helpline,
      reason: eligible ? undefined : scheme.reason,
      details: scheme.details,
    };
  });

  const eligibleCount = results.filter((r) => r.eligible).length;

  return NextResponse.json({
    results,
    summary: {
      eligibleCount,
      totalChecked: results.length,
      input: { state: s, employment: e, income: i, hasBPLCard: bpl },
    },
    timestamp: new Date().toISOString(),
  });
}
