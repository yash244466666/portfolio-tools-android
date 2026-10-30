/**
 * Scientific calculator engine.
 *
 * Divergence from upstream: the portfolio tool evaluated expressions with
 * the Math.js bundle, which the implementation plan flags as a bundle-size
 * risk, and its "ln(→log(→log10(" preprocessing chain was contradictory
 * (an inserted `ln(` was immediately rewritten to `log10(`). The keypad
 * never inserts function names — sin, cos, tan, log, ln, sqrt, powers,
 * reciprocal, factorial, and negation are applied directly to the displayed
 * value — so the text path only ever needs arithmetic. A small bounded
 * recursive-descent parser replaces Math.js here: `+ - * / %` with normal
 * precedence, right-associative `^`, unary sign, parentheses, and the
 * implicit multiplication `5 (3+4)` that Math.js accepted, with no dynamic
 * evaluation.
 *
 * The upstream `( )` keypad buttons did nothing (their `fn` had no case in
 * the scientific switch), so they are implemented here as real parenthesis
 * insertion.
 *
 * Formatting and unary-function semantics are upstream parity: integer
 * results print directly, other results print `toPrecision(12)` cleaned
 * through parseFloat, and factorial accepts non-negative integers up to 170
 * (the largest value whose product stays finite in double precision).
 */

/** The evaluator rejects longer input before parsing. */
export const maximumExpressionChars = 200

const resultError = "Error"

/**
 * Formats like the upstream engine: integers print directly, other finite
 * values pass through `parseFloat(toPrecision(12))`, which also cleans
 * binary floating point noise (0.1 + 0.2 → 0.3). Non-finite values are the
 * "Error" sentinel the display shows.
 */
export function formatCalculatorResult(value: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return resultError
  if (Number.isInteger(value)) return value.toString()
  return Number.parseFloat(value.toPrecision(12)).toString()
}

interface Token {
  kind: "number" | "operator" | "lparen" | "rparen"
  text: string
}

const operatorPattern = /^[+\-*/%^]$/
/**
 * Decimal numbers may use exponent notation. A displayed result can be
 * `1e-7` or `1e+21` (formatCalculatorResult uses the engine's shortest
 * representation), and that result is committed back into the expression
 * text when the user continues with an operator; rejecting the exponent made
 * a perfectly valid displayed value evaluate to Error.
 */
const numberPattern = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/

function tokenize(source: string): Token[] | null {
  const tokens: Token[] = []
  let index = 0
  while (index < source.length) {
    const character = source[index]!
    if (character === " " || character === "\t") {
      index++
      continue
    }
    if (character === "(") {
      tokens.push({ kind: "lparen", text: character })
      index++
      continue
    }
    if (character === ")") {
      tokens.push({ kind: "rparen", text: character })
      index++
      continue
    }
    if (operatorPattern.test(character)) {
      tokens.push({ kind: "operator", text: character })
      index++
      continue
    }
    const numberMatch = numberPattern.exec(source.slice(index))
    if (numberMatch) {
      tokens.push({ kind: "number", text: numberMatch[0] })
      index += numberMatch[0].length
      continue
    }
    return null
  }
  return tokens
}

/**
 * Parses and evaluates a decimal arithmetic expression, or returns the
 * "Error" sentinel when the text is empty, malformed, too long, or the
 * result is not finite (division by zero and overflow both land here,
 * matching the upstream behavior).
 */
