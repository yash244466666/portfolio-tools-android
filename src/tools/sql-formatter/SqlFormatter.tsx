import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { formatSqlStatement, minifySqlStatement, maximumSqlLength, sqlDialects } from "./sql"

const limitLabel = maximumSqlLength.toLocaleString("en-US")

const dialectLabels: Record<(typeof sqlDialects)[number], string> = {
  sql: "SQL",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
}

export default function SqlFormatter() {
  const [input, setInput] = useState("")
  const [dialect, setDialect] = useState<(typeof sqlDialects)[number]>("sql")
  const [output, setOutput] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState("")

  function run(action: "format" | "minify") {
    const result =
      action === "format" ? formatSqlStatement(input, dialect) : minifySqlStatement(input, dialect)
    setOutput(result.output)
    setMessage(result.message)
  }

  function reset() {
    setInput("")
    setOutput("")
    setMessage("")
    setStatus("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Paste SQL">
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="sr-only">Dialect</legend>
          {sqlDialects.map((candidate) => (
            <label key={candidate} className="flex min-h-12 items-center gap-2 text-sm font-medium">
              <input
                checked={dialect === candidate}
                name="sql-formatter-dialect"
                onChange={() => setDialect(candidate)}
                type="radio"
                value={candidate}
              />
              {dialectLabels[candidate]}
            </label>
          ))}
        </fieldset>

        <div className="mt-3">
          <Field
            error={message === "" ? undefined : message}
            hint={`Up to ${limitLabel} characters. The dialect decides quoting and keyword handling.`}
            htmlFor="sql-formatter-input"
            label="SQL input"
          >
            <textarea
              className="app-input min-h-48 font-mono"
              id="sql-formatter-input"
              onChange={(event) => setInput(event.target.value)}
              placeholder="select id, name from users where active = 1"
              spellCheck={false}
              value={input}
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => run("format")}>Format</Button>
          <Button onClick={() => run("minify")} variant="secondary">
            Minify
          </Button>
          <Button onClick={reset} variant="quiet">
            Clear
          </Button>
        </div>
      </ToolPanel>

      {output !== "" ? (
        <ToolPanel
          title="Result"
          action={<CopyButton label="Copy result" onStatus={setStatus} value={output} />}
        >
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
            {output}
          </pre>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Formatting rewrites whitespace only; keywords keep the case you typed, and the formatter
        does not validate that a statement would execute. Minify joins the formatted lines onto one
        line, so a string literal that itself spans lines is joined at its breaks. Parsing happens
        on this device; nothing is saved or uploaded.
      </p>
    </div>
  )
}
