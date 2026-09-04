# Borrower Copilot — Rules & Assumptions

> Version 1.0. These are explicit product assumptions, not lender underwriting policy. Sources should be added/updated before submission where an external rule is used.

| What | Value | Why | Source |
|---|---:|---|---|
| Lender-style FOIR, salaried | 50% | Illustrative upper affordability boundary | My judgement |
| Lender-style FOIR, self-employed | 45% | Allow more variability in stated/documented income | My judgement |
| Lender-style FOIR, informal | 40% | More conservative because income is less predictable | My judgement |
| Borrower-safe FOIR, salaried | 40% | Leaves headroom for household shocks | My judgement |
| Borrower-safe FOIR, self-employed | 35% | More income variability | My judgement |
| Borrower-safe FOIR, informal | 30% | Highest conservatism for unstable/document-light income | My judgement |
| Reference tenure | 5 years | Makes amount comparisons consistent | My judgement |
| Stress income drop | 20% | Simple downside scenario | My judgement |
| Stress rate rise | +2 percentage points | Simple rate shock | My judgement |
| Emergency buffer target | 3 months | Resilience assumption | My judgement |
| Unknown credit score | No automatic bad-score penalty; widen pricing | Unknown is not equivalent to poor credit | My judgement |
| Recent bounce | Reduce safe amount and widen rate | Indicates current repayment stress | My judgement |
| High-cost debt | >24% annual rate | Flags expensive existing borrowing | My judgement |
| Processing fee default | 2% of principal | Temporary assumption until product-specific fee data is sourced | My judgement |
| Personal loan base rate band | 10.5–18% | Initial market-facing range | My judgement; validate with current lender disclosures |
| Business loan base rate band | 11–20% | Initial range | My judgement; validate |
| LAP base rate band | 9.5–14.5% | Initial secured range | My judgement; validate |
| Gold loan base rate band | 9–18% | Initial range | My judgement; validate |
| Two-wheeler base rate band | 10–18% | Initial range | My judgement; validate |
| Home loan base rate band | 7.5–11.5% | Initial range | My judgement; validate |
| Rate output | Range, never a point estimate | Avoid false precision | Product judgement |
| Safe amount | Lower borrower-safe ceiling | Borrower's objective differs from lender's maximum | Product judgement |
| APR comparison | Add fee effect to rate estimate | Borrowers should compare all-in cost | Product judgement; validate exact APR methodology against applicable RBI disclosure rules |

## Important limits

- No bureau pull.
- No lender-specific approval model.
- No claim that the result predicts an actual sanction.
- Cash income may be materially different from documented income.
- The rate bands are placeholders until validated against current public lender/product disclosures.
- APR calculation in the MVP is a simplified comparison indicator, not a regulatory APR calculator.

## Updated calculation notes

- Income stability: low stability widens the fair-rate range and reduces the borrower-safe EMI ceiling; medium stability applies a smaller adjustment.
- Self-employed documented income: when ITR income is provided, the lender-style capacity uses documented monthly income; when collateral is available, the model allows a partial cash-flow recognition for a secured route. This is a product judgement, not lender policy.
- APR: the MVP now estimates an effective annualized cost from the net amount after the assumed upfront processing fee and the monthly repayment cash flows. It is still an educational estimate, not a regulatory KFS calculator.
- Stress test: the displayed EMI change comes from the rate shock; the income shock is separately reflected in the estimated cash left after expenses and existing/new EMIs.
- Product routing: a business-purpose loan with collateral is routed toward a secured business/LAP-style route.
