import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  filterMimeTypes,
  getMimeTab,
  maximumMimeQueryChars,
  mimeLookupTabs,
  type MimeLookupTab,
} from "./mime-lookup"

export default function MimeTypeLookup() {
  const [tab, setTab] = useState<MimeLookupTab>("ext-to-mime")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")

  const tabInfo = getMimeTab(tab)
  const overLimit = search.length > maximumMimeQueryChars
  const query = overLimit ? "" : search
  const filtered = filterMimeTypes(query, tab)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Direction">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Lookup direction</legend>
          <div className="flex flex-wrap gap-2">
            {mimeLookupTabs.map((id) => (
              <label
                className={`flex min-h-12 items-center rounded-2xl border px-4 py-2 ${
                  tab === id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={id}
              >
                <input
                  checked={tab === id}
                  className="sr-only"
                  name="mime-lookup-tab"
                  onChange={() => setTab(id)}
                  type="radio"
                  value={id}
                />
                <span className="text-sm font-medium">{getMimeTab(id).label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3">
          <Field
            error={
              overLimit
                ? `The query exceeds the ${maximumMimeQueryChars} character limit.`
                : undefined
            }
            hint="Matching updates as you type and copies give the value for the shown direction."
            htmlFor="mime-search"
            label={tabInfo.searchLabel}
          >
            <input
              className="app-input font-mono"
              id="mime-search"
              maxLength={maximumMimeQueryChars}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tabInfo.placeholder}
              type="search"
              value={search}
            />
          </Field>
        </div>
      </ToolPanel>

      <ToolPanel title={`Matches (${filtered.length})`}>
        {overLimit ? null : filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No MIME types match this search. Clear the query to see the full list.
          </p>
        ) : (
          <ul className="grid gap-2">
            {filtered.map((entry, index) => (
              <li
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
                key={`${entry.mimeType}-${entry.extension}-${index}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-sm text-[var(--text)]">
                    {entry.extension} → {entry.mimeType}
                  </p>
                  <p className="text-xs leading-5 text-[var(--text-secondary)]">
                    {entry.description}
                  </p>
                </div>
                <CopyButton
                  label={`Copy ${tabInfo.copyTarget(entry)}`}
                  onStatus={setStatus}
                  value={tabInfo.copyTarget(entry)}
                />
              </li>
            ))}
          </ul>
        )}
      </ToolPanel>

      <p className="text-sm text-[var(--text-secondary)]">
        The MIME list is bundled on this device and works offline. Servers and frameworks may map
        the same extension differently; verify against the system that serves your files.
      </p>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
