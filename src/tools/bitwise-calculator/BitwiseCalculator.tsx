import { useMemo, useState } from "react"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  bitwiseDisplayBitsOptions,
  bitwiseOperations,
  computeBitwiseResult,
  getBitwiseOperation,
  parseBitwiseValue,
  toBinaryBits,
  toHex32,
  type BitwiseOperation,
} from "./bitwise"

const displayBitsLabels = new Map([
  [8, "8 bits"],
  [16, "16 bits"],
  [32, "32 bits"],
])

function BitRow({
  ariaHidden,
  label,
  value,
}: {
  ariaHidden?: boolean
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden={ariaHidden} className="w-8 text-xs text-[var(--text-secondary)]">
        {label}
      </span>
      <div aria-hidden={ariaHidden} className="flex flex-wrap gap-0.5">
        {value.split("").map((bit, index) => (
          <span
            className={`flex h-6 w-4 items-center justify-center rounded-sm font-mono text-xs ${
              bit === "1"
                ? "bg-[var(--primary)] text-[var(--on-primary)]"
                : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
            }`}
            key={`${label}-${index}`}
          >
            {bit}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function BitwiseCalculator() {
  const [operationId, setOperationId] = useState<BitwiseOperation>("AND")
  const [valueAText, setValueAText] = useState("255")
  const [valueBText, setValueBText] = useState("15")
  const [displayBits, setDisplayBits] = useState<number>(8)

  const operation = getBitwiseOperation(operationId)
  const parsedA = useMemo(() => parseBitwiseValue(valueAText), [valueAText])
  const parsedB = useMemo(
    () => (operation.unary ? 0 : parseBitwiseValue(valueBText)),
    [operation.unary, valueBText],
  )

  const result = useMemo(() => {
    if (parsedA === null) return null
    if (operation.unary) return computeBitwiseResult(operation.id, parsedA, 0)
    if (parsedB === null) return null
    return computeBitwiseResult(operation.id, parsedA, parsedB)
  }, [operation, parsedA, parsedB])

  return (
    <div className="grid gap-4">
      <ToolPanel title="Operation">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Bitwise operation</legend>
          <div className="flex flex-wrap gap-2">
            {bitwiseOperations.map((candidate) => (
              <label
                className={`flex min-h-12 items-center gap-1 rounded-2xl border px-3 font-mono text-sm ${
                  operationId === candidate.id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={candidate.id}
              >
                <input
                  checked={operationId === candidate.id}
                  className="sr-only"
                  name="bitwise-operation"
                  onChange={() => setOperationId(candidate.id)}
                  type="radio"
                  value={candidate.id}
                />
                <span>
                  {candidate.label}
                  {!candidate.unary ? (
                    <span className="ml-1 text-[var(--text-tertiary)]">({candidate.symbol})</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            Values are signed 32-bit integers. Right shift keeps the sign; results show the two's
            complement bit pattern.
          </p>
        </fieldset>
      </ToolPanel>

      <ToolPanel title="Values">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={
              parsedA === null ? "Enter an integer from -2147483648 to 2147483647." : undefined
            }
            htmlFor="bitwise-a"
            label="Value A"
          >
            <input
              className="app-input font-mono"
              id="bitwise-a"
              inputMode="numeric"
              onChange={(event) => setValueAText(event.target.value)}
              placeholder="255"
              value={valueAText}
            />
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Hex:{" "}
              <span className="font-mono text-[var(--text)]">
                {parsedA === null ? "—" : toHex32(parsedA)}
              </span>
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Bin:{" "}
              <span className="font-mono text-[var(--text)]">
                {parsedA === null ? "—" : toBinaryBits(parsedA, displayBits)}
              </span>
            </p>
          </Field>
          {!operation.unary ? (
            <Field
              error={
                parsedB === null ? "Enter an integer from -2147483648 to 2147483647." : undefined
              }
              htmlFor="bitwise-b"
              label="Value B"
            >
              <input
                className="app-input font-mono"
                id="bitwise-b"
                inputMode="numeric"
                onChange={(event) => setValueBText(event.target.value)}
                placeholder="15"
                value={valueBText}
              />
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Hex:{" "}
                <span className="font-mono text-[var(--text)]">
                  {parsedB === null ? "—" : toHex32(parsedB)}
                </span>
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Bin:{" "}
                <span className="font-mono text-[var(--text)]">
                  {parsedB === null ? "—" : toBinaryBits(parsedB, displayBits)}
                </span>
              </p>
            </Field>
          ) : null}
        </div>
      </ToolPanel>

      <ToolPanel title="Display bits">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Binary width</legend>
          <div className="flex gap-2">
            {bitwiseDisplayBitsOptions.map((bits) => (
              <label
                className={`flex min-h-12 items-center rounded-2xl border px-4 font-mono text-sm ${
                  displayBits === bits
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={bits}
              >
                <input
                  checked={displayBits === bits}
                  className="sr-only"
                  name="bitwise-display-bits"
                  onChange={() => setDisplayBits(bits)}
                  type="radio"
                  value={bits}
                />
                {displayBitsLabels.get(bits)}
              </label>
            ))}
          </div>
        </fieldset>
      </ToolPanel>

      <ToolPanel title="Result">
        {result === null ? (
          <p role="alert">Correct the highlighted value to compute a result.</p>
        ) : (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--text-secondary)]">Decimal</span>
              <span
                aria-label="Decimal result"
                className="font-mono text-xl font-bold text-[var(--text)]"
              >
                {result}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--text-secondary)]">Hexadecimal</span>
              <span
                aria-label="Hexadecimal result"
                className="break-all font-mono text-lg text-[var(--text)]"
              >
                {toHex32(result)}
              </span>
            </div>
            <div>
              <span className="text-sm text-[var(--text-secondary)]">Binary</span>
              <p
                aria-label="Binary result"
                className="break-all font-mono text-sm text-[var(--text)]"
              >
                {toBinaryBits(result, displayBits)}
              </p>
              <div aria-hidden="true" className="mt-1 flex flex-wrap gap-0.5">
                {toBinaryBits(result, displayBits)
                  .split("")
                  .map((bit, index) => (
                    <span
                      className={`flex h-6 w-4 items-center justify-center rounded-sm font-mono text-xs ${
                        bit === "1"
                          ? "bg-[var(--primary)] text-[var(--on-primary)]"
                          : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
                      }`}
                      key={index}
                    >
                      {bit}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </ToolPanel>

      {parsedA !== null && result !== null ? (
        <ToolPanel title="Visual comparison">
          <div aria-hidden="true" className="grid gap-2 font-mono text-xs">
            <BitRow label="A" value={toBinaryBits(parsedA, displayBits)} />
            <p className="text-center text-[var(--text-tertiary)]">{operation.symbol}</p>
            {!operation.unary && parsedB !== null ? (
              <BitRow label="B" value={toBinaryBits(parsedB, displayBits)} />
            ) : null}
            <div className="border-t border-[var(--border)] pt-2">
              <BitRow label="=" value={toBinaryBits(result, displayBits)} />
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            {`A ${toBinaryBits(parsedA, displayBits)} ${operation.label.toLowerCase()}${
              !operation.unary && parsedB !== null ? ` B ${toBinaryBits(parsedB, displayBits)}` : ""
            } equals ${toBinaryBits(result, displayBits)} in ${displayBits} bits.`}
          </p>
        </ToolPanel>
      ) : null}
    </div>
  )
}
