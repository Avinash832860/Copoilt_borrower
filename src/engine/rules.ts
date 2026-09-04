export const RULES = {
  baseFoir: {
    salaried: 0.50,
    selfEmployed: 0.45,
    informal: 0.40
  },
  safeFoir: {
    salaried: 0.40,
    selfEmployed: 0.35,
    informal: 0.30
  },
  unknownScoreRateWidening: 1.5,
  highCostDebtRate: 24,
  recentBounceMonths: 1,
  emergencyBufferMonths: 3,
  stressIncomeDrop: 0.20,
  stressRateRise: 0.02,
  processingFeeDefault: 0.02,
  rateBands: {
    personal: { low: 10.5, high: 18.0 },
    business: { low: 11.0, high: 20.0 },
    lap: { low: 9.5, high: 14.5 },
    gold: { low: 9.0, high: 18.0 },
    "two-wheeler": { low: 10.0, high: 18.0 },
    home: { low: 7.5, high: 11.5 }
  }
} as const;

export function emi(principal: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 1200;
  const n = years * 12;
  if (!principal || !r) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

export function amountFromEmi(monthlyEmi: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 1200;
  const n = years * 12;
  if (!r) return monthlyEmi * n;
  return monthlyEmi * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}

export function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(n)));
}