export function evaluateExpression(expression: string): string {
  const trimmed = expression.trim()
  if (trimmed === "") return "0"
  if (trimmed.length > maximumExpressionChars) return resultError
  const tokens = tokenize(trimmed)
  if (!tokens || tokens.length === 0) return resultError

  let position = 0

  const peek = (): Token | undefined => tokens[position]

  const parseExpression = (): number | null => {
    let left = parseTerm()
    if (left === null) return null
    for (;;) {
      const token = peek()
      if (token?.kind === "operator" && (token.text === "+" || token.text === "-")) {
        position++
        const right = parseTerm()
        if (right === null) return null
        left = token.text === "+" ? left + right : left - right
        continue
      }
      return left
    }
  }

  const parseTerm = (): number | null => {
    let left = parseUnary()
    if (left === null) return null
    for (;;) {
      const token = peek()
      if (
        token?.kind === "operator" &&
        (token.text === "*" || token.text === "/" || token.text === "%")
      ) {
        position++
        const right = parseUnary()
        if (right === null) return null
        if (token.text === "*") {
          left = left * right
        } else if (token.text === "/") {
          left = left / right
        } else {
          left = left % right
        }
        continue
      }
      // Implicit multiplication: a value directly followed by "(" multiplies,
      // matching the upstream Math.js engine.
      if (token?.kind === "lparen") {
        const right = parseUnary()
        if (right === null) return null
        left = left * right
        continue
      }
      return left
    }
  }

  // `-3^2` is -(3^2): the exponent binds tighter than unary sign, matching
  // the Math.js behavior of the upstream engine.
  const parseUnary = (): number | null => {
    const token = peek()
    if (token?.kind === "operator" && (token.text === "-" || token.text === "+")) {
      position++
      const operand = parseUnary()
      if (operand === null) return null
      return token.text === "-" ? -operand : operand
    }
    return parsePower()
  }

  const parsePower = (): number | null => {
    const base = parsePrimary()
    if (base === null) return null
    const token = peek()
    if (token?.kind === "operator" && token.text === "^") {
      position++
      const exponent = parseUnary()
      if (exponent === null) return null
      const result = base ** exponent
      return result
    }
    return base
  }

  const parsePrimary = (): number | null => {
    const token = peek()
    if (!token) return null
    if (token.kind === "number") {
      position++
      return Number(token.text)
    }
    if (token.kind === "lparen") {
      position++
      const value = parseExpression()
      if (value === null) return null
      if (peek()?.kind !== "rparen") return null
      position++
      return value
    }
    return null
  }

  const value = parseExpression()
  if (value === null || position !== tokens.length) return resultError
  return formatCalculatorResult(value)
}

export type ScientificFunction =
  "sin" | "cos" | "tan" | "log" | "ln" | "sqrt" | "pow2" | "pow3" | "inv" | "fact" | "negate"

const scientificFunctionIds = new Set<ScientificFunction>([
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "sqrt",
  "pow2",
  "pow3",
  "inv",
  "fact",
  "negate",
])

export function isScientificFunction(id: string): id is ScientificFunction {
  return scientificFunctionIds.has(id as ScientificFunction)
}

/**
 * Applies a scientific single-operand function to the displayed value, with
 * the upstream domain guards: factorial requires a non-negative integer no
 * larger than 170, reciprocal is undefined at zero, and any non-finite
 * outcome becomes the "Error" sentinel. Returns null when the displayed text
 * is not a number, matching the upstream no-op.
 */
export function applyScientificFunction(fn: ScientificFunction, display: string): string | null {
  const value = Number.parseFloat(display)
  if (Number.isNaN(value)) return null

  let result: number
  switch (fn) {
    case "sin":
      result = Math.sin(value)
      break
    case "cos":
      result = Math.cos(value)
      break
    case "tan":
      result = Math.tan(value)
      break
    case "log":
      result = Math.log10(value)
      break
    case "ln":
      result = Math.log(value)
      break
    case "sqrt":
      result = Math.sqrt(value)
      break
    case "pow2":
      result = Math.pow(value, 2)
      break
    case "pow3":
      result = Math.pow(value, 3)
      break
    case "inv":
      result = value !== 0 ? 1 / value : NaN
      break
    case "negate":
      result = -value
      break
    case "fact": {
      if (value < 0 || !Number.isInteger(value) || value > 170) {
        result = NaN
        break
      }
      result = 1
      for (let index = 2; index <= value; index++) result *= index
      break
    }
  }

  if (!Number.isFinite(result)) return resultError
  return formatCalculatorResult(result)
}

/** π and e are the two constants the upstream keypad inserts. */
export function constantValue(id: "pi" | "e"): string {
  return id === "pi" ? Math.PI.toString() : Math.E.toString()
}

export interface CalculatorHistoryEntry {
  id: number
  expression: string
  result: string
}

/** Upstream keeps the fifty most recent evaluations, newest first. */
export const maximumHistoryEntries = 50

export function appendHistoryEntry(
  history: readonly CalculatorHistoryEntry[],
  nextId: number,
  expression: string,
  result: string,
): CalculatorHistoryEntry[] {
  const entry: CalculatorHistoryEntry = { id: nextId, expression, result }
  return [entry, ...history].slice(0, maximumHistoryEntries)
}
