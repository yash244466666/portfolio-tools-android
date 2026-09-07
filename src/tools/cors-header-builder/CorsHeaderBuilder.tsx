import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildCorsHeaders,
  defaultHeaders,
  defaultMethods,
  fullHeaderText,
  maximumCustomEntries,
  maximumMaxAgeSeconds,
  maximumOriginChars,
  parseMaxAge,
} from "./cors"

export default function CorsHeaderBuilder() {
  const [allowOrigin, setAllowOrigin] = useState("*")
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["GET", "POST", "OPTIONS"])
  const [customMethods, setCustomMethods] = useState("")
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([
    "Content-Type",
    "Authorization",
  ])
  const [customHeaders, setCustomHeaders] = useState("")
  const [maxAge, setMaxAge] = useState("86400")
  const [allowCredentials, setAllowCredentials] = useState(false)
  const [status, setStatus] = useState("")

  const originOverLimit = allowOrigin.length > maximumOriginChars
  const maxAgeValue = parseMaxAge(maxAge)

  const built = useMemo(
    () =>
      buildCorsHeaders({
        allowOrigin: originOverLimit ? "" : allowOrigin,
        selectedMethods,
        customMethods,
        selectedHeaders,
        customHeaders,
        maxAge: maxAgeValue === null ? "" : maxAge,
        allowCredentials,
      }),
    [
      allowOrigin,
      allowCredentials,
      customHeaders,
      customMethods,
      maxAge,
      maxAgeValue,
      originOverLimit,
      selectedHeaders,
      selectedMethods,
    ],
  )

  const customMethodCount = customMethods.split(",").filter((token) => token.trim()).length
  const customHeaderCount = customHeaders.split(",").filter((token) => token.trim()).length

  return (
    <div className="grid gap-4">
      <ToolPanel title="Origins">
        <Field
          error={
            originOverLimit
              ? `The origin exceeds the ${maximumOriginChars.toLocaleString("en-US")} character limit.`
              : undefined
          }
          hint="Use * for any origin, or list one explicit origin such as https://example.com."
          htmlFor="cors-origin"
          label="Access-Control-Allow-Origin"
        >
          <input
            aria-describedby={originOverLimit ? "cors-origin-error" : "cors-origin-hint"}
            className="app-input font-mono"
            id="cors-origin"
            onChange={(event) => setAllowOrigin(event.target.value)}
            placeholder="* or https://example.com"
            value={allowOrigin}
          />
        </Field>
      </ToolPanel>

      <ToolPanel title="Methods">
        <div className="flex flex-wrap gap-2">
          {defaultMethods.map((method) => (
            <label
              className={`flex min-h-12 cursor-pointer items-center rounded-2xl border px-3 font-mono text-sm ${
                selectedMethods.includes(method)
                  ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                  : "border-[var(--border)]"
              }`}
              key={method}
            >
              <input
                aria-label={`Allow ${method}`}
                checked={selectedMethods.includes(method)}
                className="sr-only"
                onChange={(event) =>
                  setSelectedMethods((previous) =>
                    event.target.checked
                      ? [...previous, method]
                      : previous.filter((candidate) => candidate !== method),
                  )
                }
                type="checkbox"
              />
              <span aria-hidden="true">{method}</span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Field
            error={
              customMethodCount > maximumCustomEntries
                ? `Use at most ${maximumCustomEntries} custom methods.`
                : undefined
            }
            htmlFor="cors-custom-methods"
            label="Custom methods"
            hint="Comma separated, added after the selected methods."
          >
            <input
              className="app-input font-mono"
              id="cors-custom-methods"
              onChange={(event) => setCustomMethods(event.target.value)}
              placeholder="e.g. TRACE, CUSTOM"
              value={customMethods}
            />
          </Field>
        </div>
      </ToolPanel>

      <ToolPanel title="Headers">
        <div className="flex flex-wrap gap-2">
          {defaultHeaders.map((header) => (
            <label
              className={`flex min-h-12 cursor-pointer items-center rounded-2xl border px-3 font-mono text-sm ${
                selectedHeaders.includes(header)
                  ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                  : "border-[var(--border)]"
              }`}
              key={header}
            >
              <input
                aria-label={`Allow ${header}`}
                checked={selectedHeaders.includes(header)}
                className="sr-only"
                onChange={(event) =>
                  setSelectedHeaders((previous) =>
                    event.target.checked
                      ? [...previous, header]
                      : previous.filter((candidate) => candidate !== header),
                  )
                }
                type="checkbox"
              />
              <span aria-hidden="true">{header}</span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Field
            error={
              customHeaderCount > maximumCustomEntries
                ? `Use at most ${maximumCustomEntries} custom headers.`
                : undefined
            }
            htmlFor="cors-custom-headers"
            label="Custom headers"
            hint="Comma separated, added after the selected headers."
          >
            <input
              className="app-input font-mono"
              id="cors-custom-headers"
              onChange={(event) => setCustomHeaders(event.target.value)}
              placeholder="e.g. X-Custom-Header"
              value={customHeaders}
            />
          </Field>
        </div>
      </ToolPanel>

      <ToolPanel title="Preflight">
        <div className="grid gap-3">
          <Field
            error={
              maxAge.trim() !== "" && maxAgeValue === null
                ? `Enter a whole number of seconds between 0 and ${maximumMaxAgeSeconds.toLocaleString("en-US")}, or leave the field empty to omit the header.`
                : undefined
            }
            htmlFor="cors-max-age"
            label="Max age (seconds)"
            hint="How long a browser may cache the preflight response. Empty omits the header."
          >
            <input
              aria-describedby={
                maxAgeValue === null && maxAge.trim() !== "" ? "cors-max-age-error" : undefined
              }
              className="app-input font-mono"
              id="cors-max-age"
              inputMode="numeric"
              onChange={(event) => setMaxAge(event.target.value)}
              value={maxAge}
            />
          </Field>
          <label className="flex min-h-12 items-center gap-3">
            <input
              checked={allowCredentials}
              className="h-5 w-5 accent-[var(--primary)]"
              onChange={(event) => setAllowCredentials(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium">Access-Control-Allow-Credentials: true</span>
          </label>
          {built.warnings.map((warning) => (
            <p className="text-sm text-[var(--danger-text)]" key={warning} role="alert">
              {warning}
            </p>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          <CopyButton label="Copy" onStatus={setStatus} value={fullHeaderText(built.headers)} />
        }
        title="Generated headers"
      >
        <dl className="grid gap-2">
          {built.headers.map((header) => (
            <div className="font-mono text-sm" key={header.key}>
              <dt className="inline text-[var(--primary)]">{header.key}</dt>
              <span className="text-[var(--text-secondary)]">: </span>
              <dd className="inline break-all">{header.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          These headers belong on the server response, not in the client request. Copy them into the
          API or reverse proxy that serves the cross-origin endpoint.
        </p>
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
