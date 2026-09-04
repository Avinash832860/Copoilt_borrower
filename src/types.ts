export type IncomeType = "salaried" | "self-employed" | "informal";
export type LoanType = "personal" | "business" | "lap" | "gold" | "two-wheeler" | "home";
export type Purpose = "wedding" | "business" | "vehicle" | "education" | "home" | "medical" | "other";

export interface BorrowerInputs {
  purpose: Purpose;
  loanType: LoanType;
  desiredAmount: number;
  netMonthlyIncome: number;
  incomeType: IncomeType;
  incomeStability?: "high" | "medium" | "low";
  existingEmi: number;
  householdExpenses: number;
  age: number;
  creditScore?: number | null;
  employmentYears?: number;
  itrAnnualIncome?: number;
  collateralValue?: number;
  businessYears?: number;
  variableIncomeShare?: number;
  emergencyMonths?: number;
  recentBounce?: boolean;
  highCostDebt?: boolean;
  coApplicantIncome?: number;
  productiveLoan?: boolean;
  quotedRate?: number;
  processingFee?: number;
}

export interface CalculationResult {
  verdict: "borrow" | "borrow-less" | "dont-borrow";
  verdictReason: string;
  likelySanction: { min: number; max: number; why: string };
  safeAmount: { min: number; max: number; why: string };
  fairRate: { min: number; max: number; aprMin: number; aprMax: number; why: string };
  safeEmi: { min: number; max: number; why: string };
  stress: { label: string; normalEmi: number; stressedEmi: number; explanation: string };
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
  productRoute: string;
  card: {
    headline: string;
    fairRate: string;
    safeEmi: string;
    targetAmount: string;
    reasons: string[];
    ask: string;
  };
}