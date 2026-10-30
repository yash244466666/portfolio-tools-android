/**
 * Pure reducing-balance EMI computation for the Loan EMI Calculator.
 * Original work for this repository; no upstream code is copied.
 *
 * Money discipline: the quoted EMI is the standard formula evaluated in
 * exact integer arithmetic and rounded once, half-up, to cents; the
 * indicative schedule then amortizes with that rounded EMI, using the same
 * exact rate so each month's interest rounds to whole cents, with the final
 * payment adjusted so the balance clears exactly.
 * All displayed amounts are exact 2-decimal renderings of integer cents.
 */
import { formatCents } from "@/tools/_shared/money"
import { parseBoundedDecimal, type BoundedParseResult } from "@/tools/_shared/bounded-parse"

export const minimumPrincipal = 1
export const maximumPrincipal = 100_000_000
export const minimumAnnualRatePercent = 0
export const maximumAnnualRatePercent = 100
export const minimumTenureMonths = 1
export const maximumTenureMonths = 600

/** Parses the principal, clamped into 1 - 100,000,000 (2-decimal money). */
export function parsePrincipal(value: string): BoundedParseResult | null {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value.trim())) return null
  return parseBoundedDecimal(value, {
    minimum: minimumPrincipal,
    maximum: maximumPrincipal,
  })
}

/** Parses the annual rate percent, clamped into 0 - 100 (decimals accepted). */
export function parseAnnualRatePercent(value: string): BoundedParseResult | null {
  return parseBoundedDecimal(value, {
    minimum: minimumAnnualRatePercent,
    maximum: maximumAnnualRatePercent,
  })
}

/**
 * Parses the tenure in whole months. Integrality is validated on the raw
 * parsed value BEFORE clamping, so a fractional input ("12.5") always
 * rejects instead of silently rounding; in-range input clamps as usual.
 */
export function parseTenureMonths(value: string): number | null {
  const trimmed = value.trim()
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return null
  if (!Number.isInteger(Number(trimmed))) return null
  return (
    parseBoundedDecimal(trimmed, {
      minimum: minimumTenureMonths,
      maximum: maximumTenureMonths,
    })?.value ?? null
  )
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

/** r = a / 1_200_000_000 where a is the annual percent in millionths. */
const monthlyRateDenominator = 1_200_000_000n

function rateMillionths(annualRatePercent: number): bigint {
  return BigInt(Math.round(annualRatePercent * 1_000_000))
}

/**
 * The standard reducing-balance EMI: P x r x (1+r)^n / ((1+r)^n - 1) with
 * r = annual/12/100, rounded once to cents. The 0% branch is a distinct
 * straight-line formula (principal / months) because the reducing-balance
 * form is undefined there.
 *
 * The nonzero branch runs in exact integer arithmetic over the rate scaled
 * to millionths of a percent. That avoids two float classes the previous
 * formula had: an exact half-cent tie (100.50 at 12% for one month is
 * exactly 10150.5 cents, which double arithmetic lands below) and a tiny
 * nonzero rate collapsing `growth - 1` to zero and returning Infinity.
 */
export function quotedEmiCents(terms: LoanTerms): number | null {
  const { principalCents, annualRatePercent, tenureMonths } = terms
  if (!Number.isInteger(principalCents) || principalCents <= 0) return null
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0 || annualRatePercent > 100) {
    return null
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths <= 0) return null
  const rate = rateMillionths(annualRatePercent)
  if (rate === 0n) {
    return Math.ceil(principalCents / tenureMonths)
  }

  const months = BigInt(tenureMonths)
  const base = monthlyRateDenominator
  const growthBase = base + rate
  const growth = growthBase ** months
  const baseGrowth = base ** months
  // EMI cents = P * rate * growthBase^n / (base * (growthBase^n - base^n)).
  const numerator = BigInt(principalCents) * rate * growth
  const denominator = base * (growth - baseGrowth)
  // Positive half-up: floor((2N + D) / (2D)).
  return Number((2n * numerator + denominator) / (2n * denominator))
}

/** One month's interest on an integer-cent balance, half-up to cents. */
function monthlyInterestCents(balanceCents: number, rate: bigint): number {
  const numerator = BigInt(balanceCents) * rate
  return Number((2n * numerator + monthlyRateDenominator) / (2n * monthlyRateDenominator))
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

  const rate = rateMillionths(terms.annualRatePercent)
  let balanceCents = terms.principalCents
  const years: AmortizationYear[] = []
  let totalInterestCents = 0
  let yearPrincipalCents = 0
  let yearInterestCents = 0

  for (let month = 1; month <= terms.tenureMonths; month += 1) {
    // Interest uses the same exact rate as the quoted EMI, so the schedule
    // amortizes the quoted payment instead of a separately quantized rate.
    const interestCents = rate === 0n ? 0 : monthlyInterestCents(balanceCents, rate)
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
