# Borrower Copilot

A no-login, rule-based borrower self-assessment for Indian borrowers.

## Run locally

Requirements: Node.js 18+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Product thesis

A lender answers "what can I sanction?" Borrower Copilot answers "what should I take?"

The calculation engine is intentionally separate from the UI so every threshold can be reviewed and changed in one place.

## Current MVP

- Must-question flow
- Rule-based affordability
- Lender-style vs borrower-safe amount
- Fair rate band + estimated all-in APR
- EMI ceiling
- Stress test
- Confidence
- Negotiation Card
- Adaptive income-type questions
- Suggested product routing

This version is intentionally conservative and transparent. It is not a credit underwriting model and does not use a bureau, lender API, backend or stored personal data.
