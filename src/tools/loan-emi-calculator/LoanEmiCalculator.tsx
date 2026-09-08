import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { formatCents } from "@/tools/_shared/money"
import {
  buildLoanSchedule,
  maximumAnnualRatePercent,
  maximumPrincipal,
  maximumTenureMonths,
  minimumAnnualRatePercent,
  minimumPrincipal,
  minimumTenureMonths,
  parseAnnualRatePercent,
  parsePrincipal,
  parseTenureMonths,
} from "./loan-emi"

export default function LoanEmiCalculator() {
  const [principalText, setPrincipalText] = useState("")
  const [rateText, setRateText] = useState("")
  const [tenureText, setTenureText] = useState("")

  const principal = useMemo(() => parsePrincipal(principalText), [principalText])
  const rate = useMemo(() => parseAnnualRatePercent(rateText), [rateText])
  const tenure = useMemo(() => parseTenureMonths(tenureText), [tenureText])
  const principalInvalid = principalText.trim() !== "" && principal === null
  const rateInvalid = rateText.trim() !== "" && rate === null
  const tenureInvalid = tenureText.trim() !== "" && tenure === null

  const schedule =
    principal !== null && rate !== null && tenure !== null
      ? buildLoanSchedule({
          principalCents: Math.round(principal * 100),
          annualRatePercent: rate,
          tenureMonths: tenure,
        })
      : null

  return (
    <div className="grid gap-4">
      <ToolPanel title="Loan terms">
        <div className="grid gap-4">
          <Field
            error={
              principalInvalid
                ? `Enter a principal between ${minimumPrincipal} and ${maximumPrincipal.toLocaleString("en-US")}.`
                : undefined
            }
            hint="Loan amount in plain numbers, at most 2 decimals."
            htmlFor="loan-emi-principal"
            label="Principal amount"
          >
            <input
              className="app-input font-mono"
              id="loan-emi-principal"
              inputMode="decimal"
              onChange={(event) => setPrincipalText(event.target.value)}
              placeholder="100000"
              value={principalText}
            />
          </Field>
          <Field
            error={
              rateInvalid
                ? `Enter an annual interest rate between ${minimumAnnualRatePercent} and ${maximumAnnualRatePercent} percent.`
                : undefined
            }
            hint="Reducing-balance annual rate; 0 means an interest-free loan."
            htmlFor="loan-emi-rate"
            label="Annual interest rate (%)"
          >
            <input
              className="app-input font-mono"
              id="loan-emi-rate"
              inputMode="decimal"
              onChange={(event) => setRateText(event.target.value)}
              placeholder="12"
              value={rateText}
            />
          </Field>
          <Field
            error={
              tenureInvalid
                ? `Enter a tenure between ${minimumTenureMonths} and ${maximumTenureMonths} months.`
                : undefined
            }
            htmlFor="loan-emi-tenure"
            label="Tenure (months)"
          >
            <input
              className="app-input font-mono"
              id="loan-emi-tenure"
              inputMode="numeric"
              onChange={(event) => setTenureText(event.target.value)}
              placeholder="12"
              value={tenureText}
            />
          </Field>
          <div>
            <Button onClick={reset} variant="quiet">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Result">
        <p aria-live="polite" className="text-sm" role="status">
          {schedule
            ? `The EMI is ${formatCents(schedule.emiCents)} per month for ${schedule.tenureMonths} months. Total interest ${formatCents(schedule.totalInterestCents)}; total payment ${formatCents(schedule.totalPaymentCents)}.`
            : principalInvalid || rateInvalid || tenureInvalid
              ? "Fix the highlighted loan term to compute the EMI."
              : "Enter the principal, rate, and tenure to see the EMI."}
        </p>
        {schedule ? (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">
              Indicative year-by-year amortization for the entered loan terms
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <th scope="col" className="py-2">
                  Year
                </th>
                <th scope="col" className="py-2 text-right">
                  Principal paid
                </th>
                <th scope="col" className="py-2 text-right">
                  Interest paid
                </th>
                <th scope="col" className="py-2 text-right">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {schedule.years.map((year) => (
                <tr className="border-t border-[var(--border)]" key={year.year}>
                  <td className="py-2">{year.year}</td>
                  <td className="py-2 text-right font-mono">
                    {formatCents(year.principalPaidCents)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatCents(year.interestPaidCents)}
                  </td>
                  <td className="py-2 text-right font-mono">{formatCents(year.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </ToolPanel>

      <div
        className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-muted)] p-4 text-sm"
        role="note"
      >
        <p className="font-medium">Indicative only — not a loan offer</p>
        <p className="mt-1 text-[var(--text-secondary)]">
          The schedule uses the standard reducing-balance formula and rounds every amount to cents,
          but actual lender terms vary: processing fees, insurance, prepayment penalties, and
          day-count conventions change real payments. Confirm with the lender.
        </p>
      </div>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Everything runs on this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )

  function reset() {
    setPrincipalText("")
    setRateText("")
    setTenureText("")
  }
}
