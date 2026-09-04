import { BorrowerInputs, CalculationResult, IncomeType, LoanType } from "../types";
import { RULES, amountFromEmi, emi } from "./rules";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundTo(n: number, step: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / step) * step;
}

function normalizeIncomeType(
  incomeType: IncomeType
): "salaried" | "selfEmployed" | "informal" {
  return incomeType === "self-employed" ? "selfEmployed" : incomeType;
}

function getRateBand(loanType: LoanType) {
  return RULES.rateBands[loanType];
}

/**
 * Educational APR estimate.
 *
 * We solve for the monthly rate that makes:
 *   net amount received = PV of the monthly repayments
 * and annualise that monthly rate.
 *
 * This is deliberately labelled as an estimate, not a regulatory KFS APR.
 */
function estimateApr(
  principal: number,
  annualRatePct: number,
  years: number,
  upfrontFee: number
): number {
  if (principal <= 0 || years <= 0) return annualRatePct;

  const netDisbursed = Math.max(1, principal - Math.max(0, upfrontFee));
  const n = Math.max(1, Math.round(years * 12));
  const monthlyPayment = emi(principal, annualRatePct, years);

  if (monthlyPayment <= 0) return annualRatePct;

  const npv = (monthlyRate: number) => {
    let pv = 0;
    for (let t = 1; t <= n; t += 1) {
      pv += monthlyPayment / Math.pow(1 + monthlyRate, t);
    }
    return pv - netDisbursed;
  };

  // For normal loan rates this bracket safely covers the solution.
  let low = 0;
  let high = 1;

  // If the fee/rate combination creates an unusual case, return the
  // contractual rate rather than producing an invalid number.
  if (npv(low) < 0) return annualRatePct;

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const mid = (low + high) / 2;
    if (npv(mid) > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const monthlyIrr = (low + high) / 2;
  const annualized = monthlyIrr * 12 * 100;

  return Number.isFinite(annualized)
    ? clamp(annualized, 0, 100)
    : annualRatePct;
}

export function calculateBorrower(i: BorrowerInputs): CalculationResult {
  const income = Math.max(0, Number(i.netMonthlyIncome) || 0);
  const existing = Math.max(0, Number(i.existingEmi) || 0);
  const expenses = Math.max(0, Number(i.householdExpenses) || 0);
  const desiredAmount = Math.max(0, Number(i.desiredAmount) || 0);

  const incomeTypeKey = normalizeIncomeType(i.incomeType);
  const lenderFoir = RULES.baseFoir[incomeTypeKey];
  const safeFoir = RULES.safeFoir[incomeTypeKey];

  const reasons: string[] = [];
  let confidenceScore = 0;

  // ---------------- LENDER-STYLE CAPACITY ----------------
  let documentedIncome = income;

  if (
    i.incomeType === "self-employed" &&
    (i.itrAnnualIncome ?? 0) > 0
  ) {
    documentedIncome = Math.min(
      income,
      Math.max(0, Number(i.itrAnnualIncome) / 12)
    );
    confidenceScore += 1;
  }

  let lenderIncome = documentedIncome;

  if (
    i.incomeType === "self-employed" &&
    (i.collateralValue ?? 0) > 0
  ) {
    // Secured route can recognise part of stated cash flow, but not all.
    lenderIncome = Math.max(documentedIncome, income * 0.70);
    reasons.push("available collateral can support a secured route");
  }

  const lenderEmiCapacity = Math.max(
    0,
    lenderIncome * lenderFoir - existing
  );

  const safeEmiCapacity = Math.max(
    0,
    income * safeFoir - existing
  );

  // ---------------- FAIR RATE ----------------
  const rateBase = getRateBand(i.loanType);
  let rateLow: number = rateBase.low;
  let rateHigh: number = rateBase.high;

  if (i.creditScore != null && Number.isFinite(i.creditScore)) {
    confidenceScore += 2;

    if (i.creditScore >= 750) {
      rateLow -= 1.5;
      rateHigh -= 1.5;
      reasons.push("strong credit score");
    } else if (i.creditScore < 650) {
      rateLow += 2;
      rateHigh += 2;
      reasons.push("weaker credit score");
    } else {
      reasons.push("mid-range credit score");
    }
  } else {
    rateLow -= 0.5;
    rateHigh += RULES.unknownScoreRateWidening;
    reasons.push("credit score unknown");
  }

  if (i.incomeType === "salaried") {
    confidenceScore += 2;

    if ((i.employmentYears ?? 0) >= 3) {
      rateLow -= 0.5;
      rateHigh -= 0.5;
      reasons.push("stable employment history");
    }
  }

  if (i.incomeType === "self-employed") {
    confidenceScore += 1;

    if ((i.businessYears ?? 0) >= 5) {
      rateLow -= 0.5;
      rateHigh -= 0.5;
      reasons.push("established business");
    }

    if (
      (i.itrAnnualIncome ?? 0) > 0 &&
      (i.itrAnnualIncome! / 12) < income * 0.75
    ) {
      rateHigh += 1.5;
      reasons.push("documented income is below stated cash flow");
    }
  }

  if (i.incomeType === "informal") {
    rateHigh += 2;
    reasons.push("income is less predictable/documented");
  }

  if (i.incomeStability === "low") {
    rateLow += 1;
    rateHigh += 2;
    reasons.push("low income stability");
  } else if (i.incomeStability === "medium") {
    rateHigh += 0.75;
    reasons.push("variable income stability");
  }

  if (i.highCostDebt) {
    rateLow += 2;
    rateHigh += 4;
    reasons.push("existing high-cost debt");
  }

  if (i.recentBounce) {
    rateLow += 1.5;
    rateHigh += 3;
    reasons.push("recent repayment bounce");
  }

  if (
    i.variableIncomeShare != null &&
    i.variableIncomeShare > 40
  ) {
    rateHigh += 1;
    reasons.push("high variable-income share");
  }

  // ---------------- LIKELY LENDER RANGE ----------------
  const lenderAtRate = Math.max(rateLow + 1, 12);
  let likelyMax = amountFromEmi(
    lenderEmiCapacity,
    lenderAtRate,
    5
  );

  if (
    i.loanType === "lap" &&
    (i.collateralValue ?? 0) > 0
  ) {
    likelyMax = Math.min(
      likelyMax,
      (i.collateralValue ?? 0) * 0.55
    );
  }

  if (
    i.loanType === "business" &&
    (i.collateralValue ?? 0) > 0
  ) {
    likelyMax = Math.max(
      likelyMax,
      Math.min(
        (i.collateralValue ?? 0) * 0.40,
        desiredAmount * 1.25
      )
    );
  }

  // ---------------- BORROWER-SAFE EMI ----------------
  const monthlySurplus = Math.max(
    0,
    income - expenses - existing
  );

  const surplusBasedEmi = monthlySurplus * 0.35;

  let borrowerSafeEmi = Math.min(
    safeEmiCapacity,
    surplusBasedEmi
  );

  if (
    (i.emergencyMonths ?? 0) > 0 &&
    (i.emergencyMonths ?? 0) < RULES.emergencyBufferMonths
  ) {
    borrowerSafeEmi *= 0.85;
    reasons.push("limited emergency buffer");
  }

  if (i.recentBounce) {
    borrowerSafeEmi *= 0.75;
  }

  if (i.highCostDebt) {
    borrowerSafeEmi *= 0.70;
  }

  if (i.incomeStability === "low") {
    borrowerSafeEmi *= 0.85;
  } else if (i.incomeStability === "medium") {
    borrowerSafeEmi *= 0.95;
  }

  borrowerSafeEmi = Math.max(0, borrowerSafeEmi);

  // ---------------- SAFE AMOUNT ----------------
  const safeAtRate = Math.max(rateLow + 1, 12);
  const safeMax = amountFromEmi(
    borrowerSafeEmi,
    safeAtRate,
    5
  );

  const targetMax = roundTo(
    Math.max(0, safeMax),
    10000
  );

  const targetMin = roundTo(
    Math.max(0, safeMax * 0.85),
    10000
  );

  const referenceAmount =
    desiredAmount > 0
      ? Math.min(desiredAmount, Math.max(0, targetMax))
      : targetMax;

  // ---------------- VERDICT ----------------
  const desiredRatio =
    desiredAmount / Math.max(1, safeMax);

  let verdict: CalculationResult["verdict"] = "borrow";
  let verdictReason =
    "Your requested amount fits inside the current safe affordability estimate.";

  if (
    i.highCostDebt ||
    i.recentBounce ||
    (safeMax > 0 && safeMax < desiredAmount * 0.65)
  ) {
    verdict = "dont-borrow";
    verdictReason =
      "Your current debt or repayment stress makes taking the requested loan unsafe right now.";
  } else if (desiredAmount > safeMax) {
    verdict = "borrow-less";
    verdictReason =
      "The request is above your borrower-safe ceiling; leaving the gap reduces payment stress.";
  } else if (desiredRatio > 0.90) {
    verdict = "borrow-less";
    verdictReason =
      "The request is close to your safe borrowing ceiling; leaving headroom reduces the risk of payment stress.";
  }

  // ---------------- CONFIDENCE ----------------
  const confidence: CalculationResult["confidence"] =
    confidenceScore >= 6
      ? "high"
      : confidenceScore >= 3
        ? "medium"
        : "low";

  const confidenceReason =
    confidence === "high"
      ? "Most core affordability, income stability and pricing inputs are known, so the ranges are relatively tight."
      : confidence === "medium"
        ? "Some important inputs are known, but missing details widen the estimate."
        : "Several important inputs are unknown, so the ranges are intentionally wide.";

  // ---------------- RATE + APR ----------------
  const fairLow = clamp(rateLow, 7, 30);
  const fairHigh = clamp(
    rateHigh,
    fairLow + 1,
    35
  );

  const feeAmount =
    i.processingFee != null
      ? Math.max(0, Number(i.processingFee))
      : desiredAmount * RULES.processingFeeDefault;

  const aprReferenceAmount =
    desiredAmount > 0
      ? desiredAmount
      : Math.max(1, targetMax);

  const aprMin = estimateApr(
    aprReferenceAmount,
    fairLow,
    5,
    feeAmount
  );

  const aprMax = estimateApr(
    aprReferenceAmount,
    fairHigh,
    5,
    feeAmount
  );

  // ---------------- STRESS TEST ----------------
  const normalEmi =
    referenceAmount > 0
      ? emi(referenceAmount, safeAtRate, 5)
      : 0;

  const stressedRate =
    safeAtRate + RULES.stressRateRise * 100;

  const stressedEmi =
    referenceAmount > 0
      ? emi(referenceAmount, stressedRate, 5)
      : 0;

  const stressedIncome =
    income * (1 - RULES.stressIncomeDrop);

  const stressedCashLeft = Math.max(
    0,
    stressedIncome -
      expenses -
      existing -
      stressedEmi
  );

  const productRoute =
    i.purpose === "business" &&
    (i.collateralValue ?? 0) > 0
      ? "secured business loan / LAP-style route"
      : i.loanType;

  const safeWhy =
    `Your borrower-safe ceiling uses the stricter of a ${Math.round(
      safeFoir * 100
    )}% affordability test and 35% of cash surplus after household expenses and existing EMI of ${Math.round(
      existing
    ).toLocaleString("en-IN")}.`;

  const lenderWhy =
    `A lender-style ${Math.round(
      lenderFoir * 100
    )}% FOIR estimate gives a higher theoretical capacity before product-specific underwriting. This is not an approval prediction.`;

  const rateWhy =
    `The band starts from the ${i.loanType} product range and adjusts for ${
      reasons.length
        ? reasons.slice(0, 4).join(", ")
        : "the information provided"
    }. APR includes the assumed upfront processing fee.`;

  const safeEmiMin = roundTo(
    borrowerSafeEmi * 0.90,
    100
  );
  const safeEmiMax = roundTo(
    borrowerSafeEmi,
    100
  );

  const safeEmiWhy =
    `This is your monthly ceiling after applying the stricter affordability and post-expense cash-surplus tests, rather than the lender's maximum.`;

  return {
    verdict,
    verdictReason,

    likelySanction: {
      min: roundTo(
        Math.max(0, likelyMax * 0.80),
        10000
      ),
      max: roundTo(
        Math.max(0, likelyMax),
        10000
      ),
      why: lenderWhy
    },

    safeAmount: {
      min: targetMin,
      max: targetMax,
      why: safeWhy
    },

    fairRate: {
      min: Math.round(fairLow * 10) / 10,
      max: Math.round(fairHigh * 10) / 10,
      aprMin: Math.round(aprMin * 10) / 10,
      aprMax: Math.round(aprMax * 10) / 10,
      why: rateWhy
    },

    safeEmi: {
      min: safeEmiMin,
      max: safeEmiMax,
      why: safeEmiWhy
    },

    stress: {
      label: `${Math.round(
        RULES.stressIncomeDrop * 100
      )}% income drop + ${Math.round(
        RULES.stressRateRise * 100
      )} percentage-point rate rise`,
      normalEmi: Math.round(normalEmi),
      stressedEmi: Math.round(stressedEmi),
      explanation:
        `At a ${Math.round(
          RULES.stressIncomeDrop * 100
        )}% income drop, monthly income falls from ₹${Math.round(
          income
        ).toLocaleString("en-IN")} to ₹${Math.round(
          stressedIncome
        ).toLocaleString("en-IN")}. With the rate rise, EMI moves from ₹${Math.round(
          normalEmi
        ).toLocaleString("en-IN")} to ₹${Math.round(
          stressedEmi
        ).toLocaleString("en-IN")}; estimated cash left after household expenses, existing EMI and the new EMI would be ₹${Math.round(
          stressedCashLeft
        ).toLocaleString("en-IN")}.`
    },

    confidence,
    confidenceReason,
    productRoute,

    card: {
      headline:
        verdict === "dont-borrow"
          ? "Don't borrow this amount now"
          : verdict === "borrow-less"
            ? "Borrow less than the lender may offer"
            : "Borrow within your safe ceiling",

      fairRate: `${fairLow.toFixed(
        1
      )}–${fairHigh.toFixed(1)}%`,

      safeEmi: `₹${safeEmiMax.toLocaleString(
        "en-IN"
      )}/month`,

      targetAmount: `₹${targetMin.toLocaleString(
        "en-IN"
      )}–₹${targetMax.toLocaleString(
        "en-IN"
      )}`,

      reasons:
        reasons.length > 0
          ? reasons.slice(0, 4)
          : ["affordability and repayment capacity"],

      ask:
        `Please quote your all-in APR and fees. My fair rate range is ${fairLow.toFixed(
          1
        )}–${fairHigh.toFixed(
          1
        )}%, and I will not agree to an EMI above my safe ceiling.`
    }
  };
}
