import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { ResultReveal } from "@/components/motion/primitives"
import {
  applyScientificFunction,
  appendHistoryEntry,
  constantValue,
  evaluateExpression,
  type CalculatorHistoryEntry,
  type ScientificFunction,
} from "./calculator"

type CalculatorMode = "standard" | "scientific"

const scientificKeys: { label: string; fn: ScientificFunction; name: string }[] = [
  { label: "sin", fn: "sin", name: "Sine" },
  { label: "cos", fn: "cos", name: "Cosine" },
  { label: "tan", fn: "tan", name: "Tangent" },
  { label: "log", fn: "log", name: "Log base 10" },
  { label: "ln", fn: "ln", name: "Natural logarithm" },
  { label: "x²", fn: "pow2", name: "Square" },
  { label: "x³", fn: "pow3", name: "Cube" },
  { label: "√", fn: "sqrt", name: "Square root" },
  { label: "1/x", fn: "inv", name: "Reciprocal" },
  { label: "n!", fn: "fact", name: "Factorial" },
]

const constantKeys: { label: string; id: "pi" | "e"; name: string }[] = [
  { label: "π", id: "pi", name: "Pi" },
  { label: "e", id: "e", name: "Euler's number" },
]

const operatorNames = new Map([
  ["/", "Divide"],
  ["*", "Multiply"],
  ["-", "Subtract"],
  ["+", "Add"],
  ["%", "Remainder"],
])

