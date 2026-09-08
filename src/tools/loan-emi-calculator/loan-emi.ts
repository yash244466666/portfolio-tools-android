/**
 * Pure reducing-balance EMI computation for the Loan EMI Calculator.
 * Original work for this repository; no upstream code is copied.
 *
 * Money discipline: the quoted EMI is the standard formula rounded once
 * through the shared half-up cents rounding; the indicative schedule then
 * amortizes with that rounded EMI, rounding every month's interest to whole
 * cents, with the final payment adjusted so the balance clears exactly.
 * All displayed amounts are exact 2-decimal renderings of integer cents.
 */
import { formatCents, percentOfCentsHalfUp } from "@/tools/_shared/money"
import { parseBoundedDecimal } from "@/tools/_shared/bounded-parse"

export const minimumPrincipal = 1
export const maximumPrincipal = 100_000_000
export const minimumAnnualRatePercent = 0
export const maximumAnnualRatePercent = 100
export const minimumTenureMonths = 1
export const maximumTenureMonths = 600

/** Parses the principal, clamped into 1 - 100,000,000 (2-decimal money). */
export function parsePrincipal(value: string): number | null {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value.trim())) return null
  return (
    parseBoundedDecimal(value, {
      minimum: minimumPrincipal,
      maximum: maximumPrincipal,
    })?.value ?? null
  )
}

/** Parses the annual rate percent, clamped into 0 - 100 (decimals accepted). */
export function parseAnnualRatePercent(value: string): number | null {
  return (
    parseBoundedDecimal(value, {
      minimum: minimumAnnualRatePercent,
      maximum: maximumAnnualRatePercent,
    })?.value ?? null
  )
}

/** Parses the tenure in whole months, clamped into 1 - 600. */
export function parseTenureMonths(value: string): number | null {
  const parsed = parseBoundedDecimal(value, {
    minimum: minimumTenureMonths,
    maximum: maximumTenureMonths,
  })
  if (!parsed || !Number.isInteger(parsed.value)) return null
  return parsed.value
}

export interface LoanTerms {
  /** Principal in whole cents. */
  principalCents: number
  /** Annual rate as a percent (0-100, decimals accepted). */
  annualRatePercent: number
  tenureMonths: number
}

export interface AmortizationYear {
  /** 1-based year of the schedule. */
  year: number
  principalPaidCents: number
  interestPaidCents: number
  /** Balance (whole cents) after the last payment of the year. */
  balanceCents: number
}

export interface LoanSchedule {
  /** The quoted Equated Monthly Installment, in whole cents. */
  emiCents: number
  /** Whole cents of interest over the whole schedule. */
  totalInterestCents: number
  /** EMI x months, adjusted for the final payment. */
  totalPaymentCents: number
  years: AmortizationYear[]
  /** Whole months of the loan. */
  tenureMonths: number
}

/**
 * The standard reducing-balance EMI: P x r x (1+r)^n / ((1+r)^n - 1) with
 * r = annual/12/100, rounded once to cents. The 0% branch is a distinct
 * straight-line formula (principal / months) because the reducing-balance
 * form is undefined there.
 */
export function quotedEmiCents(terms: LoanTerms): number | null {
  const { principalCents, annualRatePercent, tenureMonths } = terms
  if (!Number.isInteger(principalCents) || principalCents <= 0) return null
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0 || annualRatePercent > 100) {
    return null
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths <= 0) return null
  if (annualRatePercent === 0) {
    return Math.ceil(principalCents / tenureMonths)
  }
  const monthlyRate = annualRatePercent / 12 / 100
  const growth = (1 + monthlyRate) ** tenureMonths
  // The quotient is already in whole cents; round half-up once.
  return Math.round(
    (principalCents * monthlyRate * growth) / (growth - 1) +
      Number.EPSILON * principalCents * monthlyRate,
  )
}

/**
 * Builds the indicative year-by-year amortization: the schedule pays the
 * quoted EMI every month (interest = balance x monthly rate, rounded to
 * cents), and the final payment is adjusted so the balance clears exactly.
 * Amounts are indicative — actual lender schedules round differently.
 */
export function buildLoanSchedule(terms: LoanTerms): LoanSchedule | null {
  const emiCents = quotedEmiCents(terms)
  if (emiCents === null) return null

  const monthlyPercent = terms.annualRatePercent / 12
  let balanceCents = terms.principalCents
  const years: AmortizationYear[] = []
  let totalInterestCents = 0
  let yearPrincipalCents = 0
  let yearInterestCents = 0

  for (let month = 1; month <= terms.tenureMonths; month += 1) {
    // Interest rounds to whole cents exactly once via the shared integer path.
    const interestCents = percentOfCentsHalfUp(balanceCents, monthlyPercent)
    let principalCents = emiCents - interestCents
    if (month === terms.tenureMonths || balanceCents + interestCents < emiCents) {
      // Final (or clearing) payment: pay exactly what remains.
      principalCents = balanceCents
    }
    balanceCents = balanceCents - principalCents
    yearPrincipalCents += principalCents
    yearInterestCents += interestCents
    totalInterestCents += interestCents

    if (month % 12 === 0 || month === terms.tenureMonths) {
      years.push({
        year: Math.ceil(month / 12),
        principalPaidCents: yearPrincipalCents,
        interestPaidCents: yearInterestCents,
        balanceCents,
      })
      yearPrincipalCents = 0
      yearInterestCents = 0
    }
  }

  return {
    emiCents,
    totalInterestCents,
    totalPaymentCents: terms.principalCents + totalInterestCents,
    years,
    tenureMonths: terms.tenureMonths,
  }
}
/** Formats whole cents as an exact 2-decimal string (re-exported helper). */
export function formatCentsMaybe(cents: number): string {
  return formatCents(cents)
}
