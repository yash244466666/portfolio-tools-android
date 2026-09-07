import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { jsonToYaml, maximumYamlLength, yamlToJson } from "./yaml-json"

type Direction = "yaml-to-json" | "json-to-yaml"

const limitLabel = maximumYamlLength.toLocaleString("en-US")

export default function YamlJsonConverter() {
  const [direction, setDirection] = useState<Direction>("yaml-to-json")
  const [input, setInput] = useState("")
  const [status, setStatus] = useState("")

  const overLimit = input.length > maximumYamlLength

  const result = useMemo(() => {
    if (input === "" || overLimit) return null
    return direction === "yaml-to-json" ? yamlToJson(input) : jsonToYaml(input)
  }, [input, overLimit, direction])

  const errorMessage = overLimit
    ? `Input is limited to ${limitLabel} characters.`
    : (result?.message ?? "")

  function reset() {
    setInput("")
    setDirection("yaml-to-json")
    setStatus("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Convert between YAML and JSON">
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Direction</legend>
          <label className="flex min-h-12 items-center gap-2 text-sm font-medium">
            <input
              checked={direction === "yaml-to-json"}
              name="yaml-json-direction"
              onChange={() => setDirection("yaml-to-json")}
              type="radio"
              value="yaml-to-json"
            />
            YAML to JSON
          </label>
          <label className="flex min-h-12 items-center gap-2 text-sm font-medium">
            <input
              checked={direction === "json-to-yaml"}
              name="yaml-json-direction"
              onChange={() => setDirection("json-to-yaml")}
              type="radio"
              value="json-to-yaml"
            />
            JSON to YAML
          </label>
        </fieldset>

        <div className="mt-3">
          <Field
            error={errorMessage === "" ? undefined : errorMessage}
            hint={`Limited to ${limitLabel} characters. YAML uses the safe schema only.`}
            htmlFor="yaml-json-input"
            label={direction === "yaml-to-json" ? "YAML text" : "JSON text"}
          >
            <textarea
              className="app-input min-h-40 font-mono"
              id="yaml-json-input"
              onChange={(event) => setInput(event.target.value)}
              placeholder={direction === "yaml-to-json" ? "name: Ada\nage: 36" : '{"name":"Ada"}'}
              spellCheck={false}
              value={input}
            />
          </Field>
        </div>
      </ToolPanel>

      {result !== null && errorMessage === "" ? (
        <ToolPanel
          title="Result"
          action={
            result.output === "" ? null : (
              <CopyButton
                label={direction === "yaml-to-json" ? "Copy JSON" : "Copy YAML"}
                onStatus={setStatus}
                value={result.output}
              />
            )
          }
        >
          <label className="sr-only" htmlFor="yaml-json-output">
            Conversion result
          </label>
          <textarea
            aria-readonly="true"
            className="app-input min-h-40 font-mono"
            id="yaml-json-output"
            readOnly
            value={result.output}
          />
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        YAML parsing uses js-yaml's safe schema, so executable or object-instantiating YAML types
        are rejected rather than evaluated. Input is length-bounded and converted output is capped
        to guard against alias expansion. Conversion happens on this device; nothing is saved or
        uploaded.
      </p>

      <div>
        <Button variant="quiet" onClick={reset}>
          Clear
        </Button>
      </div>
    </div>
  )
}
