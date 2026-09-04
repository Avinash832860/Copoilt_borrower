import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  ChevronLeft,
} from "lucide-react";

import {
  BorrowerInputs,
  IncomeType,
  LoanType,
  Purpose,
} from "./types";

import { calculateBorrower } from "./engine/calculate";
import { formatINR } from "./engine/rules";

type QuestionStep = {
  key: keyof BorrowerInputs;
  title: string;
  help: string;
  optional?: boolean;
};

const initialInputs: BorrowerInputs = {
  purpose: "wedding",
  loanType: "personal",
  desiredAmount: 0,
  netMonthlyIncome: 0,
  incomeType: "salaried",
  existingEmi: 0,
  householdExpenses: 0,
  age: 0,
  creditScore: null,
};

function App() {
  const [started, setStarted] = useState(false);
  const [inputs, setInputs] =
    useState<BorrowerInputs>(initialInputs);

  const [step, setStep] = useState(0);

  const [result, setResult] =
    useState<ReturnType<typeof calculateBorrower> | null>(null);

  /*
   * The first 9 questions are the minimum dataset.
   * After these, we add only questions relevant to
   * the borrower's income type.
   */
  const steps: QuestionStep[] = useMemo(() => {
    const mustQuestions: QuestionStep[] = [
      {
        key: "purpose",
        title: "What is the loan for?",
        help:
          "The purpose matters because productive borrowing can have a different risk profile from consumption borrowing.",
      },
      {
        key: "loanType",
        title: "What loan type are you considering?",
        help:
          "Different loan products have different pricing and underwriting expectations.",
      },
      {
        key: "desiredAmount",
        title: "How much do you want to borrow?",
        help:
          "We'll compare this with both a lender-style capacity and a safer borrower ceiling.",
      },
      {
        key: "netMonthlyIncome",
        title: "What is your net monthly income?",
        help:
          "Use the income that actually reaches you. For variable income, use a realistic monthly average.",
      },
      {
        key: "incomeType",
        title: "How do you earn this income?",
        help:
          "Income stability and documentation affect affordability and pricing.",
      },
      {
        key: "existingEmi",
        title: "How much do you already pay in EMIs?",
        help:
          "Existing EMIs reduce how much room you have for another loan.",
      },
      {
        key: "householdExpenses",
        title: "What are your monthly household expenses?",
        help:
          "Do not include existing EMIs here. We'll account for those separately.",
      },
      {
        key: "age",
        title: "How old are you?",
        help:
          "Age helps us judge whether the reference tenure is realistic.",
      },
      {
        key: "creditScore",
        title: "Do you know your credit score?",
        help:
          "If you don't know it, we'll keep the rate range wider. Unknown is not treated as a bad score.",
        optional: true,
      },
    ];

    const additionalQuestions: QuestionStep[] = [];

    if (inputs.incomeType === "salaried") {
      additionalQuestions.push(
        {
          key: "employmentYears",
          title: "How long have you been with your current employer?",
          help:
            "Longer employment history can support a more stable income assessment and tighter pricing.",
        },
        {
          key: "variableIncomeShare",
          title: "Roughly what percentage of your income is variable?",
          help:
            "Bonus, incentives and commissions are less predictable than fixed salary.",
        },
        {
          key: "emergencyMonths",
          title: "How many months of essential expenses could your savings cover?",
          help:
            "A larger emergency buffer means you have more room to handle an unexpected income shock.",
        }
      );
    }

    if (inputs.incomeType === "self-employed") {
      additionalQuestions.push(
        {
          key: "businessYears",
          title: "How many years has the business been running?",
          help:
            "A longer operating history can make business cash flow easier to assess.",
        },
        {
          key: "itrAnnualIncome",
          title: "What annual income is shown in your ITR?",
          help:
            "This helps us distinguish stated cash flow from documented income.",
        },
      );

      if (
        inputs.purpose === "business" ||
        inputs.loanType === "business" ||
        inputs.loanType === "lap"
      ) {
        additionalQuestions.push({
          key: "collateralValue",
          title:
            "What is the approximate value of property you could offer as collateral?",
          help:
            "Collateral can support a secured business/LAP-style route and may change the lender-side range.",
        });
      }
    }

    if (inputs.incomeType === "informal") {
      additionalQuestions.push(
        {
          key: "incomeStability",
          title: "How predictable is your monthly income?",
          help:
            "We use this to avoid treating a variable income month as guaranteed income.",
        },
        {
          key: "variableIncomeShare",
          title: "Roughly what percentage of your income changes month to month?",
          help:
            "Higher variability means the safe ceiling should be more conservative.",
        },
        {
          key: "emergencyMonths",
          title: "How many months of essential expenses could your savings cover?",
          help:
            "A cash buffer can protect you if income temporarily falls.",
        },
        {
          key: "highCostDebt",
          title: "Do you currently have any borrowing above about 24% annual interest?",
          help:
            "High-cost debt can make taking another loan unsafe even if the new loan has a useful purpose.",
        },
        {
          key: "recentBounce",
          title: "Has an EMI or loan payment bounced recently?",
          help:
            "A recent bounce is a sign that current repayment capacity may already be stretched.",
        }
      );
    }

    return [...mustQuestions, ...additionalQuestions];
  }, [inputs.incomeType]);

  const currentQuestion = steps[step];

  function setValue(
    key: keyof BorrowerInputs,
    value: unknown
  ) {
    setInputs((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function canContinue() {
    if (!currentQuestion) return false;

    if (currentQuestion.optional) {
      return true;
    }

    const value = inputs[currentQuestion.key];

    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === "string" && value.trim() === "") {
      return false;
    }

    if (
      typeof value === "number" &&
      value < 0
    ) {
      return false;
    }

    return true;
  }

  function next() {
    if (!canContinue()) return;

    if (step < steps.length - 1) {
      setStep((current) => current + 1);
    } else {
      setResult(calculateBorrower(inputs));
    }
  }

  function back() {
    if (step === 0) {
      setStarted(false);
    } else {
      setStep((current) => current - 1);
    }
  }

  function reset() {
    setInputs(initialInputs);
    setStep(0);
    setResult(null);
    setStarted(false);
  }

  if (result) {
    return (
      <Results
        result={result}
        reset={reset}
      />
    );
  }

  if (!started) {
    return (
      <main className="shell hero">
        <div className="brand">
          <ShieldCheck size={22} />
          Borrower Copilot
        </div>

        <div className="hero-card">
          <span className="eyebrow">
            BEFORE YOU WALK INTO A LENDER
          </span>

          <h1>
            Know what you should borrow — not just
            what they'll approve.
          </h1>

          <p>
            Answer a few questions and get a safer
            borrowing ceiling, a fair rate range, an
            EMI limit, and a negotiation card.
          </p>

          <div className="privacy">
            <ShieldCheck size={18} />
            <span>
              No login. No bureau pull. No data stored.
            </span>
          </div>

          <button
            onClick={() => setStarted(true)}
          >
            Start assessment
            <ArrowRight size={18} />
          </button>

          <small>
            Estimates are educational and are not
            lender approval or financial advice.
          </small>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <ShieldCheck size={20} />
          Borrower Copilot
        </div>

        <span>
          {step + 1} of {steps.length}
        </span>
      </div>

      <div className="progress">
        <span
          style={{
            width: `${((step + 1) / steps.length) * 100}%`,
          }}
        />
      </div>

      <section className="question-card">
        <button
          className="back"
          onClick={back}
        >
          <ChevronLeft size={17} />
          Back
        </button>

        <div className="eyebrow">
          {currentQuestion.optional
            ? "OPTIONAL"
            : "QUESTION"}{" "}
          {step + 1}
        </div>

        <h2>{currentQuestion.title}</h2>

        <p className="help">
          {currentQuestion.help}
        </p>

        <QuestionInput
          step={currentQuestion.key}
          inputs={inputs}
          setValue={setValue}
        />

        <button
          className="next"
          disabled={!canContinue()}
          onClick={next}
        >
          {step === steps.length - 1
            ? "See my position"
            : "Continue"}

          <ArrowRight size={18} />
        </button>
      </section>
    </main>
  );
}

function QuestionInput({
  step,
  inputs,
  setValue,
}: {
  step: keyof BorrowerInputs;
  inputs: BorrowerInputs;
  setValue: (
    key: keyof BorrowerInputs,
    value: unknown
  ) => void;
}) {
  if (step === "purpose") {
    const values: Purpose[] = [
      "wedding",
      "business",
      "vehicle",
      "education",
      "home",
      "medical",
      "other",
    ];

    return (
      <div className="grid-options">
        {values.map((value) => (
          <Option
            key={value}
            active={inputs.purpose === value}
            onClick={() =>
              setValue("purpose", value)
            }
          >
            {formatLabel(value)}
          </Option>
        ))}
      </div>
    );
  }

  if (step === "loanType") {
    const values: LoanType[] = [
      "personal",
      "business",
      "lap",
      "gold",
      "two-wheeler",
      "home",
    ];

    return (
      <div className="grid-options">
        {values.map((value) => (
          <Option
            key={value}
            active={inputs.loanType === value}
            onClick={() =>
              setValue("loanType", value)
            }
          >
            {formatLabel(value)}
          </Option>
        ))}
      </div>
    );
  }

  if (step === "incomeType") {
    const values: IncomeType[] = [
      "salaried",
      "self-employed",
      "informal",
    ];

    return (
      <div className="grid-options">
        {values.map((value) => (
          <Option
            key={value}
            active={inputs.incomeType === value}
            onClick={() =>
              setValue("incomeType", value)
            }
          >
            {formatLabel(value)}
          </Option>
        ))}
      </div>
    );
  }

  if (step === "creditScore") {
    return (
      <div>
        <input
          autoFocus
          type="number"
          min="300"
          max="900"
          placeholder="e.g. 780"
          value={inputs.creditScore ?? ""}
          onChange={(event) => {
            const value = event.target.value;

            setValue(
              "creditScore",
              value === ""
                ? null
                : Number(value)
            );
          }}
        />

        <button
          className="unknown"
          onClick={() =>
            setValue("creditScore", null)
          }
        >
          I don't know my score
        </button>
      </div>
    );
  }

  if (step === "incomeStability") {
    const values = [
      { value: "high", label: "Very predictable" },
      { value: "medium", label: "Somewhat variable" },
      { value: "low", label: "Highly variable" },
    ];

    return (
      <div className="grid-options">
        {values.map((item) => (
          <Option
            key={item.value}
            active={
              inputs.incomeStability === item.value
            }
            onClick={() =>
              setValue(
                "incomeStability",
                item.value
              )
            }
          >
            {item.label}
          </Option>
        ))}
      </div>
    );
  }

  if (
    step === "highCostDebt" ||
    step === "recentBounce"
  ) {
    return (
      <div className="grid-options">
        <Option
          active={inputs[step] === true}
          onClick={() => setValue(step, true)}
        >
          Yes
        </Option>

        <Option
          active={inputs[step] === false}
          onClick={() => setValue(step, false)}
        >
          No
        </Option>
      </div>
    );
  }

  const value = inputs[step];

  return (
    <input
      autoFocus
      type="number"
      min="0"
      placeholder={getPlaceholder(step)}
      value={
        typeof value === "number" && value > 0
          ? value
          : ""
      }
      onChange={(event) =>
        setValue(
          step,
          Number(event.target.value)
        )
      }
    />
  );
}

function Option({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`option ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getPlaceholder(
  key: keyof BorrowerInputs
) {
  switch (key) {
    case "desiredAmount":
      return "e.g. 800000";

    case "netMonthlyIncome":
      return "e.g. 110000";

    case "existingEmi":
      return "e.g. 14000";

    case "householdExpenses":
      return "e.g. 40000";

    case "age":
      return "e.g. 29";

    case "employmentYears":
      return "e.g. 5";

    case "variableIncomeShare":
      return "e.g. 20";

    case "emergencyMonths":
      return "e.g. 4";

    case "businessYears":
      return "e.g. 14";

    case "itrAnnualIncome":
      return "e.g. 420000";

    case "collateralValue":
      return "e.g. 4500000";

    default:
      return "Enter a value";
  }
}

function formatLabel(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter: string) =>
      letter.toUpperCase()
    );
}

function Results({
  result,
  reset,
}: {
  result: ReturnType<typeof calculateBorrower>;
  reset: () => void;
}) {
  return (
    <main className="shell results">
      <div className="topbar">
        <div className="brand">
          <ShieldCheck size={20} />
          Borrower Copilot
        </div>

        <button
          className="reset"
          onClick={reset}
        >
          <RotateCcw size={16} />
          Start over
        </button>
      </div>

      <div
        className={`verdict ${result.verdict}`}
      >
        <div>
          <span className="eyebrow">
            YOUR POSITION
          </span>

          <h1>{result.card.headline}</h1>

          <p>{result.verdictReason}</p>
        </div>

        <div className="confidence">
          <Sparkles size={17} />
          {result.confidence} confidence
        </div>
      </div>

      <div className="cards">
        <Metric
          title="1. Should I borrow?"
          value={
            result.verdict === "borrow"
              ? "Borrow"
              : result.verdict ===
                "borrow-less"
              ? "Borrow less"
              : "Don't borrow"
          }
          why={result.verdictReason}
        />

        <Metric
          title="2. Borrower-safe amount"
          value={`${formatINR(
            result.safeAmount.min
          )} – ${formatINR(
            result.safeAmount.max
          )}`}
          sub={`Likely lender range: ${formatINR(
            result.likelySanction.min
          )} – ${formatINR(
            result.likelySanction.max
          )}`}
          why={result.safeAmount.why}
        />

        <Metric
          title="3. Fair interest rate"
          value={`${result.fairRate.min}% – ${result.fairRate.max}%`}
          sub={`Estimated all-in APR: ${result.fairRate.aprMin}% – ${result.fairRate.aprMax}%`}
          why={result.fairRate.why}
        />

        <Metric
          title="4. EMI to agree to"
          value={`${formatINR(
            result.safeEmi.min
          )} – ${formatINR(
            result.safeEmi.max
          )}/mo`}
          sub="Monthly ceiling to agree to • 5-year reference"
          why={result.safeEmi.why}
        />
      </div>

      <section className="stress">
        <div>
          <span className="eyebrow">
            STRESS TEST
          </span>

          <h2>{result.stress.label}</h2>

          <p>
            {result.stress.explanation}
          </p>
        </div>

        <div className="stress-number">
          <b>
            {formatINR(
              result.stress.normalEmi
            )}
          </b>

          <span>→</span>

          <b>
            {formatINR(
              result.stress.stressedEmi
            )}
          </b>
        </div>
      </section>

      <section className="negotiation">
        <div className="card-label">
          NEGOTIATION CARD
        </div>

        <h2>{result.card.headline}</h2>

        <div className="neg-grid">
          <div>
            <small>FAIR RATE</small>
            <strong>
              {result.card.fairRate}
            </strong>
          </div>

          <div>
            <small>SAFE EMI</small>
            <strong>
              {result.card.safeEmi}
            </strong>
          </div>

          <div>
            <small>TARGET AMOUNT</small>
            <strong>
              {result.card.targetAmount}
            </strong>
          </div>
        </div>

        <h3>Why</h3>

        <ul>
          {result.card.reasons.map(
            (reason) => (
              <li key={reason}>
                {reason}
              </li>
            )
          )}
        </ul>

        <blockquote>
          “{result.card.ask}”
        </blockquote>

        <p className="route">
          Suggested product route:{" "}
          <b>{result.productRoute}</b>
        </p>
      </section>

      <p className="footnote">
        <b>
          Confidence: {result.confidence}.
        </b>{" "}
        {result.confidenceReason} Every estimate
        is a rule-based range, not a lender quote.
      </p>
    </main>
  );
}

function Metric({
  title,
  value,
  sub,
  why,
}: {
  title: string;
  value: string;
  sub?: string;
  why: string;
}) {
  return (
    <section className="metric">
      <span className="eyebrow">
        {title}
      </span>

      <h2>{value}</h2>

      {sub && (
        <p className="sub">{sub}</p>
      )}

      <p className="why">
        <b>Why:</b> {why}
      </p>
    </section>
  );
}

export default App;