export default function Calculator() {
  const [mode, setMode] = useState<CalculatorMode>("standard")
  const [display, setDisplay] = useState("0")
  const [expression, setExpression] = useState("")
  const [history, setHistory] = useState<readonly CalculatorHistoryEntry[]>([])
  const [newNumber, setNewNumber] = useState(true)
  const [calcId, setCalcId] = useState(0)
  const nextHistoryId = useRef(1)

  const appendDigit = useCallback(
    (digit: string) => {
      if (newNumber) {
        setDisplay(digit)
        setNewNumber(false)
        return
      }
      setDisplay((previous) => (previous === "0" ? digit : previous + digit))
    },
    [newNumber],
  )

  const appendDecimal = useCallback(() => {
    if (newNumber) {
      setDisplay("0.")
      setNewNumber(false)
      return
    }
    setDisplay((previous) => (previous.includes(".") ? previous : `${previous}.`))
  }, [newNumber])

  /**
   * Commits the displayed value into the pending expression. When nothing
   * new was typed since the last commit the display is already part of the
   * expression, so only the operator is appended.
   */
  const setOperator = useCallback(
    (operator: string) => {
      setExpression((previous) => {
        if (!newNumber) return `${previous}${display} ${operator} `
        if (previous === "") return `${display} ${operator} `
        return `${previous} ${operator} `
      })
      setNewNumber(true)
    },
    [display, newNumber],
  )

  const openParenthesis = useCallback(() => {
    setExpression((previous) => {
      if (!newNumber) return `${previous}${display} (`
      if (previous === "") return "("
      return `${previous} (`
    })
    setNewNumber(true)
  }, [display, newNumber])

  const closeParenthesis = useCallback(() => {
    setExpression((previous) => {
      if (!newNumber) return `${previous}${display})`
      if (previous.endsWith("(")) return `${previous})`
      return `${previous}${display})`
    })
    setNewNumber(true)
  }, [display, newNumber])

  const calculate = useCallback(() => {
    const fullExpression =
      expression === "" ? display : newNumber ? expression : `${expression}${display}`
    const result = evaluateExpression(fullExpression)
    setDisplay(result)
    setExpression("")
    setNewNumber(true)
    setCalcId((previous) => previous + 1)
    if (result !== "Error") {
      setHistory((previous) =>
        appendHistoryEntry(previous, nextHistoryId.current, fullExpression, result),
      )
      nextHistoryId.current += 1
    }
  }, [display, expression, newNumber])

  const clear = useCallback(() => {
    setDisplay("0")
    setExpression("")
    setNewNumber(true)
  }, [])

  const backspace = useCallback(() => {
    if (newNumber) return
    setDisplay((previous) => (previous.length > 1 ? previous.slice(0, -1) : "0"))
  }, [newNumber])

  const applyScientific = useCallback(
    (fn: ScientificFunction) => {
      const result = applyScientificFunction(fn, display)
      if (result === null) return
      setDisplay(result)
      setNewNumber(true)
    },
    [display],
  )

  const insertConstant = useCallback((id: "pi" | "e") => {
    setDisplay(constantValue(id))
    setNewNumber(true)
  }, [])

  const reuseHistoryResult = useCallback((result: string) => {
    setDisplay(result)
    setNewNumber(true)
  }, [])

  const keypad = "h-12 text-sm font-mono"

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <Button
          aria-pressed={mode === "standard"}
          onClick={() => setMode("standard")}
          variant={mode === "standard" ? "primary" : "secondary"}
        >
          Standard
        </Button>
        <Button
          aria-pressed={mode === "scientific"}
          onClick={() => setMode("scientific")}
          variant={mode === "scientific" ? "primary" : "secondary"}
        >
          Scientific
        </Button>
      </div>

      <ToolPanel title="Display">
        <p className="h-6 truncate text-right text-sm text-[var(--text-secondary)]">
          {expression || " "}
        </p>
        <ResultReveal token={calcId}>
          <p className="truncate text-right font-mono text-3xl font-bold text-[var(--text)]">
            {display}
          </p>
        </ResultReveal>
        <p className="sr-only" role="status">
          {expression === "" ? `Display ${display}` : `${expression}, display ${display}`}
        </p>
      </ToolPanel>

      {mode === "scientific" ? (
        <div className="grid grid-cols-5 gap-1.5">
          {scientificKeys.map((key) => (
            <Button
              aria-label={key.name}
              className={keypad}
              key={key.fn}
              onClick={() => applyScientific(key.fn)}
              variant="secondary"
            >
              {key.label}
            </Button>
          ))}
          {constantKeys.map((key) => (
            <Button
              aria-label={key.name}
              className={keypad}
              key={key.id}
              onClick={() => insertConstant(key.id)}
              variant="secondary"
            >
              {key.label}
            </Button>
          ))}
          <Button
            aria-label="Open parenthesis"
            className={keypad}
            onClick={openParenthesis}
            variant="secondary"
          >
            (
          </Button>
          <Button
            aria-label="Close parenthesis"
            className={keypad}
            onClick={closeParenthesis}
            variant="secondary"
          >
            )
          </Button>
          <Button
            aria-label="Negate"
            className={keypad}
            onClick={() => applyScientific("negate")}
            variant="secondary"
          >
            ±
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-1.5">
        <Button aria-label="Clear" className={keypad} onClick={clear} variant="secondary">
          C
        </Button>
        <Button aria-label="Backspace" className={keypad} onClick={backspace} variant="secondary">
          ←
        </Button>
        <Button
          aria-label={operatorNames.get("%")}
          className={keypad}
          onClick={() => setOperator("%")}
          variant="secondary"
        >
          %
        </Button>
        <Button
          aria-label={operatorNames.get("/")}
          className={keypad}
          onClick={() => setOperator("/")}
          variant="secondary"
        >
          /
        </Button>

        {["7", "8", "9"].map((digit) => (
          <Button
            className={keypad}
            key={digit}
            onClick={() => appendDigit(digit)}
            variant="secondary"
          >
            {digit}
          </Button>
        ))}
        <Button
          aria-label={operatorNames.get("*")}
          className={keypad}
          onClick={() => setOperator("*")}
          variant="secondary"
        >
          *
        </Button>

        {["4", "5", "6"].map((digit) => (
          <Button
            className={keypad}
            key={digit}
            onClick={() => appendDigit(digit)}
            variant="secondary"
          >
            {digit}
          </Button>
        ))}
        <Button
          aria-label={operatorNames.get("-")}
          className={keypad}
          onClick={() => setOperator("-")}
          variant="secondary"
        >
          -
        </Button>

        {["1", "2", "3"].map((digit) => (
          <Button
            className={keypad}
            key={digit}
            onClick={() => appendDigit(digit)}
            variant="secondary"
          >
            {digit}
          </Button>
        ))}
        <Button
          aria-label={operatorNames.get("+")}
          className={keypad}
          onClick={() => setOperator("+")}
          variant="secondary"
        >
          +
        </Button>

        <Button className={keypad} onClick={() => appendDigit("0")} variant="secondary">
          0
        </Button>
        <Button
          aria-label="Decimal point"
          className={keypad}
          onClick={appendDecimal}
          variant="secondary"
        >
          .
        </Button>
        <Button aria-label="Equals" className={keypad} onClick={calculate} variant="primary">
          =
        </Button>
      </div>

      {history.length > 0 ? (
        <ToolPanel
          action={
            <Button onClick={() => setHistory([])} variant="quiet">
              Clear history
            </Button>
          }
          title="History"
        >
          <ul className="grid max-h-40 gap-1 overflow-y-auto">
            {history.map((entry) => (
              <li key={entry.id}>
                <Button
                  aria-label={`Use result of ${entry.expression}`}
                  className="w-full justify-between font-mono text-sm"
                  onClick={() => reuseHistoryResult(entry.result)}
                  variant="quiet"
                >
                  <span className="truncate text-[var(--text-secondary)]">{entry.expression}</span>
                  <span className="shrink-0 text-[var(--text)]">= {entry.result}</span>
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            History is kept on this screen only and is not saved when the app closes.
          </p>
        </ToolPanel>
      ) : null}
    </div>
  )
}
