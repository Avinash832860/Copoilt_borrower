# Three borrower run-throughs

These are the required challenge personas. Values below are the intended input paths for testing the product.

## Priya, 29 — Bengaluru, salaried

### Inputs
- Purpose: wedding
- Loan type: personal
- Desired amount: ₹8,00,000
- Net monthly income: ₹1,10,000
- Income type: salaried
- Existing EMI: ₹14,000
- Household expenses: ₹40,000 (illustrative assumption; replace with stated answer if provided)
- Age: 29
- Credit score: 780
- Employment: 5 years

### Expected product behaviour
- Borrow / borrow-less, rather than an automatic reject.
- Lender-style ceiling should be higher than the borrower-safe ceiling.
- Strong credit and stable employment should tighten pricing.
- Negotiation Card should show a lower fair-rate band than a generic personal-loan quote.

## Ravi, 42 — Mysuru, self-employed

### Inputs
- Purpose: business
- Preferred route: business / secured business / LAP-style
- Desired amount: ₹15,00,000
- Cash income: ₹40,000–₹80,000/month; use a conservative documented/stated figure for the baseline
- ITR income: ₹4,20,000/year
- Income type: self-employed
- Existing EMI: ₹0
- Age: 42
- Collateral: shop premises ₹45,00,000, unencumbered
- Business vintage: 14 years
- Credit score: unknown
- Co-applicant income: ₹18,000/month

### Expected product behaviour
- Do not treat unknown credit score as 300.
- Route toward a secured business/LAP-style product when collateral and productive purpose support it.
- Explain that documented income limits an unsecured route even though collateral improves secured-product fit.

## Anita, 35 — Hubballi, informal

### Inputs
- Purpose: vehicle
- Loan type: two-wheeler
- Desired amount: ₹1,50,000
- Monthly income: ₹26,000–₹30,000; use ₹28,000 baseline
- Income type: informal
- Existing EMI/debt: app loans; ₹35,000 outstanding
- Recent bounce: yes
- High-cost debt: yes (30%+)
- Age: 35
- Credit score: unknown

### Expected product behaviour
- Don't borrow should be reachable.
- Existing high-cost debt + recent bounce should materially reduce the safe amount and widen pricing.
- The product should not blindly approve the scooter because it may increase future income.
- The Card should give an actionable reason and suggest re-running after expensive debt is reduced.

## Review checklist

For each persona verify:
1. Every output is a range where uncertainty exists.
2. Safe amount is clearly separated from lender-style amount.
3. Every number has a one-sentence "Why".
4. Unknown score is not treated as zero/bad.
5. The path is adaptive.
