import { describe, expect, it } from "vitest"
import {
  buildLoanSchedule,
  formatCentsMaybe,
  parseAnnualRatePercent,
  parsePrincipal,
  parseTenureMonths,
  quotedEmiCents,
} from "./loan-emi"

describe("parsing", () => {
  it("clamps the principal into 1-100,000,000 and reports the clamp", () => {
    expect(parsePrincipal("100000")).toEqual({ value: 100_000, clamped: false })
    expect(parsePrincipal("0")).toEqual({ value: 1, clamped: true })
    expect(parsePrincipal("999999999")).toEqual({
      value: 100_000_000,
      clamped: true,
    })
    expect(parsePrincipal("abc")).toBeNull()
    expect(parsePrincipal("1.999")).toBeNull()
  })

  it("clamps the annual rate into 0-100 and accepts decimals", () => {
    expect(parseAnnualRatePercent("12.5")).toEqual({ value: 12.5, clamped: false })
    expect(parseAnnualRatePercent("0")).toEqual({ value: 0, clamped: false })
    expect(parseAnnualRatePercent("150")).toEqual({ value: 100, clamped: true })
    expect(parseAnnualRatePercent("-1")).toEqual({ value: 0, clamped: true })
    expect(parseAnnualRatePercent("")).toBeNull()
  })

  it("clamps whole-month tenures into 1-600 and rejects fractions", () => {
    expect(parseTenureMonths("12")).toBe(12)
    // Sub-minimum whole values clamp to the floor; fractions always reject.
    expect(parseTenureMonths("0")).toBe(1)
    expect(parseTenureMonths("1000")).toBe(600)
    expect(parseTenureMonths("0.5")).toBeNull()
    expect(parseTenureMonths("12.5")).toBeNull()
  })
})

describe("quotedEmiCents", () => {
  it("matches the independent known vector 100,000 at 12% over 12 months", () => {
    // Standard reducing-balance value, cross-checked against a published
    // EMI table: 8,884.88.
    const emi = quotedEmiCents({
      principalCents: 10_000_000,
      annualRatePercent: 12,
      tenureMonths: 12,
    })
    expect(formatCentsMaybe(emi ?? 0)).toBe("8884.88")
  })

  it("uses a distinct straight-line branch at 0% interest", () => {
    expect(
      quotedEmiCents({ principalCents: 1_200_000, annualRatePercent: 0, tenureMonths: 12 }),
    ).toBe(100_000)
    // A principal that does not divide evenly still clears (final payment
    // adjustment) while the quoted EMI rounds up.
    expect(quotedEmiCents({ principalCents: 100, annualRatePercent: 0, tenureMonths: 3 })).toBe(34)
  })

  it("handles sub-percent rates", () => {
    const emi = quotedEmiCents({
      principalCents: 10_000_000,
      annualRatePercent: 0.29,
      tenureMonths: 12,
    })
    // Independent recomputation: 8346.429410 currency units -> 8346.43.
    expect(formatCentsMaybe(emi ?? 0)).toBe("8346.43")
  })

  it("rounds an exact half-cent tie up", () => {
    // 100.50 at 12% for one month is exactly 101.505 currency units, i.e.
    // 10150.5 cents; double arithmetic lands at 10150.49999999999.
    expect(quotedEmiCents({ principalCents: 10_050, annualRatePercent: 12, tenureMonths: 1 })).toBe(
      10_151,
    )
  })

  it("keeps an accepted tiny rate finite and its schedule clearable", () => {
    const emi = quotedEmiCents({
      principalCents: 1_000_000_000,
      annualRatePercent: 1e-13,
      tenureMonths: 12,
    })
    expect(Number.isFinite(emi ?? Number.NaN)).toBe(true)
    const schedule = buildLoanSchedule({
      principalCents: 1_000_000_000,
      annualRatePercent: 1e-13,
      tenureMonths: 12,
    })
    expect(schedule?.years.at(-1)?.balanceCents).toBe(0)
    expect(schedule?.totalPaymentCents).toBe(1_000_000_000)
  })
})

describe("buildLoanSchedule", () => {
  it("clears the balance exactly and sums principal to the loan amount", () => {
    const schedule = buildLoanSchedule({
      principalCents: 10_000_000,
      annualRatePercent: 12,
      tenureMonths: 12,
    })
    expect(schedule).not.toBeNull()
    if (!schedule) return
    const lastYear = schedule.years.at(-1)
    expect(lastYear?.balanceCents).toBe(0)
    const principalPaid = schedule.years.reduce((sum, year) => sum + year.principalPaidCents, 0)
    expect(principalPaid).toBe(10_000_000)
    expect(schedule.totalPaymentCents).toBe(10_000_000 + schedule.totalInterestCents)
    expect(schedule.years).toHaveLength(1)
  })

  it("uses the exact monthly rate for schedule interest", () => {
    // $300,000 at 10% for 60 months. The exact 10/12 monthly rate gives
    // $27,808.94 of interest in year one; quantizing 10/12 to six decimal
    // places of a percent used to lose three cents.
    const schedule = buildLoanSchedule({
      principalCents: 30_000_000,
      annualRatePercent: 10,
      tenureMonths: 60,
    })
    expect(schedule?.years[0]?.interestPaidCents).toBe(2_780_894)
  })

  it("produces one summary row per year for a multi-year loan", () => {
    const schedule = buildLoanSchedule({
      principalCents: 50_000_000,
      annualRatePercent: 8.5,
      tenureMonths: 60,
    })
    expect(schedule?.years).toHaveLength(5)
    const lastYear = schedule?.years.at(-1)
    expect(lastYear?.balanceCents).toBe(0)
    const principalPaid =
      schedule?.years.reduce((sum, year) => sum + year.principalPaidCents, 0) ?? 0
    expect(principalPaid).toBe(50_000_000)
  })

  it("returns null for invalid terms", () => {
    expect(
      buildLoanSchedule({ principalCents: 0, annualRatePercent: 10, tenureMonths: 12 }),
    ).toBeNull()
    expect(
      buildLoanSchedule({ principalCents: 1000, annualRatePercent: 150, tenureMonths: 12 }),
    ).toBeNull()
    expect(
      buildLoanSchedule({ principalCents: 1000, annualRatePercent: 10, tenureMonths: 0 }),
    ).toBeNull()
  })
})

describe("format helper", () => {
  it("renders exact cents", () => {
    expect(formatCentsMaybe(12345)).toBe("123.45")
    expect(formatCentsMaybe(5)).toBe("0.05")
  })
})
