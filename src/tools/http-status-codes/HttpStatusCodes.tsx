import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  filterStatusCodes,
  httpStatusCategories,
  maximumStatusQueryChars,
  type HttpStatusCategory,
} from "./http-status"

const categoryDescriptions: Record<Exclude<HttpStatusCategory, "all">, string> = {
  "1xx": "Informational — the request was received and processing continues.",
  "2xx": "Success — the request was successfully received, understood, and accepted.",
  "3xx": "Redirection — further action must be taken to complete the request.",
  "4xx": "Client error — the request contains bad syntax or cannot be fulfilled.",
  "5xx": "Server error — the server failed to fulfil an apparently valid request.",
}

export default function HttpStatusCodes() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<HttpStatusCategory>("all")
  const [status, setStatus] = useState("")

  const overLimit = search.length > maximumStatusQueryChars
  const filtered = filterStatusCodes(overLimit ? "" : search, category)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Search">
        <Field
          error={
            overLimit
              ? `The query exceeds the ${maximumStatusQueryChars} character limit.`
              : undefined
          }
          hint="Match by code (404), name (Not Found), or a word from the description."
          htmlFor="http-status-search"
          label="Search status codes"
        >
          <input
            className="app-input font-mono"
            id="http-status-search"
            maxLength={maximumStatusQueryChars}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="e.g. 404, redirect, timeout"
            type="search"
            value={search}
          />
        </Field>
        <fieldset className="mt-4 grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Status class</legend>
          <div className="flex flex-wrap gap-2">
            {httpStatusCategories.map((id) => (
              <label
                className={`flex min-h-12 items-center rounded-2xl border px-4 py-2 ${
                  category === id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={id}
              >
                <input
                  checked={category === id}
                  className="sr-only"
                  name="http-status-category"
                  onChange={() => setCategory(id)}
                  type="radio"
                  value={id}
                />
                <span className="text-sm font-medium">{id === "all" ? "All" : id}</span>
              </label>
            ))}
          </div>
          {category !== "all" ? (
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              {categoryDescriptions[category]}
            </p>
          ) : null}
        </fieldset>
      </ToolPanel>

      <ToolPanel title={`Codes (${filtered.length})`}>
        {overLimit ? null : filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No status codes match this search. Clear the query or pick another class.
          </p>
        ) : (
          <ul className="grid gap-2">
            {filtered.map((entry) => (
              <li
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
                key={entry.code}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-bold text-[var(--text)]">
                    {entry.code}
                  </span>
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
                    {entry.category}
                  </span>
                  <span className="font-medium text-[var(--text)]">{entry.name}</span>
                  <span className="ml-auto">
                    <CopyButton label="Copy code" onStatus={setStatus} value={String(entry.code)} />
                  </span>
                </div>
                <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
                  {entry.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ToolPanel>

      <p className="text-sm text-[var(--text-secondary)]">
        The status-code list is bundled on this device and works offline. Descriptions are plain
        summaries, not a substitute for the governing RFC text.
      </p>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
