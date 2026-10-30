import { describe, expect, it } from "vitest"
import {
  applyScientificFunction,
  appendHistoryEntry,
  constantValue,
  evaluateExpression,
  formatCalculatorResult,
  maximumHistoryEntries,
  type CalculatorHistoryEntry,
} from "./calculator"

describe("evaluateExpression", () => {
  it("computes arithmetic with normal operator precedence", () => {
    expect(evaluateExpression("2+3*4")).toBe("14")
    expect(evaluateExpression("2*3+4")).toBe("10")
    expect(evaluateExpression("10-4/2")).toBe("8")
    expect(evaluateExpression("10%3")).toBe("1")
  })

  it("evaluates parentheses", () => {
    expect(evaluateExpression("(2+3)*4")).toBe("20")
    expect(evaluateExpression("2*(3+4)-1")).toBe("13")
    expect(evaluateExpression("((1+2))")).toBe("3")
  })

  it("multiplies implicitly before an opening parenthesis like the upstream engine", () => {
    expect(evaluateExpression("5 (3+4)")).toBe("35")
    expect(evaluateExpression("(2+3)(4)")).toBe("20")
    expect(evaluateExpression("5(3+4")).toBe("Error")
  })

  it("treats the exponent as right-associative and tighter than unary minus", () => {
    expect(evaluateExpression("2^3^2")).toBe("512")
    expect(evaluateExpression("-3^2")).toBe("-9")
    expect(evaluateExpression("2^-2")).toBe("0.25")
  })

  it("cleans binary floating point noise through the precision formatter", () => {
    expect(evaluateExpression("0.1+0.2")).toBe("0.3")
    expect(evaluateExpression("1/3")).toBe("0.333333333333")
  })

  it("accepts exponent notation produced by displayed results", () => {
    expect(evaluateExpression("1e-7 + 1")).toBe("1.0000001")
    expect(evaluateExpression("2e3 + 1")).toBe("2001")
    expect(evaluateExpression("1.5e+2*2")).toBe("300")
    expect(evaluateExpression("-1e-7")).toBe("-1e-7")
    expect(evaluateExpression("1e")).toBe("Error")
    expect(evaluateExpression("1e+")).toBe("Error")
  })

  it("returns 0 for empty input and Error for malformed input", () => {
    expect(evaluateExpression("")).toBe("0")
    expect(evaluateExpression("   ")).toBe("0")
    expect(evaluateExpression("5 +")).toBe("Error")
    expect(evaluateExpression("(2+3")).toBe("Error")
    expect(evaluateExpression("()")).toBe("Error")
    expect(evaluateExpression("abc")).toBe("Error")
    expect(evaluateExpression("*3")).toBe("Error")
  })

  it("reports Error for division by zero and overflow", () => {
    expect(evaluateExpression("1/0")).toBe("Error")
    expect(evaluateExpression("0/0")).toBe("Error")
    expect(evaluateExpression("9e999")).toBe("Error")
  })

  it("rejects input beyond the bounded length", () => {
    expect(evaluateExpression(`1+${"2".repeat(300)}`)).toBe("Error")
  })
})

describe("formatCalculatorResult", () => {
  it("prints integers directly and cleans non-integers", () => {
    expect(formatCalculatorResult(14)).toBe("14")
    expect(formatCalculatorResult(0.30000000000000004)).toBe("0.3")
    expect(formatCalculatorResult(-1 / 3)).toBe("-0.333333333333")
  })

  it("prints very large integers in the JS exponential form", () => {
    expect(formatCalculatorResult(1e21)).toBe("1e+21")
  })

  it("reports Error for non-finite results", () => {
    expect(formatCalculatorResult(Infinity)).toBe("Error")
    expect(formatCalculatorResult(NaN)).toBe("Error")
  })
})

describe("applyScientificFunction", () => {
  it("applies the trigonometric functions", () => {
    expect(applyScientificFunction("sin", "30")).toBe("-0.988031624093")
    expect(applyScientificFunction("cos", "0")).toBe("1")
    expect(applyScientificFunction("tan", "0")).toBe("0")
  })

  it("applies the logarithm, root, and power functions", () => {
    expect(applyScientificFunction("log", "100")).toBe("2")
    expect(applyScientificFunction("ln", "2.718281828459045")).toBe("1")
    expect(applyScientificFunction("sqrt", "9")).toBe("3")
    expect(applyScientificFunction("sqrt", "2")).toBe("1.41421356237")
    expect(applyScientificFunction("pow2", "4")).toBe("16")
    expect(applyScientificFunction("pow3", "3")).toBe("27")
  })

  it("applies reciprocal and negation with their zero rules", () => {
    expect(applyScientificFunction("inv", "4")).toBe("0.25")
    expect(applyScientificFunction("inv", "0")).toBe("Error")
    expect(applyScientificFunction("negate", "5")).toBe("-5")
  })

  it("applies factorial with the upstream domain guards", () => {
    expect(applyScientificFunction("fact", "5")).toBe("120")
    expect(applyScientificFunction("fact", "0")).toBe("1")
    expect(applyScientificFunction("fact", "170")).toBe("7.257415615307994e+306")
    expect(applyScientificFunction("fact", "171")).toBe("Error")
    expect(applyScientificFunction("fact", "-1")).toBe("Error")
    expect(applyScientificFunction("fact", "2.5")).toBe("Error")
  })

  it("leaves the display untouched when the value is not a number", () => {
    expect(applyScientificFunction("sin", "abc")).toBeNull()
    expect(applyScientificFunction("sin", "Error")).toBeNull()
    expect(applyScientificFunction("sin", "")).toBeNull()
  })
})

describe("constantValue", () => {
  it("inserts pi and e", () => {
    expect(constantValue("pi")).toBe(Math.PI.toString())
    expect(constantValue("e")).toBe(Math.E.toString())
  })
})

describe("appendHistoryEntry", () => {
  it("prepends the newest entry and keeps at most fifty", () => {
    let history: CalculatorHistoryEntry[] = []
    for (let index = 0; index < maximumHistoryEntries + 5; index++) {
      history = appendHistoryEntry(history, index, `1+${index}`, `${index + 1}`)
    }
    expect(history).toHaveLength(maximumHistoryEntries)
    expect(history[0]!.id).toBe(maximumHistoryEntries + 4)
    expect(history[0]!.result).toBe(String(maximumHistoryEntries + 5))
    expect(history[maximumHistoryEntries - 1]!.id).toBe(5)
  })
})
