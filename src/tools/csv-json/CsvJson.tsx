import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { csvDelimiters, csvToJson, jsonToCsv, maximumCsvLength, type CsvDelimiter } from "./csv"

type Direction = "csv-to-json" | "json-to-csv"

const limitLabel = maximumCsvLength.toLocaleString("en-US")

export default function CsvJson() {
  const [direction, setDirection] = useState<Direction>("csv-to-json")
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(",")
  const [hasHeader, setHasHeader] = useState(true)
  const [input, setInput] = useState("")
  const [status, setStatus] = useState("")

  const overLimit = input.length > maximumCsvLength

  const result = useMemo(() => {
    if (input === "" || overLimit) return null
    return direction === "csv-to-json"
      ? csvToJson(input, { delimiter, hasHeader })
      : jsonToCsv(input, { delimiter })
  }, [input, overLimit, direction, delimiter, hasHeader])

  const errorMessage = overLimit
    ? `Input is limited to ${limitLabel} characters.`
    : (result?.message ?? "")

  const notices: string[] = []
  if (result !== null && "unevenRowCount" in result && result.unevenRowCount > 0) {
    notices.push(
      `${result.unevenRowCount} row${result.unevenRowCount === 1 ? "" : "s"} had a different cell count than the header; extra cells are kept under generated column-N names.`,
    )
  }
  if (result !== null && "nestedCellCount" in result && result.nestedCellCount > 0) {
    notices.push(
      `${result.nestedCellCount} nested value${result.nestedCellCount === 1 ? " was" : "s were"} serialized as JSON text.`,
    )
  }
  if (result !== null && "neutralizedCellCount" in result && result.neutralizedCellCount > 0) {
    notices.push(
      `${result.neutralizedCellCount} cell${result.neutralizedCellCount === 1 ? "" : "s"} starting with =, +, -, @, or a tab were prefixed with a single quote so spreadsheet applications treat them as text, not formulas.`,
    )
  }

  const output =
    result === null
      ? ""
      : direction === "csv-to-json"
        ? JSON.stringify((result as { rows: unknown }).rows ?? [], null, 2)
        : (result as { csv: string }).csv

  function reset() {
    setInput("")
    setDirection("csv-to-json")
    setDelimiter(",")
    setHasHeader(true)
    setStatus("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Convert between CSV and JSON">
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Direction</legend>
          <label className="flex min-h-12 items-center gap-2 text-sm font-medium">
            <input
              checked={direction === "csv-to-json"}
              name="csv-json-direction"
              onChange={() => setDirection("csv-to-json")}
              type="radio"
              value="csv-to-json"
            />
            CSV to JSON
          </label>
          <label className="flex min-h-12 items-center gap-2 text-sm font-medium">
            <input
              checked={direction === "json-to-csv"}
              name="csv-json-direction"
              onChange={() => setDirection("json-to-csv")}
              type="radio"
              value="json-to-csv"
            />
            JSON to CSV
          </label>
        </fieldset>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <fieldset className="grid gap-2">
            <legend className="sr-only">Delimiter</legend>
            {csvDelimiters.map((option) => (
              <label
                className="flex min-h-12 items-center gap-2 text-sm font-medium"
                key={option.value}
              >
                <input
                  checked={delimiter === option.value}
                  name="csv-json-delimiter"
                  onChange={() => setDelimiter(option.value)}
                  type="radio"
                  value={option.value}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <label className="flex min-h-12 items-start gap-2 text-sm font-medium">
            <input
              aria-label="First row is a header"
              checked={hasHeader}
              className="mt-1 h-5 w-5 accent-[var(--primary)]"
              id="csv-json-header"
              onChange={(event) => setHasHeader(event.target.checked)}
              type="checkbox"
            />
            <span>
              First row is a header
              <span className="block text-xs font-normal text-[var(--text-secondary)]">
                CSV to JSON only. Unchecked rows keep generated column-N names.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-3">
          <Field
            error={errorMessage === "" ? undefined : errorMessage}
            hint={`Limited to ${limitLabel} characters. Quoted fields may span lines.`}
            htmlFor="csv-json-input"
            label={direction === "csv-to-json" ? "CSV text" : "JSON text"}
          >
            <textarea
              className="app-input min-h-40 font-mono"
              id="csv-json-input"
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                direction === "csv-to-json" ? "name,age\nAda,36" : '[{"name":"Ada","age":36}]'
              }
              spellCheck={false}
              value={input}
            />
          </Field>
        </div>
      </ToolPanel>

      {result !== null && errorMessage === "" ? (
        <ToolPanel title="Result">
          {notices.map((notice) => (
            <p className="mb-3 text-sm text-[var(--text-secondary)]" key={notice}>
              {notice}
            </p>
          ))}
          <label className="sr-only" htmlFor="csv-json-output">
            Conversion result
          </label>
          <textarea
            aria-readonly="true"
            className="app-input min-h-40 font-mono"
            id="csv-json-output"
            readOnly
            value={output}
          />
          <div className="mt-3">
            <CopyButton
              label={direction === "csv-to-json" ? "Copy JSON" : "Copy CSV"}
              onStatus={setStatus}
              value={output}
            />
          </div>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Conversion follows RFC 4180: quoted fields may contain delimiters, escaped quotes, and line
        breaks. When exporting to CSV, cells that begin with =, +, -, @, or a tab are prefixed with
        a single quote to prevent spreadsheet formula execution. Parsing happens on this device;
        nothing is saved or uploaded.
      </p>

      <div>
        <Button variant="quiet" onClick={reset}>
          Clear
        </Button>
      </div>
    </div>
  )
}
